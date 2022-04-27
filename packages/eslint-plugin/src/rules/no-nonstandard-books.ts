import type { Rule as ruleNoNonstandardBooks } from "eslint";
import { getImportName, getStaticKey, resolveImportedVariable, resolveTypeLevelVariable, TypeDeclarator } from "../util";
import { bookTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { Node, VariableDeclarator } from "estree";
import { NewExpressionExt, TSInterfaceBody, TSSignature, TSTypeLiteral, TSTypeParameterInstantiation, TSTypeReference } from "../estree-ts";

export const meta: ruleNoNonstandardBooks.RuleMetaData = {
  type: "problem",
  docs: {
    description: "warns the nonstandard uses of Book that hi18n cannot properly process",
    recommended: true,
  },
  messages: {
    "book-export-as-book": "the book should be exported as \"book\"",
    "import-catalogs": "the catalog should be directly imported from the corresponding module.",
    "import-catalogs-as-default": "the catalog should be exported as default",
    "catalogs-should-be-object": "the first argument should be an object literal",
    "catalogs-invalid-spread": "do not use spread in the catalog list",
    "catalogs-invalid-id": "do not use dynamic translation ids for the catalog list",
    "catalog-type-must-be-type-alias": "declare catalog type as type Vocabulary = { ... }",
    "catalog-type-must-contain-only-simple-signatures": "only simple signatures are allowed",
  },
};

export function create(context: ruleNoNonstandardBooks.RuleContext): ruleNoNonstandardBooks.RuleListener {
  const tracker = bookTracker();
  tracker.listen("book", (node, captured) => {
    const exportedAs = findExportedAs(node as ruleNoNonstandardBooks.Node);
    if (!exportedAs || exportedAs.id.type !== "Identifier" || exportedAs.id.name !== "book") {
      context.report({
        node: node as Node,
        messageId: "book-export-as-book",
      });
    }

    checkTypeParameter(context, node as ruleNoNonstandardBooks.Node);

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
      const valueDef = resolveImportedVariable(context.getSourceCode().scopeManager, prop.value);
      if (!valueDef) {
        context.report({
          node: prop.key,
          messageId: "import-catalogs",
        });
        continue;
      }
      if (valueDef.node.type === "ImportNamespaceSpecifier" || getImportName(valueDef.node) !== "default") {
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
      tracker.trackImport(context, node);
    },
  };
};

function checkTypeParameter(context: ruleNoNonstandardBooks.RuleContext, node: ruleNoNonstandardBooks.Node) {
  const typeParameters = (node as NewExpressionExt).typeParameters;
  if (!typeParameters) return;

  const typeParam = findTypeParameter(node);
  if (!typeParam) {
    context.report({
      node: typeParameters as (ruleNoNonstandardBooks.Node | TSTypeParameterInstantiation) as ruleNoNonstandardBooks.Node,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  const resolved = resolveTypeLevelVariable(context.getSourceCode().scopeManager, typeParam.typeName);
  if (!resolved) {
    context.report({
      node: typeParam as (ruleNoNonstandardBooks.Node | TSTypeReference) as ruleNoNonstandardBooks.Node,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  const objinfo = extractAsObjectType(resolved);
  if (!objinfo) {
    context.report({
      node: resolved as (ruleNoNonstandardBooks.Node | TypeDeclarator) as ruleNoNonstandardBooks.Node,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  for (const signature of objinfo.signatures) {
    if (signature.type !== "TSPropertySignature") {
      context.report({
        node: signature as (ruleNoNonstandardBooks.Node | TSSignature) as ruleNoNonstandardBooks.Node,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
    if (signature.computed || signature.optional || signature.readonly) {
      context.report({
        node: signature as (ruleNoNonstandardBooks.Node | TSSignature) as ruleNoNonstandardBooks.Node,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
    const key = getStaticKey(signature);
    if (key === null) {
      context.report({
        node: signature as (ruleNoNonstandardBooks.Node | TSSignature) as ruleNoNonstandardBooks.Node,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
  }
}

export function extractAsObjectType(decl: TypeDeclarator): { body: TSInterfaceBody | TSTypeLiteral, signatures: TSSignature[] } | undefined {
  if (decl.type === "TSTypeAliasDeclaration") {
    if (decl.typeAnnotation.type === "TSTypeLiteral") {
      return {
        body: decl.typeAnnotation,
        signatures: decl.typeAnnotation.members,
      };
    }
  } else if (decl.type === "TSInterfaceDeclaration") {
    return {
      body: decl.body,
      signatures: decl.body.body,
    };
  }
  return undefined;
}

export function findTypeParameter(node: ruleNoNonstandardBooks.Node): TSTypeReference | null {
  if (node.type !== "NewExpression") return null;
  const typeParameters = (node as NewExpressionExt).typeParameters;
  if (!typeParameters) return null;
  if (typeParameters.type !== "TSTypeParameterInstantiation") return null;
  if (typeParameters.params.length < 1) return null;
  const typeParam = typeParameters.params[0]!;
  if (typeParam.type !== "TSTypeReference") return null;
  return typeParam;
}

function findExportedAs(node: ruleNoNonstandardBooks.Node): (VariableDeclarator & ruleNoNonstandardBooks.NodeParentExtension) | null {
  if (node.parent.type !== "VariableDeclarator" || node.parent.init !== node) {
    // Not a part of `book = new Book()`
    return null;
  }
  if (node.parent.parent.type !== "VariableDeclaration" || !node.parent.parent.declarations.includes(node.parent)) {
    // Not a part of `const book = new Book()`
    return null;
  }
  if (node.parent.parent.parent.type !== "ExportNamedDeclaration" || node.parent.parent.parent.declaration !== node.parent.parent) {
    // Not a part of `export const book = new Book();`
    return null;
  }
  return node.parent;
}
