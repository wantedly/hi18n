import type { TSESLint } from "@typescript-eslint/utils";
import { getStaticKey } from "../util.ts";
import { catalogTracker, getCatalogData } from "../common-trackers.ts";
import { capturedRoot } from "../tracker.ts";
import { resolveAsLocation } from "../def-location.ts";
import { createRule, type PluginDocs } from "./create-rule.ts";

type MessageIds =
  | "expose-catalog"
  | "catalog-data-should-be-object"
  | "catalog-data-invalid-spread"
  | "catalog-data-invalid-id";
type Options = [];

export const rule: TSESLint.RuleModule<
  MessageIds,
  Options,
  PluginDocs,
  TSESLint.RuleListener
> = createRule<Options, MessageIds>({
  name: "well-formed-catalog-definitions",
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description:
        "enforce well-formed catalog definitions so that hi18n can properly process them",
      recommended: true,
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
    schema: [],
  },

  defaultOptions: [],

  create(context): TSESLint.RuleListener {
    const tracker = catalogTracker();
    tracker.listen('new import("@hi18n/core").Catalog()', (node, captured) => {
      if (node.type === "Identifier") return;

      const catalogLocation =
        node.type === "NewExpression"
          ? resolveAsLocation(
              context.getSourceCode().scopeManager!,
              context.getFilename(),
              node,
            )
          : undefined;
      if (!catalogLocation) {
        context.report({
          node,
          messageId: "expose-catalog",
        });
      }

      const catalogData = getCatalogData(captured);
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
  },
});
