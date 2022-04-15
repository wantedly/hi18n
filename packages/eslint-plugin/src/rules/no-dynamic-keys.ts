import type { Rule } from "eslint";
import { capturedRoot, Tracker } from "../tracker";

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
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchImport("@hi18n/react");
  tracker.watchMember("import(\"@hi18n/core\")", "getI18n");
  tracker.watchCall("import(\"@hi18n/core\").getI18n", [
    {
      captureAs: "catalog",
      path: ["0"],
    },
  ], "i18n");
  tracker.watchMember("import(\"@hi18n/react\")", "useI18n");
  tracker.watchCall("import(\"@hi18n/react\").useI18n", [
    {
      captureAs: "catalog",
      path: ["0"],
    },
  ], "i18n");
  tracker.watchMember("i18n", "t");
  tracker.watchCall("i18n.t", [
    {
      captureAs: "id",
      path: ["0"],
    },
  ]);
  tracker.watchMember("import(\"@hi18n/react\")", "Translate");
  tracker.watchJSXElement("import(\"@hi18n/react\").Translate", [
    {
      captureAs: "catalog",
      path: ["catalog"],
    },
    {
      captureAs: "id",
      path: ["id"],
    },
  ], "i18n.t()");
  tracker.listen("i18n.t()", (_node, captured) => {
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
