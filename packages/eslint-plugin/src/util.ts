import { Rule, Scope } from "eslint";
import {
  AssignmentProperty,
  ClassDeclaration,
  Directive,
  Identifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  MemberExpression,
  ModuleDeclaration,
  Property,
} from "estree";
import {
  DeclarationExt,
  StatementExt,
  TSInterfaceDeclaration,
  TSPropertySignature,
  TSTypeAliasDeclaration,
} from "./estree-ts";

export function getImportName(
  spec: ImportSpecifier | ImportDefaultSpecifier
): string {
  if (spec.type === "ImportSpecifier") {
    return spec.imported.name;
  } else {
    return "default";
  }
}

export function getStaticMemKey(mem: MemberExpression): string | null {
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
  prop: AssignmentProperty | Property | TSPropertySignature
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
  scopeManager: Scope.ScopeManager,
  node: Identifier
): (Scope.Definition & { type: "ImportBinding" }) | undefined {
  const variable = resolveVariable(scopeManager, node);
  if (!variable) return undefined;
  return variable.defs.find(
    (def): def is Scope.Definition & { type: "ImportBinding" } =>
      def.type === "ImportBinding"
  );
}

export function resolveVariable(
  scopeManager: Scope.ScopeManager,
  node: Identifier
): Scope.Variable | undefined {
  const scope = nearestScope(scopeManager, node as Rule.Node);
  return findVariable(scope, node.name);
}

function findVariable(
  scope: Scope.Scope,
  name: string
): Scope.Variable | undefined {
  let currentScope: Scope.Scope | null = scope;
  while (currentScope) {
    const v = currentScope.variables.find((v) => v.name === name);
    if (v) return v;
    currentScope = currentScope.upper;
  }
  return undefined;
}

export type TypeDeclarator =
  | TSInterfaceDeclaration
  | TSTypeAliasDeclaration
  | ClassDeclaration
  | ImportSpecifier
  | ImportDefaultSpecifier
  | ImportNamespaceSpecifier;

export function resolveTypeLevelVariable(
  scopeManager: Scope.ScopeManager,
  node: Identifier
): TypeDeclarator | undefined {
  const scope = nearestScope(scopeManager, node as Rule.Node);
  return findTypeLevelVariable(scope, node.name);
}

function findTypeLevelVariable(
  scope: Scope.Scope,
  name: string
): TypeDeclarator | undefined {
  let currentScope: Scope.Scope | null = scope;
  while (currentScope) {
    switch (currentScope.block.type) {
      case "BlockStatement":
      case "Program":
        for (const stmtBase of currentScope.block.body as (
          | StatementExt
          | ModuleDeclaration
          | Directive
        )[]) {
          const stmt =
            stmtBase.type === "ExportNamedDeclaration" && stmtBase.declaration
              ? stmtBase.declaration
              : stmtBase.type === "ExportDefaultDeclaration" &&
                ["ClassDeclaration", "TSInterfaceDeclaration"].includes(
                  stmtBase.declaration.type
                )
              ? (stmtBase.declaration as DeclarationExt)
              : stmtBase;
          switch (stmt.type) {
            case "TSInterfaceDeclaration":
            case "TSTypeAliasDeclaration":
            case "ClassDeclaration":
              if (stmt.id && stmt.id.name === name) return stmt;
              break;
            case "ImportDeclaration":
              for (const spec of stmt.specifiers) {
                if (spec.local.name === name) return spec;
              }
              break;
          }
        }
        break;
    }
    currentScope = currentScope.upper;
  }
  return undefined;
}

function nearestScope(
  scopeManager: Scope.ScopeManager,
  node: Rule.Node
): Scope.Scope {
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
