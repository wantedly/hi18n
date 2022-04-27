import { Rule, Scope } from "eslint";
import {
  ClassDeclaration,
  Directive,
  Identifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  ModuleDeclaration,
} from "estree";
import {
  DeclarationExt,
  NewExpressionExt,
  StatementExt,
  TSInterfaceBody,
  TSInterfaceDeclaration,
  TSSignature,
  TSTypeAliasDeclaration,
  TSTypeLiteral,
  TSTypeReference,
} from "./estree-ts";
import { nearestScope } from "./util";

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

export function extractAsObjectType(
  decl: TypeDeclarator
):
  | { body: TSInterfaceBody | TSTypeLiteral; signatures: TSSignature[] }
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
  scopeManager: Scope.ScopeManager,
  node: Rule.Node
): { body: TSInterfaceBody | TSTypeLiteral; signatures: TSSignature[] } | null {
  const typeParameters = (node as NewExpressionExt).typeParameters;
  if (!typeParameters) return null;

  const typeParam = findTypeParameter(node);
  if (!typeParam) return null;
  const resolved = resolveTypeLevelVariable(scopeManager, typeParam.typeName);
  if (!resolved) return null;
  const objinfo = extractAsObjectType(resolved);
  if (!objinfo) return null;
  return objinfo;
}

export function findTypeParameter(node: Rule.Node): TSTypeReference | null {
  if (node.type !== "NewExpression") return null;
  const typeParameters = (node as NewExpressionExt).typeParameters;
  if (!typeParameters) return null;
  if (typeParameters.type !== "TSTypeParameterInstantiation") return null;
  if (typeParameters.params.length < 1) return null;
  const typeParam = typeParameters.params[0]!;
  if (typeParam.type !== "TSTypeReference") return null;
  return typeParam;
}
