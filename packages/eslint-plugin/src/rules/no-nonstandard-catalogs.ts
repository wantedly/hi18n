// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint } from "@typescript-eslint/utils";
import { getStaticKey } from "../util";
import { catalogTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";

type MessageIds =
  | "catalog-export-as-default"
  | "catalog-data-should-be-object"
  | "catalog-data-invalid-spread"
  | "catalog-data-invalid-id";

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  fixable: "code",
  docs: {
    description:
      "warns the nonstandard uses of Catalog that hi18n cannot properly process",
    recommended: "error",
  },
  messages: {
    "catalog-export-as-default": "the catalog should be exported as default",
    "catalog-data-should-be-object":
      "the catalog data should be an object literal",
    "catalog-data-invalid-spread": "do not use spread in the catalog data",
    "catalog-data-invalid-id":
      "do not use dynamic translation ids for the catalog data",
  },
  schema: {},
};

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): TSESLint.RuleListener {
  const tracker = catalogTracker();
  tracker.listen('new import("@hi18n/core").Catalog()', (node, captured) => {
    if (
      !node.parent ||
      node.parent.type !== "ExportDefaultDeclaration" ||
      node.parent.declaration !== node
    ) {
      context.report({
        node,
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
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}
