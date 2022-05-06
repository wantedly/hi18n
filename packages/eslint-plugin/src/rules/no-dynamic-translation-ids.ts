import type { TSESLint } from "@typescript-eslint/utils";
import { translationCallTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";

type MessageIds = "no-dynamic-keys";

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description:
      "disallow dynamic keys where hi18n cannot correctly detect used keys",
    recommended: "error",
  },
  messages: {
    "no-dynamic-keys": "Don't use dynamic translation keys",
  },
  schema: {},
};

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): TSESLint.RuleListener {
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
}
