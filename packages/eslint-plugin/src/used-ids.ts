import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { resolveAsLocation, serializedLocations } from "./def-location.js";

export function queryUsedTranslationIds<
  TMessageIds extends string,
  TOptions extends readonly unknown[]
>(
  context: Readonly<TSESLint.RuleContext<TMessageIds, TOptions>>,
  node: TSESTree.Node,
  doLookup: boolean
): string[] | undefined {
  const usedIdsMap: unknown = context.settings["@hi18n/used-translation-ids"];
  if (usedIdsMap === undefined)
    throw new Error(
      'settings["@hi18n/used-translation-ids"] not found\nNote: this rule is for an internal use.'
    );
  if (!isObject(usedIdsMap)) throw new Error("Invalid usedIds");

  const nodeLocation =
    node.type === "NewExpression"
      ? resolveAsLocation(
          context.getSourceCode().scopeManager!,
          context.getFilename(),
          node
        )
      : undefined;
  if (!nodeLocation) return undefined;

  if (doLookup) {
    const linkageMap: unknown = context.settings["@hi18n/linkage"];
    if (linkageMap === undefined)
      throw new Error(
        'settings["@hi18n/linkage"] not found\nNote: this rule is for an internal use.'
      );
    if (!isObject(linkageMap)) throw new Error("Invalid linkage map");

    for (const locPath of serializedLocations(nodeLocation)) {
      if (Object.prototype.hasOwnProperty.call(linkageMap, locPath)) {
        const linkedLocPath = linkageMap[locPath]!;
        if (typeof linkedLocPath !== "string") {
          throw new Error("Invalid linkage map");
        }
        if (Object.prototype.hasOwnProperty.call(usedIdsMap, linkedLocPath)) {
          return checkStringArray(usedIdsMap[linkedLocPath]!);
        }
      }
    }
  } else {
    for (const locPath of serializedLocations(nodeLocation)) {
      if (Object.prototype.hasOwnProperty.call(usedIdsMap, locPath)) {
        return checkStringArray(usedIdsMap[locPath]!);
      }
    }
  }
}

function checkStringArray(usedIds: unknown): string[] {
  if (
    !Array.isArray(usedIds) ||
    !usedIds.every((k): k is string => typeof k === "string")
  ) {
    throw new Error("Invalid usedIds: not an array of strings");
  }
  return usedIds;
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null;
}
