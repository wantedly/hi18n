/* eslint-disable @typescript-eslint/no-non-null-assertion */

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
  if (context.options[0] === undefined) {
    throw new Error("Callback not found\nNote: this rule is for an internal use.");
  }
  if (typeof context.options[0] !== "function") throw new Error("invalid callback");
  const collectIdsCallback = context.options[0] as CollectTranslationIdsCallback;
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
    const bookSource: string = `${bookDef.parent.source.value as string}`;
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
