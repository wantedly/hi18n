import type { Rule as ruleNoNonstandardBookReferences } from "eslint";
import { translationCallTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { getImportName, resolveImportedVariable } from "../util";

export const meta: ruleNoNonstandardBookReferences.RuleMetaData = {
  type: "problem",
  docs: {
    description:
      "disallow dynamic translation ids where hi18n cannot correctly detect used translation ids",
    recommended: true,
  },
  messages: {
    "import-books":
      "the book should be directly imported from the corresponding module.",
    "import-books-as-book": 'the book should be exported as "book"',
  },
};

export function create(
  context: ruleNoNonstandardBookReferences.RuleContext
): ruleNoNonstandardBookReferences.RuleListener {
  const tracker = translationCallTracker();
  tracker.listen("translation", (_node, captured) => {
    const bookNode = captured["book"]!;
    if (bookNode.type !== "Identifier") {
      context.report({
        node: capturedRoot(bookNode),
        messageId: "import-books",
      });
      return;
    }
    const bookDef = resolveImportedVariable(
      context.getSourceCode().scopeManager,
      bookNode
    );
    if (!bookDef) {
      context.report({
        node: capturedRoot(bookNode),
        messageId: "import-books",
      });
      return;
    }
    if (
      bookDef.node.type === "ImportNamespaceSpecifier" ||
      getImportName(bookDef.node) !== "book"
    ) {
      context.report({
        node: bookDef.node,
        messageId: "import-books-as-book",
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
}
