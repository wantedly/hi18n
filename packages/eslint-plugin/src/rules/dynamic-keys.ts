import type { Rule } from "eslint";
import { capturedRoot, Tracker } from "../tracker";

export const meta: Rule.RuleMetaData = {
  type: "problem",
  docs: {
    description: "disallow dynamic keys where hi18n cannot correctly detect used keys",
    recommended: true,
  },
  messages: {
    "dynamic-keys": "Don't use dynamic translation keys",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember("import(\"@hi18n/core\")", "getI18n");
  tracker.watchCall("import(\"@hi18n/core\").getI18n", [
    {
      captureAs: "catalog",
      path: ["0"],
    },
  ]);
  tracker.watchMember("import(\"@hi18n/core\").getI18n()", "t");
  tracker.watchCall("import(\"@hi18n/core\").getI18n().t", [
    {
      captureAs: "id",
      path: ["0"],
    },
  ]);
  tracker.listen("import(\"@hi18n/core\").getI18n().t()", (_node, captured) => {
    const idNode = captured["id"]!;
    if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
      context.report({
        node: capturedRoot(idNode),
        messageId: "dynamic-keys",
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
};
