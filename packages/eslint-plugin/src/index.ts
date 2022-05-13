import type { TSESLint } from "@typescript-eslint/utils";
import * as ruleCollectBookDefinitions from "./rules/collect-book-definitions";
import * as ruleCollectCatalogDefinitions from "./rules/collect-catalog-definitions";
import * as ruleCollectTranslationIds from "./rules/collect-translation-ids";
import * as ruleMigrateFromLingui from "./rules/migrate-from-lingui";
import * as ruleNoDynamicTranslationIds from "./rules/no-dynamic-translation-ids";
import * as ruleNoMissingTranslationIds from "./rules/no-missing-translation-ids";
import * as ruleNoMissingTranslationIdsInTypes from "./rules/no-missing-translation-ids-in-types";
import * as ruleNoUnusedTranslationIds from "./rules/no-unused-translation-ids";
import * as ruleNoUnusedTranslationIdsInTypes from "./rules/no-unused-translation-ids-in-types";
import * as ruleWellFormedBookDefinitions from "./rules/well-formed-book-definitions";
import * as ruleWellFormedBookReferences from "./rules/well-formed-book-references";
import * as ruleWellFormedCatalogDefinitions from "./rules/well-formed-catalog-definitions";

export const configs: Record<string, TSESLint.Linter.Config> = {
  recommended: {
    rules: {
      "@hi18n/no-dynamic-translation-ids": "error",
      "@hi18n/well-formed-book-references": "error",
      "@hi18n/well-formed-book-definitions": "error",
      "@hi18n/well-formed-catalog-definitions": "error",
    },
  },
};

export const rules = {
  "collect-book-definitions": ruleCollectBookDefinitions,
  "collect-catalog-definitions": ruleCollectCatalogDefinitions,
  "collect-translation-ids": ruleCollectTranslationIds,
  "migrate-from-lingui": ruleMigrateFromLingui,
  "no-dynamic-translation-ids": ruleNoDynamicTranslationIds,
  "no-missing-translation-ids": ruleNoMissingTranslationIds,
  "no-missing-translation-ids-in-types": ruleNoMissingTranslationIdsInTypes,
  "well-formed-book-references": ruleWellFormedBookReferences,
  "well-formed-book-definitions": ruleWellFormedBookDefinitions,
  "well-formed-catalog-definitions": ruleWellFormedCatalogDefinitions,
  "no-unused-translation-ids": ruleNoUnusedTranslationIds,
  "no-unused-translation-ids-in-types": ruleNoUnusedTranslationIdsInTypes,
} as const;

const _test: TSESLint.Linter.Plugin = { configs, rules };

export { serializedLocations, serializeReference } from "./def-location";
export type { DefLocation, DefReference } from "./def-location";
export type { BookDef, CatalogLink } from "./rules/collect-book-definitions";
export type { CatalogDef } from "./rules/collect-catalog-definitions";
export type { TranslationUsage } from "./rules/collect-translation-ids";
