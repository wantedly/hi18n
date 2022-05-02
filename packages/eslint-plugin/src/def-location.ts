// eslint-disable-next-line node/no-unpublished-import
import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getImportName, resolveVariable } from "./util";

export type DefLocation = {
  path: string;
  localName?: string | undefined;
  exportNames: string[];
};

export function serializedLocations(loc: DefLocation): string[] {
  const serialized: string[] = [];
  if (loc.localName !== undefined) {
    serialized.push(`${loc.path}?local=${loc.localName}`);
  }
  for (const exportName of loc.exportNames) {
    serialized.push(`${loc.path}?exported=${exportName}`);
  }
  return serialized;
}

export function resolveAsLocation(
  scopeManager: TSESLint.Scope.ScopeManager,
  path: string,
  expr: TSESTree.Expression
): DefLocation | undefined {
  let localName: string | undefined = undefined;
  const exportNames: string[] = [];
  if (
    expr.parent &&
    expr.parent.type === "VariableDeclarator" &&
    expr.parent.init === expr &&
    expr.parent.parent &&
    expr.parent.parent.type === "VariableDeclaration" &&
    expr.parent.parent.declarations.includes(expr.parent) &&
    expr.parent.id.type === "Identifier"
  ) {
    // Something like const x = 42;
    if (
      expr.parent.parent.parent &&
      expr.parent.parent.parent.type === "Program"
    ) {
      // Top level local variable declaration
      localName = expr.parent.id.name;
    } else if (
      expr.parent.parent.parent &&
      expr.parent.parent.parent.type === "ExportNamedDeclaration"
    ) {
      // Something like export const x = 42;
      localName = expr.parent.id.name;
      exportNames.push(localName);
    }
  } else if (
    expr.parent &&
    expr.parent.type === "ExportDefaultDeclaration" &&
    expr.parent.declaration === expr
  ) {
    // Part of default export
    exportNames.push("default");
  }
  if (localName !== undefined) {
    const program = scopeManager.globalScope!.block;
    for (const decl of program.body) {
      if (decl.type !== "ExportNamedDeclaration") continue;
      for (const spec of decl.specifiers) {
        if (spec.local.name === localName) {
          // Named exports
          exportNames.push(spec.exported.name);
        }
      }
    }
  }
  if (localName !== undefined || exportNames.length > 0) {
    return { path, localName, exportNames };
  }
  return undefined;
}

export type DefReference =
  | {
      base: string;
      path: string;
      exportName: string;
    }
  | {
      base: string;
      path?: undefined;
      localName: string;
    };

export function serializeReference(ref: DefReference) {
  if (ref.path !== undefined) {
    return `${ref.path}?exported=${ref.exportName}`;
  } else {
    return `${ref.base}?local=${ref.localName}`;
  }
}

export function lookupDefinitionSource(
  scopeManager: TSESLint.Scope.ScopeManager,
  base: string,
  ident: TSESTree.Identifier
): DefReference | undefined {
  const variable = resolveVariable(scopeManager, ident);
  if (!variable) return undefined;
  for (const def of variable.defs) {
    switch (def.type) {
      case TSESLint.Scope.DefinitionType.Variable: {
        if (
          !def.node.parent ||
          def.node.parent.type !== "VariableDeclaration" ||
          !def.node.parent.parent ||
          def.node.parent.parent.type !== "Program"
        ) {
          // Not a file-scoped variable
          continue;
        }
        return {
          base,
          localName: def.name.name,
        };
      }
      case TSESLint.Scope.DefinitionType.ImportBinding:
        if (def.node.type === "ImportNamespaceSpecifier") {
          // Not supported yet (`import * as mod from "...";`)
          continue;
        }
        if (
          def.node.type === "TSImportEqualsDeclaration" ||
          def.parent.type === "TSImportEqualsDeclaration"
        ) {
          // Not supported yet (`import mod = require("...");`)
          continue;
        }
        return {
          base,
          path: def.parent.source.value,
          exportName: getImportName(def.node),
        };
        break;
    }
  }
  return undefined;
}
