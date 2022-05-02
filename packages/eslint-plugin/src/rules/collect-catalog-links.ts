// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getImportName, getStaticKey, resolveImportedVariable } from "../util";
import { bookTracker } from "../common-trackers";

export type CatalogLink = {
  locale: string;
  catalogSource: string;
  bookFilename: string;
};
export type CollectCatalogLinksCallback = (record: CatalogLink) => void;

type MessageIds = never;

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description: "an internal rule to collect links between books and catalogs",
    recommended: false,
  },
  messages: {},
  schema: {},
};

export function create(
  context: Readonly<
    TSESLint.RuleContext<MessageIds, [CollectCatalogLinksCallback]>
  >
): TSESLint.RuleListener {
  if (context.options[0] === undefined) {
    throw new Error(
      "Callback not found\nNote: this rule is for an internal use."
    );
  }
  if (typeof context.options[0] !== "function")
    throw new Error("invalid callback");
  const collectCatalogLinksCallback = context.options[0];
  const tracker = bookTracker();
  tracker.listen("book", (_node, captured) => {
    const catalogs = captured["catalogs"]!;
    if (catalogs.type !== "ObjectExpression") {
      return;
    }
    for (const prop of catalogs.properties) {
      if (prop.type !== "Property") continue;
      const key = getStaticKey(prop);
      if (key === null) continue;
      if (prop.value.type !== "Identifier") continue;
      const valueDef = resolveImportedVariable(
        context.getSourceCode().scopeManager!,
        prop.value
      );
      if (!valueDef) return;
      if (
        valueDef.node.type === "ImportNamespaceSpecifier" ||
        valueDef.node.type === "TSImportEqualsDeclaration" ||
        getImportName(valueDef.node) !== "default"
      )
        return;
      collectCatalogLinksCallback({
        locale: key,
        catalogSource: (valueDef.parent as TSESTree.ImportDeclaration).source
          .value,
        bookFilename: context.getFilename(),
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}
