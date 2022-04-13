import { File, isExpression, isStringLiteral, Program } from "@babel/types";
import traverse, { NodePath } from "@babel/traverse";
import { enrichContext, EnrichOptions } from "./enrich-traverse";
import { MetaConstructor, MetaFunction, MetaGetTarget, MetaObject, MetaValue, Tracker } from "./tracker";

type ScannerResult = {
  exportedCatalogs: string[];
  importedCatalogs: Record<string, ImportedCatalog>;
};

type ImportedCatalog = {
  usedKeys: string[];
}

export function getCatalog(code: string, program: File | Program, options: EnrichOptions = {}): ScannerResult {
  const { scope } = enrichContext(code, program, options);
  const exportedCatalogs: string[] = [];
  const importedCatalogs: Record<string, ImportedCatalog> = {};
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
      if (path.node.source.value === "@hi18n/core") {
        tracker.registerImport(path, metaNamespace);
      } else {
        tracker.registerImport(path, new MaybeCatalogModule(importedCatalogs, path.node.source.value));
      }
    },
  }, scope);
  return { exportedCatalogs, importedCatalogs };
}

class CatalogValue extends MetaValue {}

class MaybeCatalogModule extends MetaValue {
  source: string;
  data: ImportedCatalog;
  constructor(importedCatalogs: Record<string, ImportedCatalog>, source: string) {
    super();
    this.source = source;
    if (!Object.prototype.hasOwnProperty.call(importedCatalogs, source)) {
      importedCatalogs[source] = { usedKeys: [] };
    }
    this.data = importedCatalogs[source]!;
  }

  override metaGet(property: string, path: NodePath<MetaGetTarget>): MetaValue | undefined {
    if (property === "catalog") {
      return new ImportedCatalogValue(this.data, this.source, property);
    }
    return super.metaGet(property, path);
  }
}

class ImportedCatalogValue extends MetaValue {
  source: string;
  exportedName: string;
  data: ImportedCatalog;
  constructor(data: ImportedCatalog, source: string, exportedName: string) {
    super();
    this.source = source;
    this.exportedName = exportedName;
    this.data = data;
  }

  override metaGet(property: string, path: NodePath<MetaGetTarget>): MetaValue | undefined {
    if (property === "getI18n") {
      return new MetaFunction(() => new I18nValue(this.data));
    }
    return super.metaGet(property, path);
  }
}

class I18nValue extends MetaValue {
  data: ImportedCatalog;
  constructor(data: ImportedCatalog) {
    super();
    this.data = data;
  }

  override metaGet(property: string, path: NodePath<MetaGetTarget>): MetaValue | undefined {
    if (property === "t") {
      return new MetaFunction((path) => {
        if (path.node.arguments.length > 0 && isExpression(path.node.arguments[0])) {
          const keyNode = path.node.arguments[0];
          if (isStringLiteral(keyNode)) {
            this.data.usedKeys.push(keyNode.value);
          }
        }
        return undefined;
      });
    }
    return super.metaGet(property, path);
  }
}
