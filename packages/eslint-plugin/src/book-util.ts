import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { type DefReference, lookupDefinitionSource } from "./def-location.ts";

export function getCatalogRef(
  scopeManager: TSESLint.Scope.ScopeManager,
  base: string,
  // Support MethodDefinition for compat
  prop: TSESTree.ObjectLiteralElement | TSESTree.MethodDefinition,
): DefReference | undefined {
  if (!(prop.type === "Property" || prop.type === "MethodDefinition")) {
    return undefined;
  }
  if (prop.value.type === "Identifier") {
    // `ja: catalogJa`
    const catalogLocation = lookupDefinitionSource(
      scopeManager,
      base,
      prop.value,
    );
    if (catalogLocation) {
      return catalogLocation;
    }
  } else if (
    prop.value.type === "ArrowFunctionExpression" ||
    prop.value.type === "FunctionExpression"
  ) {
    // `ja: () => import("./ja")`
    return dynamicImportRef(base, prop.value);
  }
}

function dynamicImportRef(
  base: string,
  fn: TSESTree.FunctionLike,
): DefReference | undefined {
  const expr = immediateBody(fn);
  if (!expr) return undefined;
  if (expr.type !== "ImportExpression") {
    return undefined;
  }
  // () => import(...)
  if (expr.source.type !== "Literal" || typeof expr.source.value !== "string") {
    return undefined;
  }
  // () => import("...")

  // Book constructor assumes "export default"
  return {
    base,
    path: expr.source.value,
    exportName: "default",
  };
}

function immediateBody(
  fn: TSESTree.FunctionLike,
): TSESTree.Expression | undefined {
  if (!fn.body) {
    // declaration only
    return undefined;
  } else if (fn.body.type === "BlockStatement") {
    // function() { return ...; }
    // () => { return ...; }
    if (fn.body.body.length !== 1) return undefined;
    const stmt = fn.body.body[0]!;
    if (stmt.type === "ReturnStatement" && stmt.argument) {
      return stmt.argument;
    } else {
      return undefined;
    }
  } else {
    // () => ...
    return fn.body;
  }
}
