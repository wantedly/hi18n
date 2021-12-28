import { File, Identifier, isIdentifier, Program, StringLiteral } from "@babel/types";
import traverse, { Binding, NodePath } from "@babel/traverse";
import { enrichContext, EnrichOptions } from "./enrich-traverse";
import { MetaConstructor, MetaObject, MetaValue, Tracker } from "./tracker";

type ScannerResult = {
  exportedCatalogs: string[]
};

export function getCatalog(code: string, program: File | Program, options: EnrichOptions = {}): ScannerResult {
  const { scope } = enrichContext(code, program, options);
  const exportedCatalogs: string[] = [];
  const tracker = new Tracker();

  const MessageCatalog = new MetaConstructor((_newExpr) => {
    const catalog = new CatalogValue();
    return catalog;
  });
  const metaNamespace = new MetaObject({
    MessageCatalog,
  });

  tracker.registerExportHook((_path, name, value) => {
    if (value instanceof CatalogValue) {
      exportedCatalogs.push(name);
    }
  });

  traverse(program, {
    ImportDeclaration(path) {
      if (path.node.source.value !== "@hi18n/core") return;
      // import { ... } from "@hi18n/core";

      tracker.registerImport(path, metaNamespace);
    },
  }, scope);
  return { exportedCatalogs };
}

class CatalogValue extends MetaValue {
}
