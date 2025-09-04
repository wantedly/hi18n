import type { TSESLint } from "@typescript-eslint/utils";
import { translationCallTracker } from "../common-trackers.js";
import { capturedRoot } from "../tracker.js";
import { createRule } from "./create-rule.ts";

type MessageIds = "no-dynamic-keys";
type Options = [];

export const rule = createRule<Options, MessageIds>({
  name: "no-dynamic-translation-ids",
  meta: {
    type: "problem",
    docs: {
      description:
        "disallow dynamic keys where hi18n cannot correctly detect used keys",
      recommended: true,
    },
    messages: {
      "no-dynamic-keys": "Don't use dynamic translation keys",
    },
    schema: [],
  },

  defaultOptions: [],

  create(context): TSESLint.RuleListener {
    const tracker = translationCallTracker();
    tracker.listen("translation", (_node, captured) => {
      const idNode = captured["id"]!;
      if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
        context.report({
          node: capturedRoot(idNode),
          messageId: "no-dynamic-keys",
        });
      }
    });
    return {
      ImportDeclaration(node) {
        tracker.trackImport(context.getSourceCode().scopeManager!, node);
      },
    };
  },
});
