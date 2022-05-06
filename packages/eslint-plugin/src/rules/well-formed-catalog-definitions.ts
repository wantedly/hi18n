import type { TSESLint } from "@typescript-eslint/utils";
import { getStaticKey } from "../util";
import { catalogTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { resolveAsLocation } from "../def-location";

type MessageIds =
  | "expose-catalog"
  | "catalog-data-should-be-object"
  | "catalog-data-invalid-spread"
  | "catalog-data-invalid-id";

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  fixable: "code",
  docs: {
    description:
      "enforce well-formed catalog definitions so that hi18n can properly process them",
    recommended: "error",
  },
  messages: {
    "expose-catalog":
      "expose the catalog as an export or a file-scope variable",
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
    if (node.type === "Identifier") return;

    const catalogLocation =
      node.type === "NewExpression"
        ? resolveAsLocation(
            context.getSourceCode().scopeManager!,
            context.getFilename(),
            node
          )
        : undefined;
    if (!catalogLocation) {
      context.report({
        node,
        messageId: "expose-catalog",
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
