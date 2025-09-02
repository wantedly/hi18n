import type { TSESLint } from "@typescript-eslint/utils";
import { translationCallTracker } from "../common-trackers.js";
import { DefReference, lookupDefinitionSource } from "../def-location.js";

export type TranslationUsage = {
  id: string;
  bookLocation: DefReference;
};
export type CollectTranslationIdsCallback = (record: TranslationUsage) => void;

type MessageIds = never;
type Options = [CollectTranslationIdsCallback];

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description: "an internal rule to collect translation ids",
    recommended: false,
  },
  messages: {},
  schema: {},
};

export const defaultOptions: Options = [
  () => {
    /* do nothing */
  },
];

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): TSESLint.RuleListener {
  if (context.options[0] === undefined) {
    throw new Error(
      "Callback not found\nNote: this rule is for an internal use."
    );
  }
  if (typeof context.options[0] !== "function")
    throw new Error("invalid callback");
  const collectIdsCallback = context.options[0];
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
      bookNode
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
}
