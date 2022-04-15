import { Rule } from "eslint";
import { AssignmentProperty, CallExpression, Expression, Identifier, ImportDeclaration, ImportDefaultSpecifier, ImportSpecifier, MemberExpression, NewExpression, Node, Pattern, Property, VariableDeclarator } from "estree";

export class Tracker {
  watchingImports: Record<string, string[]> = {};
  resources: Record<string, ResourceHooks> = {};
  visited: Set<Node> = new Set<Node>();
  
  watchImport(source: string, watchAs: string = `import("${source}")`) {
    if (Object.prototype.hasOwnProperty.call(this.watchingImports, source)) {
      this.watchingImports[source]!.push(watchAs);
    } else {
      this.watchingImports[source] = [watchAs];
    }
    this.getResourceHooks(watchAs);
  }
  watchMember(resName: string, memberName: string, watchAs: string = `${resName}.${memberName}`) {
    const res = this.getResourceHooks(resName);
    if (Object.prototype.hasOwnProperty.call(res.members, memberName)) {
      res.members[memberName]!.push(watchAs);
    } else {
      res.members[memberName] = [watchAs];
    }
  }
  watchCall(resName: string, captures: CaptureSpec[] = [], watchAs: string = `${resName}()`) {
    const resHooks = this.getResourceHooks(resName);
    resHooks.calls.push({ resName: watchAs, captures });
  }
  watchConstruct(resName: string, captures: CaptureSpec[] = [], watchAs: string = `new ${resName}()`) {
    const resHooks = this.getResourceHooks(resName);
    resHooks.constructs.push({ resName: watchAs, captures });
  }
  private getResourceHooks(resName: string): ResourceHooks {
    if (Object.prototype.hasOwnProperty.call(this.resources, resName)) {
      return this.resources[resName]!;
    } else {
      return this.resources[resName] = { members: {}, calls: [], constructs: [], listeners: [] };
    }
  }

  listen(resName: string, listener: (node: Rule.Node, captured: CaptureMap) => void) {
    this.getResourceHooks(resName).listeners.push(listener);
  }
  private fire(res: Resource, node: Node) {
    for (const resName of res.resNames) {
      for (const listener of this.getResourceHooks(resName).listeners) {
        listener(node as Rule.Node, res.captured);
      }
    }
  }

  trackImport(context: Rule.RuleContext, node: ImportDeclaration) {
    if (typeof node.source.value !== "string") return;
    if (!Object.prototype.hasOwnProperty.call(this.watchingImports, node.source.value)) return;
    const resNames = this.watchingImports[node.source.value]!;
    const res: Resource = { resNames, captured: {} };
    for (const spec of node.specifiers) {
      if (spec.type === "ImportSpecifier" || spec.type === "ImportDefaultSpecifier") {
        const subRes = this.memberResource(res, getImportName(spec));
        if (subRes) {
          this.trackVariable(context, spec, spec.local.name, subRes);
        }
      } else {
        this.trackVariable(context, spec, spec.local.name, res);
      }
    }
  }
  private trackVariable(context: Rule.RuleContext, node: Node, varName: string, res: Resource) {
    const varDecl = context.getDeclaredVariables(node).find((v) => v.name === varName);
    if (!varDecl) return;
    for (const varRef of varDecl.references) {
      if (this.visited.has(varRef.identifier)) continue;
      this.visited.add(varRef.identifier);
      if (isPattern(varRef.identifier as Identifier & Rule.NodeParentExtension)) continue;
      this.trackExpression(context, varRef.identifier as Identifier & Rule.NodeParentExtension, res);
    }
  }
  private trackExpression(context: Rule.RuleContext, expr: Expression & Rule.NodeParentExtension, res: Resource) {
    this.fire(res, expr);
    if (!expr.parent) return;
    switch (expr.parent.type) {
      case "VariableDeclarator":
        if (expr.parent.init === expr) {
          this.trackPattern(context, expr.parent, expr.parent.id, res);
        }
        break;
      case "MemberExpression":
        if (expr.parent.object === expr) {
          const key = getStaticMemKey(expr.parent);
          if (key !== null) {
            const subRes = this.memberResource(res, key);
            if (subRes) {
              this.trackExpression(context, expr.parent, subRes);
            }
          }
        }
        break;
      case "CallExpression":
      case "NewExpression":
        if (expr.parent.callee === expr) {
          for (const resName of res.resNames) {
            const resHooks = this.getResourceHooks(resName);
            const callCaptureSpecs = expr.parent.type === "NewExpression" ? resHooks.constructs : resHooks.calls;
            for (const { resName: subResName, captures } of callCaptureSpecs) {
              const newCaptured = {
                ...res.captured,
                ...captureArguments(expr.parent, captures),
              };
              this.trackExpression(context, expr.parent, { resNames: [subResName], captured: newCaptured });
            }
          }
        }
        break;
    }
  }
  private trackPattern(context: Rule.RuleContext, decl: VariableDeclarator, pat: Pattern, res: Resource) {
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
  listeners: ((node: Rule.Node, captured: CaptureMap) => void)[];
};

type Resource = {
  resNames: string[];
  captured: CaptureMap;
};

type CaptureMap = Record<string, GeneralizedNode>;
type GeneralizedNode = Node | ArgumentsOf | CaptureFailure;

type CaptureFailure = {
  type: "CaptureFailure",
  node: GeneralizedNode,
  memberName: string,
};

type ArgumentsOf = {
  type: "ArgumentsOf",
  node: CallExpression | NewExpression,
};

export function capturedRoot(node: GeneralizedNode): Node {
  if (node.type === "CaptureFailure" || node.type === "ArgumentsOf") {
    return capturedRoot(node.node);
  } else {
    return node;
  }
}

function captureArguments(expr: CallExpression | NewExpression, captures: CaptureSpec[]): CaptureMap {
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

function iterateCapture(current: GeneralizedNode, segment: string): GeneralizedNode {
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
  }
  return { type: "CaptureFailure", node: current, memberName: segment };
}

function isPattern(node: Rule.Node): boolean {
  switch (node.parent.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
      return node.parent.id === node || (node.parent.params as Rule.Node[]).includes(node);
    case "ArrowFunctionExpression":
      return (node.parent.params as Rule.Node[]).includes(node);
    case "ForInStatement":
    case "ForOfStatement":
      return node.parent.left === node;
    case "VariableDeclarator":
      return node.parent.id === node;
    case "Property":
      return node.parent.value === node && node.parent.parent.type === "ObjectPattern";
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

function getImportName(spec: ImportSpecifier | ImportDefaultSpecifier): string {
  if (spec.type === "ImportSpecifier") {
    return spec.imported.name;
  } else {
    return "default";
  }
}

function getStaticMemKey(mem: MemberExpression): string | null {
  if (mem.computed) {
    if (mem.property.type === "Literal" && typeof mem.property.value === "string") {
      return mem.property.value;
    } else if (mem.property.type === "Literal" && typeof mem.property.value === "number") {
      return `${mem.property.value}`;
    } else if (mem.property.type === "Literal" && typeof mem.property.value === "bigint") {
      return `${mem.property.value}`;
    }
  } else {
    if (mem.property.type === "Identifier") {
      return mem.property.name;
    }
  }
  return null;
}

function getStaticKey(prop: AssignmentProperty | Property): string | null {
  if (prop.computed) {
    return null;
  } else {
    if (prop.key.type === "Identifier") {
      return prop.key.name;
    } else if (prop.key.type === "Literal" && typeof prop.key.value === "string") {
      return prop.key.value;
    } else if (prop.key.type === "Literal" && typeof prop.key.value === "number") {
      return `${prop.key.value}`;
    }
  }
  return null;
}
