import type { Rule as ruleNoNonstandardCatalogs } from "eslint";
import { getStaticKey } from "../util";
import { catalogTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { Node } from "estree";

export const meta: ruleNoNonstandardCatalogs.RuleMetaData = {
  type: "problem",
  fixable: "code",
  docs: {
    description:
      "warns the nonstandard uses of Catalog that hi18n cannot properly process",
    recommended: true,
  },
  messages: {
    "catalog-export-as-default": "the catalog should be exported as default",
    "catalog-data-should-be-object":
      "the catalog data should be an object literal",
    "catalog-data-invalid-spread": "do not use spread in the catalog data",
    "catalog-data-invalid-id":
      "do not use dynamic translation ids for the catalog data",
  },
};

export function create(
  context: ruleNoNonstandardCatalogs.RuleContext
): ruleNoNonstandardCatalogs.RuleListener {
  const tracker = catalogTracker();
  tracker.listen('new import("@hi18n/core").Catalog()', (node, captured) => {
    if (
      node.parent.type !== "ExportDefaultDeclaration" ||
      node.parent.declaration !== node
    ) {
      context.report({
        node: node as Node,
        messageId: "catalog-export-as-default",
      });
    }

    const catalogData = captured["catalogData"];
    if (!catalogData) throw new Error("Cannot capture catalogData");
    if (catalogData.type !== "ObjectExpression") {
      context.report({
        node: capturedRoot(catalogData),
        messageId: "catalog-data-should-be-object",
      });
      return;
    }

    for (const prop of catalogData.properties) {
      if (prop.type !== "Property") {
        context.report({
          node: prop,
          messageId: "catalog-data-invalid-spread",
        });
        continue;
      }
      const key = getStaticKey(prop);
      if (key === null) {
        context.report({
          node: prop.key,
          messageId: "catalog-data-invalid-id",
        });
        continue;
      }
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager, node);
    },
  };
}
