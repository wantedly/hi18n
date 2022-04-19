import type { Rule } from "eslint";
import { getImportName, getStaticKey, resolveImportedVariable } from "./util";
import { Tracker } from "./tracker";

export type CatalogLink = {
  locale: string;
  localCatalogSource: string;
  catalogFilename: string;
};
export type CollectCatalogLinksCallback = (record: CatalogLink) => void;

export function createFindCatalogLinks(cb: CollectCatalogLinksCallback): Rule.RuleModule {
  const meta: Rule.RuleMetaData = {
    type: "problem",
    docs: {
      description: "a dummy rule to collect used translation ids",
      recommended: true,
    },
  };

  function create(context: Rule.RuleContext): Rule.RuleListener {
    const tracker = new Tracker();
    tracker.watchImport("@hi18n/core");
    tracker.watchMember("import(\"@hi18n/core\")", "MessageCatalog");
    tracker.watchConstruct("import(\"@hi18n/core\").MessageCatalog", [
      {
        captureAs: "localCatalogs",
        path: ["0"],
      },
    ], "messageCatalog");
    tracker.listen("messageCatalog", (_node, captured) => {
      const localCatalogs = captured["localCatalogs"]!;
      if (localCatalogs.type !== "ObjectExpression") {
        return;
      }
      for (const prop of localCatalogs.properties) {
        if (prop.type !== "Property") continue;
        const key = getStaticKey(prop);
        if (key === null) continue;
        if (prop.value.type !== "Identifier") continue;
        const valueDef = resolveImportedVariable(context.getSourceCode().scopeManager, prop.value);
        if (!valueDef) return;
        if (valueDef.node.type === "ImportNamespaceSpecifier" || getImportName(valueDef.node) !== "default") return;
        cb({
          locale: key,
          localCatalogSource: `${valueDef.parent.source.value}`,
          catalogFilename: context.getFilename(),
        });
      }
    });
    return {
      ImportDeclaration(node) {
        tracker.trackImport(context, node);
      },
    };
  };

  return { meta, create };
}
