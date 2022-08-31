import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getStaticKey } from "../util";
import {
  extractAsObjectType,
  findTypeParameter,
  resolveTypeLevelVariable,
} from "../ts-util";
import { bookTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { lookupDefinitionSource, resolveAsLocation } from "../def-location";
import { getCatalogRef } from "../book-util";

type MessageIds =
  | "expose-book"
  | "clarify-catalog-reference"
  | "catalogs-should-be-object"
  | "catalogs-invalid-spread"
  | "catalogs-invalid-id"
  | "catalog-type-must-be-type-alias"
  | "catalog-type-must-contain-only-simple-signatures";
type Options = [];

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description:
      "enforce well-formed book definitions so that hi18n can properly process them",
    recommended: "error",
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
  schema: {},
};

export const defaultOptions: Options = [];

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): TSESLint.RuleListener {
  const tracker = bookTracker();
  tracker.listen("book", (node, captured) => {
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
    for (const prop of catalogss.properties) {
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
        prop
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
}

function checkTypeParameter(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  node: TSESTree.NewExpression
) {
  const typeParameters = node.typeParameters;
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
    typeParam.typeName
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
