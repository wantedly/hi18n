import { Rule, Scope } from "eslint";
import { AssignmentProperty, Identifier, ImportDefaultSpecifier, ImportSpecifier, MemberExpression, Property } from "estree";

export function getImportName(spec: ImportSpecifier | ImportDefaultSpecifier): string {
  if (spec.type === "ImportSpecifier") {
    return spec.imported.name;
  } else {
    return "default";
  }
}

export function getStaticMemKey(mem: MemberExpression): string | null {
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

export function getStaticKey(prop: AssignmentProperty | Property): string | null {
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

export function resolveImportedVariable(scopeManager: Scope.ScopeManager, node: Identifier): (Scope.Definition & { type: "ImportBinding" }) | undefined {
  const variable = resolveVariable(scopeManager, node);
  if (!variable) return undefined;
  return variable.defs.find((def): def is Scope.Definition & { type: "ImportBinding" } => def.type === "ImportBinding");
}

export function resolveVariable(scopeManager: Scope.ScopeManager, node: Identifier): Scope.Variable | undefined {
  const scope = nearestScope(scopeManager, node as Rule.Node);
  return findVariable(scope, node.name);
}

function findVariable(scope: Scope.Scope, name: string): Scope.Variable | undefined {
  let currentScope: Scope.Scope | null = scope;
  while (currentScope) {
    const v = currentScope.variables.find((v) => v.name === name);
    if (v) return v;
    currentScope = currentScope.upper;
  }
  return undefined;
}

function nearestScope(scopeManager: Scope.ScopeManager, node: Rule.Node): Scope.Scope {
  let currentNode = node;
  while (currentNode) {
    const innerScope = scopeManager.acquire(currentNode, true);
    if (innerScope) return innerScope;
    const outerScope = scopeManager.acquire(currentNode, false);
    if (outerScope) return outerScope;
    currentNode = currentNode.parent;
  }
  throw new Error("No scope found");
}
