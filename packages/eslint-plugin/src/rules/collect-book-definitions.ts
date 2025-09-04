import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getStaticKey } from "../util.js";
import { bookTracker } from "../common-trackers.js";
import {
  DefLocation,
  DefReference,
  resolveAsLocation,
} from "../def-location.js";
import { getCatalogRef } from "../book-util.js";
import { createRule } from "./create-rule.ts";

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
type Options = [];

export function getRule(cb: BookDefCallback) {
  if (typeof cb !== "function") {
    throw new Error("invalid callback");
  }
  return createRule<Options, MessageIds>({
    name: "collect-book-definitions",
    meta: {
      type: "problem",
      docs: {
        description: "an internal rule to collect book definitions",
        recommended: false,
      },
      messages: {},
      schema: [],
    },

    defaultOptions: [],

    create(context): TSESLint.RuleListener {
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

        for (const prop_ of catalogs.properties) {
          const prop = prop_ as
            | TSESTree.ObjectLiteralElement
            | TSESTree.MethodDefinition;
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
    },
  });
}
