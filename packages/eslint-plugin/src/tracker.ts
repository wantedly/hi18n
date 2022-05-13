import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getKeys } from "eslint-visitor-keys";
import {
  getImportName,
  getStaticKey,
  getStaticMemKey,
  resolveVariable,
} from "./util";

export class Tracker {
  watchingImports: Record<string, string[]> = {};
  resources: Record<string, ResourceHooks> = {};
  visited: Set<TSESTree.Node> = new Set<TSESTree.Node>();
  jsxClosure?: Set<string> | undefined;
  jsxBindings?: Map<TSESLint.Scope.Variable, TSESTree.JSXIdentifier[]>;

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
    // Invalidate
    this.jsxClosure = undefined;
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
    // Invalidate
    this.jsxClosure = undefined;
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
    listener: (node: TSESTree.Node, captured: CaptureMap) => void
  ) {
    this.getResourceHooks(resName).listeners.push(listener);
  }
  private fire(res: Resource, node: TSESTree.Node) {
    for (const resName of res.resNames) {
      for (const listener of this.getResourceHooks(resName).listeners) {
        listener(node, res.captured);
      }
    }
  }

  trackImport(
    scopeManager: TSESLint.Scope.ScopeManager,
    node: TSESTree.ImportDeclaration
  ) {
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
          this.trackVariable(scopeManager, spec, spec.local.name, subRes);
        }
      } else {
        this.trackVariable(scopeManager, spec, spec.local.name, res);
      }
    }
  }
  private trackVariable(
    scopeManager: TSESLint.Scope.ScopeManager,
    node: TSESTree.Node,
    varName: string,
    res: Resource
  ) {
    const varDecl = scopeManager
      .getDeclaredVariables(node)
      .find((v) => v.name === varName);
    if (!varDecl) return;
    for (const varRef of varDecl.references) {
      if (this.visited.has(varRef.identifier)) continue;
      this.visited.add(varRef.identifier);
      if (isPattern(varRef.identifier)) continue;
      this.trackExpression(scopeManager, varRef.identifier, res);
    }
    if (res.resNames.some((resName) => this.getJsxClosure().has(resName))) {
      if (!this.jsxBindings) {
        this.jsxBindings = collectReactJSXVars(scopeManager);
      }
      const refs = this.jsxBindings.get(varDecl) ?? [];
      for (const varRef of refs) {
        this.trackExpression(scopeManager, varRef, res);
      }
    }
  }
  private trackExpression(
    scopeManager: TSESLint.Scope.ScopeManager,
    expr:
      | TSESTree.Expression
      | TSESTree.JSXElement
      | TSESTree.JSXIdentifier
      | TSESTree.JSXMemberExpression,
    res: Resource
  ) {
    this.fire(res, expr);
    if (!expr.parent) return;
    const parent = expr.parent;
    switch (parent.type) {
      case "VariableDeclarator":
        if (parent.init === expr) {
          this.trackPattern(scopeManager, parent, parent.id, res);
        }
        break;
      case "MemberExpression":
      case "JSXMemberExpression":
        if (parent.object === expr) {
          const key = getStaticMemKey(parent);
          if (key !== null) {
            const subRes = this.memberResource(res, key);
            if (subRes) {
              this.trackExpression(scopeManager, parent, subRes);
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
              this.trackExpression(scopeManager, parent, {
                resNames: [subResName],
                captured: newCaptured,
              });
            }
          }
        }
        break;
      case "JSXOpeningElement":
        if (parent.name === expr && parent.parent?.type === "JSXElement") {
          const elem = parent.parent;
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
              this.trackExpression(scopeManager, elem, {
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
    scopeManager: TSESLint.Scope.ScopeManager,
    decl: TSESTree.VariableDeclarator,
    pat: TSESTree.DestructuringPattern,
    res: Resource
  ) {
    switch (pat.type) {
      case "Identifier":
        this.trackVariable(scopeManager, decl, pat.name, res);
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
            this.trackPattern(scopeManager, decl, elem, subRes);
          }
          i++;
        }
        break;
      }
      case "ObjectPattern":
        for (const prop of pat.properties) {
          if (prop.type === "RestElement") {
            this.trackPattern(scopeManager, decl, prop.argument, res);
          } else {
            const key = getStaticKey(prop);
            if (key !== null) {
              const subRes = this.memberResource(res, key);
              if (subRes) {
                this.trackPattern(
                  scopeManager,
                  decl,
                  prop.value as TSESTree.DestructuringPattern,
                  subRes
                );
              }
            }
          }
        }
        break;
      // case "AssignmentPattern":
      //   this.trackPattern(scopeManager, decl, pat.left, res);
      //   break;
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

  private getJsxClosure(): Set<string> {
    if (this.jsxClosure) return this.jsxClosure;
    const reverseMembership = new Map<string, string[]>();
    for (const [resName, res] of Object.entries(this.resources)) {
      for (const subResName of Object.values(res.members).flat(1)) {
        const mem = reverseMembership.get(subResName);
        if (!mem) {
          reverseMembership.set(subResName, [resName]);
        } else if (!mem.includes(resName)) {
          mem.push(resName);
        }
      }
    }
    const jsxClosure = new Set<string>();
    function fill(resName: string) {
      if (jsxClosure.has(resName)) return;
      jsxClosure.add(resName);
      for (const superResName of reverseMembership.get(resName) ?? []) {
        fill(superResName);
      }
    }
    for (const [resName, res] of Object.entries(this.resources)) {
      if (res.jsxElements.length > 0) fill(resName);
    }
    return (this.jsxClosure = jsxClosure);
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
  listeners: ((node: TSESTree.Node, captured: CaptureMap) => void)[];
};

type Resource = {
  resNames: string[];
  captured: CaptureMap;
};

type CaptureMap = Record<string, GeneralizedNode>;
type GeneralizedNode = TSESTree.Node | ArgumentsOf | PropsOf | CaptureFailure;

type CaptureFailure = {
  type: "CaptureFailure";
  node: GeneralizedNode;
  memberName: string;
};

type ArgumentsOf = {
  type: "ArgumentsOf";
  node: TSESTree.CallExpression | TSESTree.NewExpression;
};

type PropsOf = {
  type: "PropsOf";
  node: TSESTree.JSXElement;
};

export function capturedRoot(node: GeneralizedNode): TSESTree.Node {
  if (
    node.type === "CaptureFailure" ||
    node.type === "ArgumentsOf" ||
    node.type === "PropsOf"
  ) {
    return capturedRoot(node.node);
  } else {
    return node;
  }
}

function captureArguments(
  expr: TSESTree.CallExpression | TSESTree.NewExpression,
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

function captureProps(
  elem: TSESTree.JSXElement,
  captures: CaptureSpec[]
): CaptureMap {
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
    for (const arg of current.elements as (
      | TSESTree.Expression
      | TSESTree.SpreadElement
    )[]) {
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
          return attr.value.expression;
        } else if (attr.value !== null) {
          return attr.value;
        }
      }
    }
  }
  return { type: "CaptureFailure", node: current, memberName: segment };
}

function isPattern(node: TSESTree.Node): boolean {
  if (!node.parent) return false;

  switch (node.parent.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
      return (
        node.parent.id === node ||
        (node.parent.params as TSESTree.Node[]).includes(node)
      );
    case "ArrowFunctionExpression":
      return (node.parent.params as TSESTree.Node[]).includes(node);
    case "ForInStatement":
    case "ForOfStatement":
      return node.parent.left === node;
    case "VariableDeclarator":
      return node.parent.id === node;
    case "Property":
      return (
        node.parent.value === node &&
        node.parent.parent?.type === "ObjectPattern"
      );
    case "CatchClause":
      return node.parent.param === node;
    case "AssignmentPattern":
      return node.parent.left === node;
    case "ArrayPattern":
      return (node.parent.elements as (TSESTree.Node | null)[]).includes(node);
    case "RestElement":
      return node.parent.argument === node;
  }
  return false;
}

function collectReactJSXVars(
  scopeManager: TSESLint.Scope.ScopeManager
): Map<TSESLint.Scope.Variable, TSESTree.JSXIdentifier[]> {
  const root = scopeManager.globalScope!.block;
  const referenceMap = new Map<
    TSESLint.Scope.Variable,
    TSESTree.JSXIdentifier[]
  >();
  collect(root);
  return referenceMap;

  function collect(node: TSESTree.Node | null) {
    if (node == null) return;
    switch (node.type) {
      case "JSXOpeningElement": {
        const ident = findInitIdentifier(node.name);
        if (ident) {
          const binding = resolveVariable(scopeManager, ident);
          if (binding) {
            if (!referenceMap.has(binding)) referenceMap.set(binding, []);
            referenceMap.get(binding)!.push(ident);
          }
        }
        break;
      }
    }
    for (const key of getKeys(node)) {
      const val = (
        node as unknown as Record<string, TSESTree.Node | TSESTree.Node[]>
      )[key]!;
      if (Array.isArray(val)) {
        for (const elem of val) {
          collect(elem);
        }
      } else if (
        typeof val === "object" &&
        val !== null &&
        typeof val.type === "string"
      ) {
        collect(val);
      }
    }
  }

  function findInitIdentifier(
    node:
      | TSESTree.JSXIdentifier
      | TSESTree.JSXNamespacedName
      | TSESTree.JSXMemberExpression
  ): TSESTree.JSXIdentifier | null {
    if (node.type === "JSXIdentifier") return node;
    else if (node.type === "JSXMemberExpression")
      return findInitIdentifier(node.object);
    else return null;
  }
}
