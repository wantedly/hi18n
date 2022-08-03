import type { TSESLint } from "@typescript-eslint/utils";
import { getStaticKey } from "../util";
import { bookTracker } from "../common-trackers";
import { DefLocation, DefReference, resolveAsLocation } from "../def-location";
import { getCatalogRef } from "../book-util";

export type BookDef = {
  bookLocation: DefLocation;
  catalogLinks: CatalogLink[];
};
export type CatalogLink = {
  locale: string;
  catalogLocation: DefReference;
};
export type BookDefCallback = (record: BookDef) => void;

type MessageIds = never;

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description: "an internal rule to collect book definitions",
    recommended: false,
  },
  messages: {},
  schema: {},
};

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, [BookDefCallback]>>
): TSESLint.RuleListener {
  if (context.options[0] === undefined) {
    throw new Error(
      "Callback not found\nNote: this rule is for an internal use."
    );
  }
  if (typeof context.options[0] !== "function")
    throw new Error("invalid callback");
  const cb = context.options[0];
  const tracker = bookTracker();
  tracker.listen("book", (node, captured) => {
    const catalogs = captured["catalogs"]!;
    if (catalogs.type !== "ObjectExpression") {
      return;
    }
    const bookLocation =
      node.type === "NewExpression"
        ? resolveAsLocation(
            context.getSourceCode().scopeManager!,
            context.getFilename(),
            node
          )
        : undefined;
    if (!bookLocation) return;

    const catalogLinks: CatalogLink[] = [];

    for (const prop of catalogs.properties) {
      if (prop.type !== "Property" && prop.type !== "MethodDefinition") {
        continue;
      }
      const key = getStaticKey(prop);
      if (key === null) continue;
      const catalogLocation = getCatalogRef(
        context.getSourceCode().scopeManager!,
        context.getFilename(),
        prop
      );
      if (!catalogLocation) continue;
      catalogLinks.push({
        locale: key,
        catalogLocation,
      });
    }
    cb({
      bookLocation,
      catalogLinks,
    });
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}
