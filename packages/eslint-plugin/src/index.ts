import type { Linter, Rule } from "eslint";
import * as ruleCollectCatalogLinks from "./rules/collect-catalog-links";
import * as ruleCollectTranslationIds from "./rules/collect-translation-ids";
import * as ruleNoDynamicKeys from "./rules/no-dynamic-keys";
import * as ruleNoMissingTranslationIds from "./rules/no-missing-translation-ids";
import * as ruleNoNonstandardCatalogReferences from "./rules/no-nonstandard-catalog-references";
import * as ruleNoNonstandardCatalogs from "./rules/no-nonstandard-catalogs";
import * as ruleNoNonstandardLocalCatalogs from "./rules/no-nonstandard-local-catalogs";
import * as ruleNoUnusedTranslationIds from "./rules/no-unused-translation-ids";
import * as ruleNoUnusedTranslationIdsInTypes from "./rules/no-unused-translation-ids-in-types";

type RuleName =
  | "collect-catalog-links"
  | "collect-translation-ids"
  | "no-dynamic-keys"
  | "no-missing-translation-ids"
  | "no-nonstandard-catalog-references"
  | "no-nonstandard-catalogs"
  | "no-nonstandard-local-catalogs"
  | "no-unused-translation-ids"
  | "no-unused-translation-ids-in-types";

export const configs: Record<string, Linter.Config> = {};
export const rules: Record<RuleName, Rule.RuleModule> = {
  "collect-catalog-links": ruleCollectCatalogLinks,
  "collect-translation-ids": ruleCollectTranslationIds,
  "no-dynamic-keys": ruleNoDynamicKeys,
  "no-missing-translation-ids": ruleNoMissingTranslationIds,
  "no-nonstandard-catalog-references": ruleNoNonstandardCatalogReferences,
  "no-nonstandard-catalogs": ruleNoNonstandardCatalogs,
  "no-nonstandard-local-catalogs": ruleNoNonstandardLocalCatalogs,
  "no-unused-translation-ids": ruleNoUnusedTranslationIds,
  "no-unused-translation-ids-in-types": ruleNoUnusedTranslationIdsInTypes,
};

export type { TranslationUsage } from "./rules/collect-translation-ids";
export type { CatalogLink } from "./rules/collect-catalog-links";
