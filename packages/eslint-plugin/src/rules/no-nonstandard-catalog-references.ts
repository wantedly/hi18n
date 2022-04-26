import type { Rule } from "eslint";
import { translationCallTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { getImportName, resolveImportedVariable } from "../util";

export const meta: Rule.RuleMetaData = {
  type: "problem",
  docs: {
    description: "disallow dynamic keys where hi18n cannot correctly detect used keys",
    recommended: true,
  },
  messages: {
    "import-catalogs": "the catalog should be directly imported from the corresponding module.",
    "import-catalogs-as-catalog": "the catalog should be exported as \"catalog\"",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = translationCallTracker();
  tracker.listen("translation", (_node, captured) => {
    const catalogNode = captured["catalog"]!;
    if (catalogNode.type !== "Identifier") {
      context.report({
        node: capturedRoot(catalogNode),
        messageId: "import-catalogs",
      });
      return;
    }
    const catalogDef = resolveImportedVariable(context.getSourceCode().scopeManager, catalogNode);
    if (!catalogDef) {
      context.report({
        node: capturedRoot(catalogNode),
        messageId: "import-catalogs",
      });
      return;
    }
    if (catalogDef.node.type === "ImportNamespaceSpecifier" || getImportName(catalogDef.node) !== "catalog") {
      context.report({
        node: catalogDef.node,
        messageId: "import-catalogs-as-catalog",
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
};
