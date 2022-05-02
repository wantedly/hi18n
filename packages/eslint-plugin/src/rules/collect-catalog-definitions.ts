// eslint-disable-next-line node/no-unpublished-import
import type { TSESLint } from "@typescript-eslint/utils";
import { catalogTracker } from "../common-trackers";
import { DefLocation, resolveAsLocation } from "../def-location";

export type CatalogDef = {
  catalogLocation: DefLocation;
};
export type CatalogDefCallback = (record: CatalogDef) => void;

type MessageIds = never;

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description: "an internal rule to collect catalog definitions",
    recommended: false,
  },
  messages: {},
  schema: {},
};

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, [CatalogDefCallback]>>
): TSESLint.RuleListener {
  if (context.options[0] === undefined) {
    throw new Error(
      "Callback not found\nNote: this rule is for an internal use."
    );
  }
  if (typeof context.options[0] !== "function")
    throw new Error("invalid callback");
  const cb = context.options[0];
  const tracker = catalogTracker();
  tracker.listen('new import("@hi18n/core").Catalog()', (node) => {
    const catalogLocation =
      node.type === "NewExpression"
        ? resolveAsLocation(
            context.getSourceCode().scopeManager!,
            context.getFilename(),
            node
          )
        : undefined;
    if (!catalogLocation) return;

    cb({
      catalogLocation,
    });
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}
