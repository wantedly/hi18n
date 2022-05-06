// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint } from "@typescript-eslint/utils";
import { translationCallTracker } from "../common-trackers";
import { lookupDefinitionSource } from "../def-location";
import { capturedRoot } from "../tracker";

type MessageIds = "clarify-book-reference";

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description:
      "enforce well-formed references to books so that hi18n can properly process them",
    recommended: "error",
  },
  messages: {
    "clarify-book-reference":
      "the book should be an imported variable or a variable declared in the file scope",
  },
  schema: {},
};

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): TSESLint.RuleListener {
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
}
