// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint } from "@typescript-eslint/utils";
import { commentOut, getStaticKey } from "../util";
import { catalogTracker } from "../common-trackers";

type MessageIds = "unused-translation-id";

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

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): TSESLint.RuleListener {
  const tracker = catalogTracker();
  tracker.listen('new import("@hi18n/core").Catalog()', (_node, captured) => {
    const usedIds: unknown = context.settings["@hi18n/used-translation-ids"];
    if (usedIds === undefined)
      throw new Error(
        'settings["@hi18n/used-translation-ids"] not found\nNote: this rule is for an internal use.'
      );
    if (
      !Array.isArray(usedIds) ||
      !usedIds.every((k): k is string => typeof k === "string")
    )
      throw new Error("Invalid usedIds");
    const usedIdsSet = new Set(usedIds);

    const catalogData = captured["catalogData"]!;
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
