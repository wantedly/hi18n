import type { TSESLint } from "@typescript-eslint/utils";
import { catalogTracker, getCatalogData } from "../common-trackers.js";
import { DefLocation, resolveAsLocation } from "../def-location.js";
import { CaptureMap } from "../tracker.js";
import { getStaticKey } from "../util.js";
import { createRule } from "./create-rule.ts";

export type CatalogDef = {
  locale?: string | undefined;
  catalogLocation: DefLocation;
  messages: Record<string, MessageDef>;
};
export type MessageDef = {
  value: string;
};
export type CatalogDefCallback = (record: CatalogDef) => void;

export type Options = {
  requestMessages?: boolean | undefined;
};
export type OptionList = [Options?];

type MessageIds = never;

export function getRule(cb: CatalogDefCallback) {
  if (typeof cb !== "function") {
    throw new Error("invalid callback");
  }
  return createRule<OptionList, MessageIds>({
    name: "collect-catalog-definitions",
    meta: {
      type: "problem",
      docs: {
        description: "an internal rule to collect catalog definitions",
        recommended: false,
      },
      messages: {},
      schema: [
        {
          type: "object",
          properties: {
            requestMessages: {
              type: "boolean",
              default: false,
            },
          },
        },
      ],
    },
    defaultOptions: [],
    create(context): TSESLint.RuleListener {
      const tracker = catalogTracker();
      tracker.listen(
        'new import("@hi18n/core").Catalog()',
        (node, captured) => {
          const catalogLocation =
            node.type === "NewExpression"
              ? resolveAsLocation(
                  context.getSourceCode().scopeManager!,
                  context.getFilename(),
                  node,
                )
              : undefined;
          if (!catalogLocation) return;

          let locale: string | undefined = undefined;
          const localeNode = captured["locale"]!;
          if (
            localeNode.type === "Literal" &&
            typeof localeNode.value === "string"
          ) {
            locale = localeNode.value;
          }

          const messages: Record<string, MessageDef> = context.options[0]
            ?.requestMessages
            ? getMessages(captured)
            : {};

          cb({
            locale,
            catalogLocation,
            messages,
          });
        },
      );
      return {
        ImportDeclaration(node) {
          tracker.trackImport(context.getSourceCode().scopeManager!, node);
        },
      };
    },
  });

  function getMessages(captured: CaptureMap): Record<string, MessageDef> {
    const catalogData = getCatalogData(captured);
    if (catalogData.type !== "ObjectExpression") return {};

    const messages: Record<string, MessageDef> = {};

    for (const prop of catalogData.properties) {
      if (prop.type !== "Property") continue;
      const key = getStaticKey(prop);
      if (key === null) continue;

      let value: string;
      if (
        prop.value.type === "Literal" &&
        typeof prop.value.value === "string"
      ) {
        // key: "..."
        value = prop.value.value;
      } else if (
        prop.value.type === "CallExpression" &&
        prop.value.arguments.length === 1
      ) {
        // key: msg("...")
        const arg = prop.value.arguments[0]!;
        if (arg.type === "Literal" && typeof arg.value === "string") {
          value = arg.value;
        } else {
          continue;
        }
      } else {
        continue;
      }

      messages[key] = { value };
    }
    return messages;
  }
}
