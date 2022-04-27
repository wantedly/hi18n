import type { Rule } from "eslint";
import { commentOut, getStaticKey } from "../util";
import { findTypeDefinition } from "../ts-util";
import { bookTracker } from "../common-trackers";
import { Node } from "estree";
import { TSPropertySignature } from "../estree-ts";

export const meta: Rule.RuleMetaData = {
  type: "problem",
  fixable: "code",
  docs: {
    description:
      "removes the unused translations and generates the skeletons for the undeclared translation ids",
    recommended: false,
  },
  messages: {
    "unused-translation-id": "unused translation id",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = bookTracker();
  tracker.listen("book", (node, _captured) => {
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

    const objinfo = findTypeDefinition(
      context.getSourceCode().scopeManager,
      node as Rule.Node
    );
    if (!objinfo) return;

    for (const signature of objinfo.signatures) {
      if (signature.type !== "TSPropertySignature") continue;
      const key = getStaticKey(signature);
      if (key === null) continue;
      if (!usedIdsSet.has(key)) {
        context.report({
          node: signature as Node | TSPropertySignature as Node,
          // node: node as Node,
          messageId: "unused-translation-id",
          *fix(fixer) {
            const indent = signature.loc!.start.column;
            const text = context
              .getSourceCode()
              .getText(signature as Node | TSPropertySignature as Node);
            yield fixer.replaceText(
              signature as Node | TSPropertySignature as Node,
              commentOut(text, indent)
            );
          },
        });
      }
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager, node);
    },
  };
}
