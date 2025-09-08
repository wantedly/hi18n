import type { TSESLint } from "@typescript-eslint/utils";
import { translationCallTracker } from "../common-trackers.js";
import { type DefReference, lookupDefinitionSource } from "../def-location.js";
import { createRule, type PluginDocs } from "./create-rule.ts";

export type TranslationUsage = {
  id: string;
  bookLocation: DefReference;
};
export type CollectTranslationIdsCallback = (record: TranslationUsage) => void;

type MessageIds = never;
type Options = [];

export function getRule(
  collectIdsCallback: CollectTranslationIdsCallback,
): TSESLint.RuleModule<MessageIds, Options, PluginDocs, TSESLint.RuleListener> {
  if (typeof collectIdsCallback !== "function") {
    throw new Error("invalid callback");
  }
  return createRule<Options, MessageIds>({
    name: "collect-translation-ids",
    meta: {
      type: "problem",
      docs: {
        description: "an internal rule to collect translation ids",
        recommended: false,
      },
      messages: {},
      schema: [],
    },

    defaultOptions: [],

    create(context): TSESLint.RuleListener {
      const tracker = translationCallTracker();
      tracker.listen("translation", (node, captured) => {
        // This is usually an excess during tracking
        if (node.type === "Identifier") return;

        const idNode = captured["id"]!;
        if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
          return;
        }
        const id: string = idNode.value;

        const bookNode = captured["book"]!;
        if (bookNode.type !== "Identifier") {
          return;
        }
        const bookLocation = lookupDefinitionSource(
          context.getSourceCode().scopeManager!,
          context.getFilename(),
          bookNode,
        );
        if (!bookLocation) return;
        collectIdsCallback({
          id,
          bookLocation,
        });
      });
      return {
        ImportDeclaration(node) {
          tracker.trackImport(context.getSourceCode().scopeManager!, node);
        },
      };
    },
  });
}
