import type { Rule } from "eslint";
import { getImportName, getStaticKey, resolveImportedVariable, resolveTypeLevelVariable, TypeDeclarator } from "../util";
import { messageCatalogTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";
import { Node, VariableDeclarator } from "estree";
import { NewExpressionExt, TSInterfaceBody, TSSignature, TSTypeLiteral, TSTypeParameterInstantiation, TSTypeReference } from "../estree-ts";

export type CatalogLink = {
  locale: string;
  localCatalogSource: string;
  catalogFilename: string;
};
export type CollectCatalogLinksCallback = (record: CatalogLink) => void;

export const meta: Rule.RuleMetaData = {
  type: "problem",
  docs: {
    description: "warns the nonstandard uses of MessageCatalog that hi18n cannot properly process",
    recommended: true,
  },
  messages: {
    "catalog-export-as-catalog": "the catalog should be exported as \"catalog\"",
    "import-local-catalogs": "the local catalog should be directly imported from the corresponding module.",
    "import-local-catalogs-as-default": "the local catalog should be exported as default",
    "local-catalogs-should-be-object": "the first argument should be an object literal",
    "local-catalogs-invalid-spread": "do not use spread in the catalog list",
    "local-catalogs-invalid-key": "do not use dynamic keys for the catalog list",
    "catalog-type-must-be-type-alias": "declare catalog type as type Messages = { ... }",
    "catalog-type-must-contain-only-simple-signatures": "only simple signatures are allowed",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = messageCatalogTracker();
  tracker.listen("messageCatalog", (node, captured) => {
    const exportedAs = findExportedAs(node as Rule.Node);
    if (!exportedAs || exportedAs.id.type !== "Identifier" || exportedAs.id.name !== "catalog") {
      context.report({
        node: node as Node,
        messageId: "catalog-export-as-catalog",
      });
    }

    checkTypeParameter(context, node as Rule.Node);

    const localCatalogs = captured["localCatalogs"]!;
    if (localCatalogs.type !== "ObjectExpression") {
      context.report({
        node: capturedRoot(localCatalogs),
        messageId: "local-catalogs-should-be-object",
      });
      return;
    }
    for (const prop of localCatalogs.properties) {
      if (prop.type !== "Property") {
        context.report({
          node: prop,
          messageId: "local-catalogs-invalid-spread",
        });
        continue;
      }
      const key = getStaticKey(prop);
      if (key === null) {
        context.report({
          node: prop.key,
          messageId: "local-catalogs-invalid-key",
        });
        continue;
      }
      if (prop.value.type !== "Identifier") {
        context.report({
          node: prop.key,
          messageId: "import-local-catalogs",
        });
        continue;
      }
      const valueDef = resolveImportedVariable(context.getSourceCode().scopeManager, prop.value);
      if (!valueDef) {
        context.report({
          node: prop.key,
          messageId: "import-local-catalogs",
        });
        continue;
      }
      if (valueDef.node.type === "ImportNamespaceSpecifier" || getImportName(valueDef.node) !== "default") {
        context.report({
          node: valueDef.node,
          messageId: "import-local-catalogs-as-default",
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

function checkTypeParameter(context: Rule.RuleContext, node: Rule.Node) {
  const typeParameters = (node as NewExpressionExt).typeParameters;
  if (!typeParameters) return;

  const typeParam = findTypeParameter(node);
  if (!typeParam) {
    context.report({
      node: typeParameters as (Rule.Node | TSTypeParameterInstantiation) as Rule.Node,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  const resolved = resolveTypeLevelVariable(context.getSourceCode().scopeManager, typeParam.typeName);
  if (!resolved) {
    context.report({
      node: typeParam as (Rule.Node | TSTypeReference) as Rule.Node,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  const objinfo = extractAsObjectType(resolved);
  if (!objinfo) {
    context.report({
      node: resolved as (Rule.Node | TypeDeclarator) as Rule.Node,
      messageId: "catalog-type-must-be-type-alias",
    });
    return;
  }
  for (const signature of objinfo.signatures) {
    if (signature.type !== "TSPropertySignature") {
      context.report({
        node: signature as (Rule.Node | TSSignature) as Rule.Node,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
    if (signature.computed || signature.optional || signature.readonly) {
      context.report({
        node: signature as (Rule.Node | TSSignature) as Rule.Node,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
    const key = getStaticKey(signature);
    if (key === null) {
      context.report({
        node: signature as (Rule.Node | TSSignature) as Rule.Node,
        messageId: "catalog-type-must-contain-only-simple-signatures",
      });
      continue;
    }
  }
}

function extractAsObjectType(decl: TypeDeclarator): { body: TSInterfaceBody | TSTypeLiteral, signatures: TSSignature[] } | undefined {
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

function findTypeParameter(node: Rule.Node): TSTypeReference | null {
  if (node.type !== "NewExpression") return null;
  const typeParameters = (node as NewExpressionExt).typeParameters;
  if (!typeParameters) return null;
  if (typeParameters.type !== "TSTypeParameterInstantiation") return null;
  if (typeParameters.params.length < 1) return null;
  const typeParam = typeParameters.params[0]!;
  if (typeParam.type !== "TSTypeReference") return null;
  return typeParam;
}

function findExportedAs(node: Rule.Node): (VariableDeclarator & Rule.NodeParentExtension) | null {
  if (node.parent.type !== "VariableDeclarator" || node.parent.init !== node) {
    // Not a part of `catalog = new MessageCatalog()`
    return null;
  }
  if (node.parent.parent.type !== "VariableDeclaration" || !node.parent.parent.declarations.includes(node.parent)) {
    // Not a part of `const catalog = new MessageCatalog()`
    return null;
  }
  if (node.parent.parent.parent.type !== "ExportNamedDeclaration" || node.parent.parent.parent.declaration !== node.parent.parent) {
    // Not a part of `export const catalog = new MessageCatalog();`
    return null;
  }
  return node.parent;
}
