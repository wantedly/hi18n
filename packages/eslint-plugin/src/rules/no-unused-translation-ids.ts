import type { TSESLint } from "@typescript-eslint/utils";
import { commentOut, getStaticKey } from "../util.js";
import { catalogTracker, getCatalogData } from "../common-trackers.js";
import { queryUsedTranslationIds } from "../used-ids.js";

type MessageIds = "unused-translation-id";
type Options = [];

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "suggestion",
  fixable: "code",
  docs: {
    description:
      "removes the unused translations and generates the skeletons for the undeclared translation ids",
    recommended: false,
  },
  messages: {
    "unused-translation-id": "unused translation id",
  },
  schema: {},
};

export const defaultOptions: Options = [];

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): TSESLint.RuleListener {
  const tracker = catalogTracker();
  tracker.listen('new import("@hi18n/core").Catalog()', (node, captured) => {
    const usedIds = queryUsedTranslationIds(context, node, true);
    const usedIdsSet = new Set(usedIds);

    const catalogData = getCatalogData(captured);
    if (catalogData.type !== "ObjectExpression") return;

    for (const prop of catalogData.properties) {
      if (prop.type !== "Property") continue;
      const key = getStaticKey(prop);
      if (key === null) continue;
      if (!usedIdsSet.has(key)) {
        context.report({
          node: prop,
          messageId: "unused-translation-id",
          *fix(fixer) {
            const indent = prop.loc.start.column;
            const text = context.getSourceCode().getText(prop);
            yield fixer.replaceText(prop, commentOut(text, indent));
          },
        });
      }
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}
