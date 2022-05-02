// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint } from "@typescript-eslint/utils";
import { resolveImportedVariable } from "../util";
import { translationCallTracker } from "../common-trackers";

export type TranslationUsage = {
  id: string;
  bookSource: string;
  filename: string;
};
export type CollectTranslationIdsCallback = (record: TranslationUsage) => void;

type MessageIds = never;

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description: "an internal rule to collect translation ids",
    recommended: false,
  },
  messages: {},
  schema: {},
};

export function create(
  context: Readonly<
    TSESLint.RuleContext<MessageIds, [CollectTranslationIdsCallback]>
  >
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
    const bookDef = resolveImportedVariable(
      context.getSourceCode().scopeManager!,
      bookNode
    );
    if (!bookDef) return;
    if (bookDef.parent.type === "TSImportEqualsDeclaration") return;
    const bookSource: string = bookDef.parent.source.value;
    collectIdsCallback({
      id,
      bookSource,
      filename: context.getFilename(),
    });
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}
