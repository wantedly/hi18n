// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

export function getImportName(
  spec: TSESTree.ImportSpecifier | TSESTree.ImportDefaultSpecifier
): string {
  if (spec.type === "ImportSpecifier") {
    return spec.imported.name;
  } else {
    return "default";
  }
}

export function getStaticMemKey(mem: TSESTree.MemberExpression): string | null {
  if (mem.computed) {
    if (
      mem.property.type === "Literal" &&
      typeof mem.property.value === "string"
    ) {
      return mem.property.value;
    } else if (
      mem.property.type === "Literal" &&
      typeof mem.property.value === "number"
    ) {
      return `${mem.property.value}`;
    } else if (
      mem.property.type === "Literal" &&
      typeof mem.property.value === "bigint"
    ) {
      return `${mem.property.value}`;
    }
  } else {
    if (mem.property.type === "Identifier") {
      return mem.property.name;
    }
  }
  return null;
}

export function getStaticKey(
  prop:
    | TSESTree.Property
    | TSESTree.MethodDefinition
    | TSESTree.TSPropertySignature
): string | null {
  if (prop.computed) {
    return null;
  } else {
    if (prop.key.type === "Identifier") {
      return prop.key.name;
    } else if (
      prop.key.type === "Literal" &&
      typeof prop.key.value === "string"
    ) {
      return prop.key.value;
    } else if (
      prop.key.type === "Literal" &&
      typeof prop.key.value === "number"
    ) {
      return `${prop.key.value}`;
    }
  }
  return null;
}

export function resolveImportedVariable(
  scopeManager: TSESLint.Scope.ScopeManager,
  node: TSESTree.Identifier
):
  | (TSESLint.Scope.Definition & {
      type: typeof TSESLint.Scope.DefinitionType.ImportBinding;
    })
  | undefined {
  const variable = resolveVariable(scopeManager, node);
  if (!variable) return undefined;
  return variable.defs.find(
    (
      def
    ): def is TSESLint.Scope.Definition & {
      type: typeof TSESLint.Scope.DefinitionType.ImportBinding;
    } => def.type === "ImportBinding"
  );
}

export function resolveVariable(
  scopeManager: TSESLint.Scope.ScopeManager,
  node: TSESTree.Identifier | TSESTree.JSXIdentifier
): TSESLint.Scope.Variable | undefined {
  const scope = nearestScope(scopeManager, node);
  return findVariable(scope, node.name);
}

function findVariable(
  scope: TSESLint.Scope.Scope,
  name: string
): TSESLint.Scope.Variable | undefined {
  let currentScope: TSESLint.Scope.Scope | null = scope;
  while (currentScope) {
    const v = currentScope.variables.find((v) => v.name === name);
    if (v) return v;
    currentScope = currentScope.upper;
  }
  return undefined;
}

export function nearestScope(
  scopeManager: TSESLint.Scope.ScopeManager,
  node: TSESTree.Node
): TSESLint.Scope.Scope {
  let currentNode: TSESTree.Node | undefined = node;
  while (currentNode) {
    const innerScope = scopeManager.acquire(currentNode, true);
    if (innerScope) return innerScope;
    const outerScope = scopeManager.acquire(currentNode, false);
    if (outerScope) return outerScope;
    currentNode = currentNode.parent;
  }
  throw new Error("No scope found");
}

export function commentOut(text: string, indent: number): string {
  return text
    .split(/^/m)
    .map((line, i) => {
      if (i === 0) {
        return `// ${line}`;
      } else {
        const spaces = /^\s*/.exec(line)![0]!.length;
        const cutAt = Math.min(spaces, indent);
        return `${line.substring(0, cutAt)}// ${line.substring(cutAt)}`;
      }
    })
    .join("");
}
