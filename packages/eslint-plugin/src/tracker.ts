import { Rule, Scope } from "eslint";
import {
  ArrowFunctionExpression,
  BlockStatement,
  CallExpression,
  CatchClause,
  ClassDeclaration,
  ClassExpression,
  Directive,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  ModuleDeclaration,
  NewExpression,
  Node,
  Pattern,
  Program,
  Statement,
  StaticBlock,
  VariableDeclaration,
  VariableDeclarator,
} from "estree";
import {
  JSXElement,
  JSXFragment,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  Node as NodeWithJSX,
} from "estree-jsx";
import { getKeys } from "eslint-visitor-keys";
import { getImportName, getStaticKey, getStaticMemKey } from "./util";

export class Tracker {
  watchingImports: Record<string, string[]> = {};
  resources: Record<string, ResourceHooks> = {};
  visited: Set<Node> = new Set<Node>();
  hasJSX = false;
  jsxBindings?: Map<Scope.Variable, JSXIdentifier[]>;

  watchImport(source: string, watchAs: string = `import("${source}")`) {
    if (Object.prototype.hasOwnProperty.call(this.watchingImports, source)) {
      this.watchingImports[source]!.push(watchAs);
    } else {
      this.watchingImports[source] = [watchAs];
    }
    this.getResourceHooks(watchAs);
  }
  watchMember(
    resName: string,
    memberName: string,
    watchAs: string = `${resName}.${memberName}`
  ) {
    const res = this.getResourceHooks(resName);
    if (Object.prototype.hasOwnProperty.call(res.members, memberName)) {
      res.members[memberName]!.push(watchAs);
    } else {
      res.members[memberName] = [watchAs];
    }
  }
  watchCall(
    resName: string,
    captures: CaptureSpec[] = [],
    watchAs: string = `${resName}()`
  ) {
    const resHooks = this.getResourceHooks(resName);
    resHooks.calls.push({ resName: watchAs, captures });
  }
  watchConstruct(
    resName: string,
    captures: CaptureSpec[] = [],
    watchAs: string = `new ${resName}()`
  ) {
    const resHooks = this.getResourceHooks(resName);
    resHooks.constructs.push({ resName: watchAs, captures });
  }
  watchJSXElement(
    resName: string,
    captures: CaptureSpec[] = [],
    watchAs: string = `<${resName} />`
  ) {
    const resHooks = this.getResourceHooks(resName);
    resHooks.jsxElements.push({ resName: watchAs, captures });
    this.hasJSX = true;
  }
  private getResourceHooks(resName: string): ResourceHooks {
    if (Object.prototype.hasOwnProperty.call(this.resources, resName)) {
      return this.resources[resName]!;
    } else {
      return (this.resources[resName] = {
        members: {},
        calls: [],
        constructs: [],
        jsxElements: [],
        listeners: [],
      });
    }
  }

  listen(
    resName: string,
    listener: (
      node: NodeWithJSX & Rule.NodeParentExtension,
      captured: CaptureMap
    ) => void
  ) {
    this.getResourceHooks(resName).listeners.push(listener);
  }
  private fire(res: Resource, node: NodeWithJSX) {
    for (const resName of res.resNames) {
      for (const listener of this.getResourceHooks(resName).listeners) {
        listener(node as NodeWithJSX & Rule.NodeParentExtension, res.captured);
      }
    }
  }

  trackImport(context: Rule.RuleContext, node: ImportDeclaration) {
    if (typeof node.source.value !== "string") return;
    if (
      !Object.prototype.hasOwnProperty.call(
        this.watchingImports,
        node.source.value
      )
    )
      return;
    const resNames = this.watchingImports[node.source.value]!;
    const res: Resource = { resNames, captured: {} };
    for (const spec of node.specifiers) {
      if (
        spec.type === "ImportSpecifier" ||
        spec.type === "ImportDefaultSpecifier"
      ) {
        const subRes = this.memberResource(res, getImportName(spec));
        if (subRes) {
          this.trackVariable(context, spec, spec.local.name, subRes);
        }
      } else {
        this.trackVariable(context, spec, spec.local.name, res);
      }
    }
  }
  private trackVariable(
    context: Rule.RuleContext,
    node: Node,
    varName: string,
    res: Resource
  ) {
    const varDecl = context
      .getDeclaredVariables(node)
      .find((v) => v.name === varName);
    if (!varDecl) return;
    for (const varRef of varDecl.references) {
      if (this.visited.has(varRef.identifier)) continue;
      this.visited.add(varRef.identifier);
      if (isPattern(varRef.identifier as Identifier & Rule.NodeParentExtension))
        continue;
      this.trackExpression(
        context,
        varRef.identifier as Identifier & Rule.NodeParentExtension,
        res
      );
    }
    if (this.hasJSX) {
      if (!this.jsxBindings) {
        this.jsxBindings = collectReactJSXVars(
          context,
          context.getSourceCode().ast
        );
      }
      const refs = this.jsxBindings.get(varDecl) ?? [];
      for (const varRef of refs) {
        this.trackExpression(
          context,
          varRef as JSXIdentifier & Rule.NodeParentExtension,
          res
        );
      }
    }
  }
  private trackExpression(
    context: Rule.RuleContext,
    expr: (Expression | JSXElement | JSXIdentifier) & Rule.NodeParentExtension,
    res: Resource
  ) {
    this.fire(res, expr);
    if (!expr.parent) return;
    const parent = expr.parent as NodeWithJSX & Rule.NodeParentExtension;
    switch (parent.type) {
      case "VariableDeclarator":
        if (parent.init === expr) {
          this.trackPattern(context, parent, parent.id, res);
        }
        break;
      case "MemberExpression":
        if (parent.object === expr) {
          const key = getStaticMemKey(parent);
          if (key !== null) {
            const subRes = this.memberResource(res, key);
            if (subRes) {
              this.trackExpression(context, parent, subRes);
            }
          }
        }
        break;
      case "CallExpression":
      case "NewExpression":
        if (parent.callee === expr) {
          for (const resName of res.resNames) {
            const resHooks = this.getResourceHooks(resName);
            const callCaptureSpecs =
              parent.type === "NewExpression"
                ? resHooks.constructs
                : resHooks.calls;
            for (const { resName: subResName, captures } of callCaptureSpecs) {
              const newCaptured = {
                ...res.captured,
                ...captureArguments(parent, captures),
              };
              this.trackExpression(context, parent, {
                resNames: [subResName],
                captured: newCaptured,
              });
            }
          }
        }
        break;
      case "JSXOpeningElement":
        if (parent.name === expr) {
          const elem = parent.parent as NodeWithJSX &
            Rule.NodeParentExtension as JSXElement & Rule.NodeParentExtension;
          for (const resName of res.resNames) {
            const resHooks = this.getResourceHooks(resName);
            for (const {
              resName: subResName,
              captures,
            } of resHooks.jsxElements) {
              const newCaptured = {
                ...res.captured,
                ...captureProps(elem, captures),
              };
              this.trackExpression(context, elem, {
                resNames: [subResName],
                captured: newCaptured,
              });
            }
          }
        }
        break;
    }
  }
  private trackPattern(
    context: Rule.RuleContext,
    decl: VariableDeclarator,
    pat: Pattern,
    res: Resource
  ) {
    switch (pat.type) {
      case "Identifier":
        this.trackVariable(context, decl, pat.name, res);
        break;
      case "ArrayPattern": {
        let i = 0;
        for (const elem of pat.elements) {
          if (elem === null) {
            i++;
            continue;
          }
          if (elem.type === "RestElement") break;
          const subRes = this.memberResource(res, `${i}`);
          if (subRes) {
            this.trackPattern(context, decl, elem, subRes);
          }
          i++;
        }
        break;
      }
      case "ObjectPattern":
        for (const prop of pat.properties) {
          if (prop.type === "RestElement") {
            this.trackPattern(context, decl, prop.argument, res);
          } else {
            const key = getStaticKey(prop);
            if (key !== null) {
              const subRes = this.memberResource(res, key);
              if (subRes) {
                this.trackPattern(context, decl, prop.value, subRes);
              }
            }
          }
        }
        break;
      case "AssignmentPattern":
        this.trackPattern(context, decl, pat.left, res);
        break;
    }
  }

  private memberResource(res: Resource, memberName: string): Resource | null {
    const subResNames: string[] = [];
    for (const resName of res.resNames) {
      const resHooks = this.getResourceHooks(resName);
      if (Object.prototype.hasOwnProperty.call(resHooks.members, memberName)) {
        subResNames.push(...resHooks.members[memberName]!);
      }
    }
    if (subResNames.length > 0) {
      return { resNames: subResNames, captured: res.captured };
    } else {
      return null;
    }
  }
}

export type CaptureSpec = {
  path: string[];
  captureAs: string;
};

type CallCaptureSpec = {
  resName: string;
  captures: CaptureSpec[];
};

type ResourceHooks = {
  members: Record<string, string[]>;
  calls: CallCaptureSpec[];
  constructs: CallCaptureSpec[];
  jsxElements: CallCaptureSpec[];
  listeners: ((
    node: NodeWithJSX & Rule.NodeParentExtension,
    captured: CaptureMap
  ) => void)[];
};

type Resource = {
  resNames: string[];
  captured: CaptureMap;
};

type CaptureMap = Record<string, GeneralizedNode>;
type GeneralizedNode =
  | Node
  | JSXElement
  | JSXFragment
  | ArgumentsOf
  | PropsOf
  | CaptureFailure;

type CaptureFailure = {
  type: "CaptureFailure";
  node: GeneralizedNode;
  memberName: string;
};

type ArgumentsOf = {
  type: "ArgumentsOf";
  node: CallExpression | NewExpression;
};

type PropsOf = {
  type: "PropsOf";
  node: JSXElement;
};

export function capturedRoot(node: GeneralizedNode): Node {
  if (
    node.type === "CaptureFailure" ||
    node.type === "ArgumentsOf" ||
    node.type === "PropsOf"
  ) {
    return capturedRoot(node.node);
  } else {
    return node as Node;
  }
}

function captureArguments(
  expr: CallExpression | NewExpression,
  captures: CaptureSpec[]
): CaptureMap {
  const captured: CaptureMap = {};
  for (const { captureAs, path } of captures) {
    let current: GeneralizedNode = { type: "ArgumentsOf", node: expr };
    for (const segment of path) {
      current = iterateCapture(current, segment);
    }
    captured[captureAs] = current;
  }
  return captured;
}

function captureProps(elem: JSXElement, captures: CaptureSpec[]): CaptureMap {
  const captured: CaptureMap = {};
  for (const { captureAs, path } of captures) {
    let current: GeneralizedNode = { type: "PropsOf", node: elem };
    for (const segment of path) {
      current = iterateCapture(current, segment);
    }
    captured[captureAs] = current;
  }
  return captured;
}

function iterateCapture(
  current: GeneralizedNode,
  segment: string
): GeneralizedNode {
  if (current.type === "CaptureFailure") {
    return { type: "CaptureFailure", node: current, memberName: segment };
  } else if (current.type === "ArgumentsOf") {
    let i = 0;
    for (const arg of current.node.arguments) {
      if (arg.type === "SpreadElement") break;
      if (`${i}` === segment) {
        return arg;
      }
      i++;
    }
  } else if (current.type === "ArrayExpression") {
    let i = 0;
    for (const arg of current.elements) {
      if (arg !== null && arg.type === "SpreadElement") break;
      if (`${i}` === segment && arg !== null) {
        return arg;
      }
      i++;
    }
  } else if (current.type === "ObjectExpression") {
    for (const prop of current.properties) {
      if (prop.type === "SpreadElement") continue;
      const key = getStaticKey(prop);
      if (key !== null && key === segment) {
        return prop.value;
      }
    }
  } else if (current.type === "PropsOf") {
    for (const attr of current.node.openingElement.attributes) {
      if (attr.type !== "JSXAttribute") continue;
      if (attr.name.type !== "JSXIdentifier") continue;
      if (attr.name.name === segment) {
        if (
          attr.value !== null &&
          attr.value.type === "JSXExpressionContainer"
        ) {
          return attr.value.expression as Expression;
        } else if (attr.value !== null) {
          return attr.value;
        }
      }
    }
  }
  return { type: "CaptureFailure", node: current, memberName: segment };
}

function isPattern(node: Rule.Node): boolean {
  switch (node.parent.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
      return (
        node.parent.id === node ||
        (node.parent.params as Rule.Node[]).includes(node)
      );
    case "ArrowFunctionExpression":
      return (node.parent.params as Rule.Node[]).includes(node);
    case "ForInStatement":
    case "ForOfStatement":
      return node.parent.left === node;
    case "VariableDeclarator":
      return node.parent.id === node;
    case "Property":
      return (
        node.parent.value === node &&
        node.parent.parent.type === "ObjectPattern"
      );
    case "CatchClause":
      return node.parent.param === node;
    case "AssignmentPattern":
      return node.parent.left === node;
    case "ArrayPattern":
      return (node.parent.elements as (Rule.Node | null)[]).includes(node);
    case "RestElement":
      return node.parent.argument === node;
  }
  return false;
}

function collectReactJSXVars(
  context: Rule.RuleContext,
  root: Node
): Map<Scope.Variable, JSXIdentifier[]> {
  const referenceMap = new Map<Scope.Variable, JSXIdentifier[]>();
  collect(root, {});
  return referenceMap;

  function collect(
    node: NodeWithJSX,
    bindings: Record<string, Scope.Variable>
  ) {
    let newBindings: Record<string, Scope.Variable> | undefined = undefined;
    switch (node.type) {
      case "Program":
      case "StaticBlock":
      case "BlockStatement": {
        newBindings = { ...bindings };
        for (const stmtOrLabel of node.body) {
          const stmt = unLabel(stmtOrLabel);
          switch (stmt.type) {
            case "ClassDeclaration":
            case "FunctionDeclaration":
            case "ImportDeclaration":
              addVariablesFrom(newBindings, stmt);
              break;
            case "VariableDeclaration":
              if (stmt.kind !== "var") {
                addVariablesFrom(newBindings, stmt);
              }
              break;
          }
        }
        if (
          node.type === "Program" ||
          node.type === "StaticBlock" ||
          isFunctionLikeBlock(node)
        ) {
          addVarScopedVariablesFrom(newBindings, node);
        }
        break;
      }
      case "ForInStatement":
      case "ForOfStatement":
        if (
          node.left.type === "VariableDeclaration" &&
          node.left.kind !== "var"
        ) {
          newBindings = { ...bindings };
          addVariablesFrom(newBindings, node.left);
        }
        break;
      case "ForStatement":
        if (
          node.init &&
          node.init.type === "VariableDeclaration" &&
          node.init.kind !== "var"
        ) {
          newBindings = { ...bindings };
          addVariablesFrom(newBindings, node.init);
        }
        break;
      case "ClassExpression":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
      case "CatchClause":
        newBindings = { ...bindings };
        addVariablesFrom(newBindings, node);
        break;
      case "JSXOpeningElement": {
        const ident = findInitIdentifier(node.name);
        if (ident) {
          if (Object.prototype.hasOwnProperty.call(bindings, ident.name)) {
            const binding = bindings[ident.name]!;
            if (!referenceMap.has(binding)) referenceMap.set(binding, []);
            referenceMap.get(binding)!.push(ident);
          }
        }
        break;
      }
    }
    for (const key of getKeys(node)) {
      const val = (node as unknown as Record<string, Node | Node[]>)[key]!;
      if (Array.isArray(val)) {
        for (const elem of val) {
          collect(elem, newBindings ?? bindings);
        }
      } else if (
        typeof val === "object" &&
        val !== null &&
        typeof val.type === "string"
      ) {
        collect(val, newBindings ?? bindings);
      }
    }
  }

  function findInitIdentifier(
    node: JSXIdentifier | JSXNamespacedName | JSXMemberExpression
  ): JSXIdentifier | null {
    if (node.type === "JSXIdentifier") return node;
    else if (node.type === "JSXMemberExpression")
      return findInitIdentifier(node.object);
    else return null;
  }

  function addVarScopedVariablesFrom(
    bindings: Record<string, Scope.Variable>,
    node: Program | BlockStatement | StaticBlock
  ) {
    for (const stmtOrLabel of node.body) {
      const stmt = unLabel(stmtOrLabel);
      switch (stmt.type) {
        case "BlockStatement":
          addVarScopedVariablesFrom(bindings, stmt);
          break;
        case "ForInStatement":
        case "ForOfStatement":
          if (
            stmt.left.type === "VariableDeclaration" &&
            stmt.left.kind === "var"
          ) {
            addVariablesFrom(bindings, stmt.left);
          }
          break;
        case "ForStatement":
          if (
            stmt.init &&
            stmt.init.type === "VariableDeclaration" &&
            stmt.init.kind === "var"
          ) {
            addVariablesFrom(bindings, stmt.init);
          }
          break;
        case "VariableDeclaration":
          if (stmt.kind === "var") {
            addVariablesFrom(bindings, stmt);
          }
          break;
      }
    }
  }

  function addVariablesFrom(
    bindings: Record<string, Scope.Variable>,
    node:
      | VariableDeclaration
      | VariableDeclarator
      | FunctionDeclaration
      | FunctionExpression
      | ArrowFunctionExpression
      | ClassDeclaration
      | ClassExpression
      | CatchClause
      | ImportDeclaration
      | ImportSpecifier
      | ImportDefaultSpecifier
      | ImportNamespaceSpecifier
  ) {
    for (const v of context.getDeclaredVariables(node)) {
      bindings[v.name] = v;
    }
  }

  function unLabel<T extends Statement | ModuleDeclaration | Directive>(
    node: T
  ): T | Statement {
    return node.type === "LabeledStatement" ? unLabel(node.body) : node;
  }

  function isFunctionLikeBlock(node: BlockStatement) {
    const parent = (node as BlockStatement & Rule.NodeParentExtension)
      .parent ?? { type: "NoParent" };
    switch (parent.type) {
      case "FunctionExpression":
      case "FunctionDeclaration":
      case "ArrowFunctionExpression":
        return parent.body === node;
    }
    return false;
  }
}
