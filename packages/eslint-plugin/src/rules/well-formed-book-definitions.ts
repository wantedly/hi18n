import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getStaticKey } from "../util.ts";
import {
  extractAsObjectType,
  findTypeParameter,
  resolveTypeLevelVariable,
} from "../ts-util.ts";
import { bookTracker } from "../common-trackers.ts";
import { capturedRoot } from "../tracker.ts";
import { resolveAsLocation } from "../def-location.ts";
import { getCatalogRef } from "../book-util.ts";
import { createRule, type PluginDocs } from "./create-rule.ts";

type MessageIds =
  | "expose-book"
  | "clarify-catalog-reference"
  | "catalogs-should-be-object"
  | "catalogs-invalid-spread"
  | "catalogs-invalid-id"
  | "catalog-type-must-be-type-alias"
  | "catalog-type-must-contain-only-simple-signatures";
type Options = [];

export const rule: TSESLint.RuleModule<
  MessageIds,
  Options,
  PluginDocs,
  TSESLint.RuleListener
> = createRule<Options, MessageIds>({
  name: "well-formed-book-definitions",
  meta: {
    type: "problem",
    docs: {
      description:
        "enforce well-formed book definitions so that hi18n can properly process them",
      recommended: true,
    },
    messages: {
      "expose-book": "expose the book as an export or a file-scope variable",
      "clarify-catalog-reference":
        "the catalog should be an imported variable or a variable declared in the file scope",
      "catalogs-should-be-object":
        "the first argument should be an object literal",
      "catalogs-invalid-spread": "do not use spread in the catalog list",
      "catalogs-invalid-id":
        "do not use dynamic translation ids for the catalog list",
      "catalog-type-must-be-type-alias":
        "declare catalog type as type Vocabulary = { ... }",
      "catalog-type-must-contain-only-simple-signatures":
        "only simple signatures are allowed",
    },
    schema: [],
  },

  defaultOptions: [],

  create(context): TSESLint.RuleListener {
    const tracker = bookTracker();
    tracker.listen("book", (node, captured) => {
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
          messageId: "expose-book",
        });
      }

      if (node.type !== "NewExpression") throw new Error("Not a NewExpression");
      checkTypeParameter(context, node);

      const catalogss = captured["catalogs"]!;
      if (catalogss.type !== "ObjectExpression") {
        context.report({
          node: capturedRoot(catalogss),
          messageId: "catalogs-should-be-object",
        });
        return;
      }
      for (const prop_ of catalogss.properties) {
        const prop = prop_ as
          | TSESTree.ObjectLiteralElement
          | TSESTree.MethodDefinition;
        if (prop.type !== "Property" && prop.type !== "MethodDefinition") {
          context.report({
            node: prop,
            messageId: "catalogs-invalid-spread",
          });
          continue;
        }
        const key = getStaticKey(prop);
        if (key === null) {
          context.report({
            node: prop.key,
            messageId: "catalogs-invalid-id",
          });
          continue;
        }
        const catalogLocation = getCatalogRef(
          context.getSourceCode().scopeManager!,
          context.getFilename(),
          prop,
        );
        if (!catalogLocation) {
          context.report({
            node: prop.key,
            messageId: "clarify-catalog-reference",
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

function checkTypeParameter(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  node: TSESTree.NewExpression,
) {
  const typeParameters =
    node.typeArguments ??
    (
      node as {
        typeParameters?: TSESTree.TSTypeParameterInstantiation | undefined;
      }
    ).typeParameters;
  if (!typeParameters) return;

  const typeParam = findTypeParameter(node);
  if (!typeParam) {
    context.report({
      node: typeParameters,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  const resolved = resolveTypeLevelVariable(
    context.getSourceCode().scopeManager!,
    typeParam.typeName,
  );
  if (!resolved) {
    context.report({
      node: typeParam,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  const objinfo = extractAsObjectType(resolved);
  if (!objinfo) {
    context.report({
      node: resolved,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  for (const signature of objinfo.signatures) {
    if (signature.type !== "TSPropertySignature") {
      context.report({
        node: signature,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
    if (signature.computed || signature.optional || signature.readonly) {
      context.report({
        node: signature,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
    const key = getStaticKey(signature);
    if (key === null) {
      context.report({
        node: signature,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
  }
}
