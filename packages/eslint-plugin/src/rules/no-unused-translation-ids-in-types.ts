import type { TSESLint } from "@typescript-eslint/utils";
import { commentOut, getStaticKey } from "../util.ts";
import { findTypeDefinition } from "../ts-util.ts";
import { bookTracker } from "../common-trackers.ts";
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
  name: "no-unused-translation-ids-in-types",
  meta: {
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
    schema: [],
  },

  defaultOptions: [],

  create(context): TSESLint.RuleListener {
    const tracker = bookTracker();
    tracker.listen("book", (node, _captured) => {
      const usedIds = queryUsedTranslationIds(context, node, false);
      const usedIdsSet = new Set(usedIds);

      if (node.type === "Identifier") return;
      if (node.type !== "NewExpression") throw new Error("Not a NewExpression");
      const objinfo = findTypeDefinition(
        context.getSourceCode().scopeManager!,
        node,
      );
      if (!objinfo) return;

      for (const signature of objinfo.signatures) {
        if (signature.type !== "TSPropertySignature") continue;
        const key = getStaticKey(signature);
        if (key === null) continue;
        if (!usedIdsSet.has(key)) {
          context.report({
            node: signature,
            // node: node as Node,
            messageId: "unused-translation-id",
            *fix(fixer) {
              const indent = signature.loc.start.column;
              const text = context.getSourceCode().getText(signature);
              yield fixer.replaceText(signature, commentOut(text, indent));
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
