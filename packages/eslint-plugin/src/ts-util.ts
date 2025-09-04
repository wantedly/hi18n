import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { nearestScope } from "./util.js";

export type TypeDeclarator =
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSTypeAliasDeclaration
  | TSESTree.ClassDeclaration
  | TSESTree.ImportSpecifier
  | TSESTree.ImportDefaultSpecifier
  | TSESTree.ImportNamespaceSpecifier;

export function resolveTypeLevelVariable(
  scopeManager: TSESLint.Scope.ScopeManager,
  node: TSESTree.EntityName
): TypeDeclarator | undefined {
  if (node.type === "TSQualifiedName" || node.type === "ThisExpression")
    return undefined;
  const scope = nearestScope(scopeManager, node);
  return findTypeLevelVariable(scope, node.name);
}

function findTypeLevelVariable(
  scope: TSESLint.Scope.Scope,
  name: string
): TypeDeclarator | undefined {
  let currentScope: TSESLint.Scope.Scope | null = scope;
  while (currentScope) {
    switch (currentScope.block.type) {
      case "BlockStatement":
      case "Program":
        for (const stmtBase of currentScope.block.body) {
          const stmt =
            stmtBase.type === "ExportNamedDeclaration" && stmtBase.declaration
              ? stmtBase.declaration
              : stmtBase.type === "ExportDefaultDeclaration" &&
                ["ClassDeclaration", "TSInterfaceDeclaration"].includes(
                  stmtBase.declaration.type
                )
              ? stmtBase.declaration
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

export function extractAsObjectType(decl: TypeDeclarator):
  | {
      body: TSESTree.TSInterfaceBody | TSESTree.TSTypeLiteral;
      signatures: TSESTree.TypeElement[];
    }
  | undefined {
  if (decl.type === "TSTypeAliasDeclaration") {
    if (decl.typeAnnotation.type === "TSTypeLiteral") {
      return {
        body: decl.typeAnnotation,
        signatures: decl.typeAnnotation.members,
      };
    }
  } else if (decl.type === "TSInterfaceDeclaration") {
    return {
      body: decl.body,
      signatures: decl.body.body,
    };
  }
  return undefined;
}

export function findTypeDefinition(
  scopeManager: TSESLint.Scope.ScopeManager,
  node: TSESTree.NewExpression
): {
  body: TSESTree.TSInterfaceBody | TSESTree.TSTypeLiteral;
  signatures: TSESTree.TypeElement[];
} | null {
  const typeParameters =
    node.typeArguments ??
    (
      node as {
        typeParameters?: TSESTree.TSTypeParameterInstantiation | undefined;
      }
    ).typeParameters;
  if (!typeParameters) return null;

  const typeParam = findTypeParameter(node);
  if (!typeParam) return null;
  const resolved = resolveTypeLevelVariable(scopeManager, typeParam.typeName);
  if (!resolved) return null;
  const objinfo = extractAsObjectType(resolved);
  if (!objinfo) return null;
  return objinfo;
}

export function findTypeParameter(
  node: TSESTree.Node
): TSESTree.TSTypeReference | null {
  if (node.type !== "NewExpression") return null;
  const typeParameters =
    node.typeArguments ??
    (
      node as {
        typeParameters?: TSESTree.TSTypeParameterInstantiation | undefined;
      }
    ).typeParameters;
  if (!typeParameters) return null;
  if (typeParameters.type !== "TSTypeParameterInstantiation") return null;
  if (typeParameters.params.length < 1) return null;
  const typeParam = typeParameters.params[0]!;
  if (typeParam.type !== "TSTypeReference") return null;
  return typeParam;
}
