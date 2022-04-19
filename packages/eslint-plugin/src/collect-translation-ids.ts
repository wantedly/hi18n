import type { Rule } from "eslint";
import { resolveImportedVariable } from "./util";
import { Tracker } from "./tracker";

export type TranslationUsage = {
  id: string;
  catalogSource: string;
  filename: string;
};
export type CollectTranslationIdsCallback = (record: TranslationUsage) => void;

export function createCollectTranslationIds(cb: CollectTranslationIdsCallback): Rule.RuleModule {
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
    tracker.watchImport("@hi18n/react");
    tracker.watchMember("import(\"@hi18n/core\")", "getI18n");
    tracker.watchCall("import(\"@hi18n/core\").getI18n", [
      {
        captureAs: "catalog",
        path: ["0"],
      },
    ], "i18n");
    tracker.watchMember("import(\"@hi18n/react\")", "useI18n");
    tracker.watchCall("import(\"@hi18n/react\").useI18n", [
      {
        captureAs: "catalog",
        path: ["0"],
      },
    ], "i18n");
    tracker.watchMember("i18n", "t");
    tracker.watchCall("i18n.t", [
      {
        captureAs: "id",
        path: ["0"],
      },
    ]);
    tracker.watchMember("import(\"@hi18n/react\")", "Translate");
    tracker.watchJSXElement("import(\"@hi18n/react\").Translate", [
      {
        captureAs: "catalog",
        path: ["catalog"],
      },
      {
        captureAs: "id",
        path: ["id"],
      },
    ], "i18n.t()");
    tracker.listen("i18n.t()", (_node, captured) => {
      const idNode = captured["id"]!;
      if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
        return;
      }
      const id: string = idNode.value;

      const catalogNode = captured["catalog"]!;
      if (catalogNode.type !== "Identifier") {
        return;
      }
      const catalogDef = resolveImportedVariable(context.getSourceCode().scopeManager, catalogNode);
      if (!catalogDef) return;
      const catalogSource: string = `${catalogDef.parent.source.value}`;
      cb({
        id,
        catalogSource,
        filename: context.getFilename(),
      });
    });
    return {
      ImportDeclaration(node) {
        tracker.trackImport(context, node);
      },
    };
  };

  return { meta, create };
}
