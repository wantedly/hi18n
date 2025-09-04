import type { TSESLint } from "@typescript-eslint/utils";
import { translationCallTracker } from "../common-trackers.js";
import { lookupDefinitionSource } from "../def-location.js";
import { capturedRoot } from "../tracker.js";
import { createRule } from "./create-rule.ts";

type MessageIds = "clarify-book-reference";
type Options = [];

export const rule = createRule<Options, MessageIds>({
  name: "well-formed-book-references",
  meta: {
    type: "problem",
    docs: {
      description:
        "enforce well-formed references to books so that hi18n can properly process them",
      recommended: true,
    },
    messages: {
      "clarify-book-reference":
        "the book should be an imported variable or a variable declared in the file scope",
    },
    schema: [],
  },

  defaultOptions: [],

  create(context): TSESLint.RuleListener {
    const tracker = translationCallTracker();
    tracker.listen("translation", (_node, captured) => {
      const bookNode = captured["book"]!;
      if (bookNode.type !== "Identifier") {
        context.report({
          node: capturedRoot(bookNode),
          messageId: "clarify-book-reference",
        });
        return;
      }
      const bookLocation = lookupDefinitionSource(
        context.getSourceCode().scopeManager!,
        context.getFilename(),
        bookNode
      );
      if (!bookLocation) {
        context.report({
          node: bookNode,
          messageId: "clarify-book-reference",
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
