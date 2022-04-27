import type { Rule } from "eslint";
import { getImportName, getStaticKey, resolveImportedVariable } from "../util";
import { bookTracker } from "../common-trackers";

export type CatalogLink = {
  locale: string;
  catalogSource: string;
  bookFilename: string;
};
export type CollectCatalogLinksCallback = (record: CatalogLink) => void;

export const meta: Rule.RuleMetaData = {
  type: "problem",
  docs: {
    description: "an internal rule to collect links between books and catalogs",
    recommended: false,
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  if (context.options[0] === undefined) {
    throw new Error(
      "Callback not found\nNote: this rule is for an internal use."
    );
  }
  if (typeof context.options[0] !== "function")
    throw new Error("invalid callback");
  const collectCatalogLinksCallback = context
    .options[0] as CollectCatalogLinksCallback;
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
        context.getSourceCode().scopeManager,
        prop.value
      );
      if (!valueDef) return;
      if (
        valueDef.node.type === "ImportNamespaceSpecifier" ||
        getImportName(valueDef.node) !== "default"
      )
        return;
      collectCatalogLinksCallback({
        locale: key,
        catalogSource: `${valueDef.parent.source.value as string}`,
        bookFilename: context.getFilename(),
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
}
