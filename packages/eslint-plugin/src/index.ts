import type { TSESLint } from "@typescript-eslint/utils";
import * as ruleCollectBookDefinitions from "./rules/collect-book-definitions.js";
import * as ruleCollectCatalogDefinitions from "./rules/collect-catalog-definitions.js";
import * as ruleCollectTranslationIds from "./rules/collect-translation-ids.js";
import * as ruleMigrateFromLingui from "./rules/migrate-from-lingui.js";
import * as ruleNoDynamicTranslationIds from "./rules/no-dynamic-translation-ids.js";
import * as ruleNoMissingTranslationIds from "./rules/no-missing-translation-ids.js";
import * as ruleNoMissingTranslationIdsInTypes from "./rules/no-missing-translation-ids-in-types.js";
import * as ruleNoUnusedTranslationIds from "./rules/no-unused-translation-ids.js";
import * as ruleNoUnusedTranslationIdsInTypes from "./rules/no-unused-translation-ids-in-types.js";
import * as ruleReactComponentParams from "./rules/react-component-params.js";
import * as ruleWellFormedBookDefinitions from "./rules/well-formed-book-definitions.js";
import * as ruleWellFormedBookReferences from "./rules/well-formed-book-references.js";
import * as ruleWellFormedCatalogDefinitions from "./rules/well-formed-catalog-definitions.js";

export const configs: Record<string, TSESLint.Linter.Config> = {
  recommended: {
    plugins: ["@hi18n"],
    rules: {
      "@hi18n/no-dynamic-translation-ids": "error",
      "@hi18n/well-formed-book-references": "error",
      "@hi18n/well-formed-book-definitions": "error",
      "@hi18n/well-formed-catalog-definitions": "error",
    },
  },
  "recommended-requiring-type-checking": {
    rules: {
      "@hi18n/react-component-params": "error",
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
  "react-component-params": ruleReactComponentParams,
  "well-formed-book-references": ruleWellFormedBookReferences,
  "well-formed-book-definitions": ruleWellFormedBookDefinitions,
  "well-formed-catalog-definitions": ruleWellFormedCatalogDefinitions,
  "no-unused-translation-ids": ruleNoUnusedTranslationIds,
  "no-unused-translation-ids-in-types": ruleNoUnusedTranslationIdsInTypes,
} as const;

const _test: TSESLint.Linter.Plugin = { configs, rules };

export { serializedLocations, serializeReference } from "./def-location.js";
export type { DefLocation, DefReference } from "./def-location.js";
export type { BookDef, CatalogLink } from "./rules/collect-book-definitions.js";
export type { CatalogDef } from "./rules/collect-catalog-definitions.js";
export type { TranslationUsage } from "./rules/collect-translation-ids.js";
