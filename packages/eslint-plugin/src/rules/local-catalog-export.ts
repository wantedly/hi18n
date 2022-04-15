import type { Rule } from "eslint";
import { Tracker } from "../tracker";

export const meta: Rule.RuleMetaData = {
  type: "problem",
  docs: {
    description: "disallow nonstandard placement of LocalCatalog instances",
    recommended: true,
  },
  messages: {
    "local-catalog-export": "LocalCatalog should be exported as default.",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember("import(\"@hi18n/core\")", "LocalCatalog");
  tracker.watchConstruct("import(\"@hi18n/core\").LocalCatalog");
  tracker.listen("new import(\"@hi18n/core\").LocalCatalog()", (node) => {
    if (node.parent.type === "ExportDefaultDeclaration" && node.parent.declaration === node) return;
    context.report({
      node: node,
      messageId: "local-catalog-export",
    });
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
};
