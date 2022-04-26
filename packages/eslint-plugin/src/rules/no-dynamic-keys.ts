import type { Rule } from "eslint";
import { translationCallTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";

export const meta: Rule.RuleMetaData = {
  type: "problem",
  docs: {
    description: "disallow dynamic keys where hi18n cannot correctly detect used keys",
    recommended: true,
  },
  messages: {
    "no-dynamic-keys": "Don't use dynamic translation keys",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
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
      tracker.trackImport(context, node);
    },
  };
};
