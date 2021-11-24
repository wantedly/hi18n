import { File, Program } from "@babel/types";
import traverse from "@babel/traverse";
import { enrichContext, EnrichOptions } from "./enrich-traverse";

export function getCatalog(code: string, program: File | Program, options: EnrichOptions = {}) {
  const { scope } = enrichContext(code, program, options);
  traverse(program, {
    ImportDeclaration(path) {
      if (path.node.source.value !== "@hi18n/core") return;
      // for (const specifier of path.get("specifiers")) {
      //
      // }
    },
    ExportDeclaration(path) {
      if (path.node.type === "ExportDefaultDeclaration") return;
      if (path.node.source?.value !== "@hi18n/core") return;
      throw path.buildCodeFrameError("Cannot track this usage");
    },
  }, scope);
}
