import type { Rule } from "eslint";
import { resolveImportedVariable } from "../util";
import { translationCallTracker } from "../common-trackers";

export type TranslationUsage = {
  id: string;
  bookSource: string;
  filename: string;
};
export type CollectTranslationIdsCallback = (record: TranslationUsage) => void;

export const meta: Rule.RuleMetaData = {
  type: "problem",
  docs: {
    description: "an internal rule to collect translation ids",
    recommended: false,
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  if (context.settings["@hi18n/collect-ids-callback"] === undefined) {
    throw new Error("settings[\"@hi18n/collect-ids-callback\"] not found\nNote: this rule is for an internal use.");
  }
  if (typeof context.settings["@hi18n/collect-ids-callback"] !== "function") throw new Error("invalid collectIdsCallback");
  const collectIdsCallback = context.settings["@hi18n/collect-ids-callback"] as CollectTranslationIdsCallback;
  const tracker = translationCallTracker();
  tracker.listen("translation", (_node, captured) => {
    const idNode = captured["id"]!;
    if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
      return;
    }
    const id: string = idNode.value;

    const bookNode = captured["book"]!;
    if (bookNode.type !== "Identifier") {
      return;
    }
    const bookDef = resolveImportedVariable(context.getSourceCode().scopeManager, bookNode);
    if (!bookDef) return;
    const bookSource: string = `${bookDef.parent.source.value}`;
    collectIdsCallback({
      id,
      bookSource,
      filename: context.getFilename(),
    });
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
};
