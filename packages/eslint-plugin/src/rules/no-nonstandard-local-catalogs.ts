import type { Rule } from "eslint";
import { getStaticKey } from "../util";
import { localCatalogTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { Node } from "estree";

export const meta: Rule.RuleMetaData = {
  type: "problem",
  fixable: "code",
  docs: {
    description: "warns the nonstandard uses of LocalCatalog that hi18n cannot properly process",
    recommended: true,
  },
  messages: {
    "catalog-export-as-default": "the local catalog should be exported as default",
    "catalog-data-should-be-object": "the catalog data should be an object literal",
    "catalog-data-invalid-spread": "do not use spread in the catalog data",
    "catalog-data-invalid-key": "do not use dynamic keys for the catalog data",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = localCatalogTracker();
  tracker.listen("new import(\"@hi18n/core\").LocalCatalog()", (node, captured) => {
    if (node.parent.type !== "ExportDefaultDeclaration" || node.parent.declaration !== node) {
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
          messageId: "catalog-data-invalid-key",
        });
        continue;
      }
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
};
