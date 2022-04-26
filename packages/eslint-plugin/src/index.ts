import type { Linter, Rule } from "eslint";
import * as ruleCollectCatalogLinks from "./rules/collect-catalog-links";
import * as ruleCollectTranslationIds from "./rules/collect-translation-ids";
import * as ruleNoDynamicTranslationIds from "./rules/no-dynamic-translation-ids";
import * as ruleNoMissingTranslationIds from "./rules/no-missing-translation-ids";
import * as ruleNoMissingTranslationIdsInTypes from "./rules/no-missing-translation-ids-in-types";
import * as ruleNoNonstandardBookReferences from "./rules/no-nonstandard-book-references";
import * as ruleNoNonstandardBooks from "./rules/no-nonstandard-books";
import * as ruleNoNonstandardCatalogs from "./rules/no-nonstandard-catalogs";
import * as ruleNoUnusedTranslationIds from "./rules/no-unused-translation-ids";
import * as ruleNoUnusedTranslationIdsInTypes from "./rules/no-unused-translation-ids-in-types";

type RuleName =
  | "collect-catalog-links"
  | "collect-translation-ids"
  | "no-dynamic-translation-ids"
  | "no-missing-translation-ids"
  | "no-missing-translation-ids-in-types"
  | "no-nonstandard-book-references"
  | "no-nonstandard-books"
  | "no-nonstandard-catalogs"
  | "no-unused-translation-ids"
  | "no-unused-translation-ids-in-types";

export const configs: Record<string, Linter.Config> = {
  recommended: {
    rules: {
      "@hi18n/no-dynamic-translation-ids": "error",
      "@hi18n/no-nonstandard-book-references": "error",
      "@hi18n/no-nonstandard-books": "error",
      "@hi18n/no-nonstandard-catalogs": "error",
    },
  },
};
export const rules: Record<RuleName, Rule.RuleModule> = {
  "collect-catalog-links": ruleCollectCatalogLinks,
  "collect-translation-ids": ruleCollectTranslationIds,
  "no-dynamic-translation-ids": ruleNoDynamicTranslationIds,
  "no-missing-translation-ids": ruleNoMissingTranslationIds,
  "no-missing-translation-ids-in-types": ruleNoMissingTranslationIdsInTypes,
  "no-nonstandard-book-references": ruleNoNonstandardBookReferences,
  "no-nonstandard-books": ruleNoNonstandardBooks,
  "no-nonstandard-catalogs": ruleNoNonstandardCatalogs,
  "no-unused-translation-ids": ruleNoUnusedTranslationIds,
  "no-unused-translation-ids-in-types": ruleNoUnusedTranslationIdsInTypes,
};

export type { TranslationUsage } from "./rules/collect-translation-ids";
export type { CatalogLink } from "./rules/collect-catalog-links";
