import { File, Identifier, Program, StringLiteral } from "@babel/types";
import traverse from "@babel/traverse";
import { enrichContext, EnrichOptions } from "./enrich-traverse";

function importName(node: Identifier | StringLiteral): string {
  if (node.type === "Identifier") return node.name;
  else return node.value;
}

export function getCatalog(code: string, program: File | Program, options: EnrichOptions = {}): string[] {
  const { scope } = enrichContext(code, program, options);
  const exportedCatalogs: string[] = [];
  traverse(program, {
    ImportDeclaration(path) {
      if (path.node.source.value !== "@hi18n/core") return;
      for (const specifier of path.get("specifiers")) {
        if (specifier.isImportDefaultSpecifier()) continue;
        if (!specifier.isImportSpecifier()) {
          throw specifier.buildCodeFrameError("Cannot track this usage");
        }
        if (importName(specifier.node.imported) !== "MessageCatalog") continue;
        const binding = path.scope.getBinding(specifier.node.local.name)!;
        for (const refPath of binding.referencePaths) {
          const newExprPath = refPath.parentPath;
          if (!newExprPath) continue;
          if (!(newExprPath.isNewExpression() && newExprPath.node.callee === refPath.node)) {
            continue;
          }

          const declaratorPath = newExprPath.parentPath;
          if (!declaratorPath) continue;
          if (!(declaratorPath.isVariableDeclarator() && declaratorPath.node.init === newExprPath.node)) {
            continue;
          }

          const declPath = declaratorPath.parentPath;
          if (!declPath) continue;
          if (!(declPath.isVariableDeclaration())) {
            continue;
          }

          const exportDeclPath = declPath.parentPath;
          if (!exportDeclPath) continue;
          if (!(exportDeclPath.isExportNamedDeclaration())) {
            continue;
          }

          const lval = declaratorPath.node.id;
          if (lval.type !== "Identifier") continue;
          exportedCatalogs.push(lval.name);
        }
      }
    },
    ExportDeclaration(path) {
      if (path.node.type === "ExportDefaultDeclaration") return;
      if (path.node.source?.value !== "@hi18n/core") return;
      throw path.buildCodeFrameError("Cannot track this usage");
    },
  }, scope);
  return exportedCatalogs;
}
