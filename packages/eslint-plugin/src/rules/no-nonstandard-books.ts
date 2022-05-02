// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getImportName, getStaticKey, resolveImportedVariable } from "../util";
import {
  extractAsObjectType,
  findTypeParameter,
  resolveTypeLevelVariable,
} from "../ts-util";
import { bookTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";

type MessageIds =
  | "book-export-as-book"
  | "import-catalogs"
  | "import-catalogs-as-default"
  | "catalogs-should-be-object"
  | "catalogs-invalid-spread"
  | "catalogs-invalid-id"
  | "catalog-type-must-be-type-alias"
  | "catalog-type-must-contain-only-simple-signatures";

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description:
      "warns the nonstandard uses of Book that hi18n cannot properly process",
    recommended: "error",
  },
  messages: {
    "book-export-as-book": 'the book should be exported as "book"',
    "import-catalogs":
      "the catalog should be directly imported from the corresponding module.",
    "import-catalogs-as-default": "the catalog should be exported as default",
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

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): TSESLint.RuleListener {
  const tracker = bookTracker();
  tracker.listen("book", (node, captured) => {
    const exportedAs = findExportedAs(node);
    if (
      !exportedAs ||
      exportedAs.id.type !== "Identifier" ||
      exportedAs.id.name !== "book"
    ) {
      context.report({
        node,
        messageId: "book-export-as-book",
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
      if (prop.type !== "Property") {
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
      if (prop.value.type !== "Identifier") {
        context.report({
          node: prop.key,
          messageId: "import-catalogs",
        });
        continue;
      }
      const valueDef = resolveImportedVariable(
        context.getSourceCode().scopeManager!,
        prop.value
      );
      if (!valueDef) {
        context.report({
          node: prop.key,
          messageId: "import-catalogs",
        });
        continue;
      }
      if (
        valueDef.node.type === "ImportNamespaceSpecifier" ||
        valueDef.node.type === "TSImportEqualsDeclaration" ||
        getImportName(valueDef.node) !== "default"
      ) {
        context.report({
          node: valueDef.node,
          messageId: "import-catalogs-as-default",
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
    typeParam.typeName as TSESTree.Identifier
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

function findExportedAs(
  node: TSESTree.Node
): TSESTree.VariableDeclarator | null {
  if (
    !node.parent ||
    node.parent.type !== "VariableDeclarator" ||
    node.parent.init !== node
  ) {
    // Not a part of `book = new Book()`
    return null;
  }
  if (
    !node.parent.parent ||
    node.parent.parent.type !== "VariableDeclaration" ||
    !node.parent.parent.declarations.includes(node.parent)
  ) {
    // Not a part of `const book = new Book()`
    return null;
  }
  if (
    !node.parent.parent.parent ||
    node.parent.parent.parent.type !== "ExportNamedDeclaration" ||
    node.parent.parent.parent.declaration !== node.parent.parent
  ) {
    // Not a part of `export const book = new Book();`
    return null;
  }
  return node.parent;
}
