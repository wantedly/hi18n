import type { TSESLint } from "@typescript-eslint/utils";
import { commentOut, getStaticKey } from "../util.ts";
import { catalogTracker, getCatalogData } from "../common-trackers.ts";
import { queryUsedTranslationIds } from "../used-ids.ts";
import { createRule, type PluginDocs } from "./create-rule.ts";

type MessageIds = "unused-translation-id";
type Options = [];

export const rule: TSESLint.RuleModule<
  MessageIds,
  Options,
  PluginDocs,
  TSESLint.RuleListener
> = createRule<Options, MessageIds>({
  name: "no-unused-translation-ids",
  meta: {
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
    schema: [],
  },

  defaultOptions: [],

  create(context): TSESLint.RuleListener {
    const tracker = catalogTracker();
    tracker.listen('new import("@hi18n/core").Catalog()', (node, captured) => {
      if (node.type === "Identifier") {
        return;
      }
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
  },
});
