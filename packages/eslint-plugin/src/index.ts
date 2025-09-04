import type { TSESLint } from "@typescript-eslint/utils";
import { rule as ruleMigrateFromLingui } from "./rules/migrate-from-lingui.js";
import { rule as ruleNoDynamicTranslationIds } from "./rules/no-dynamic-translation-ids.js";
import { rule as ruleReactComponentParams } from "./rules/react-component-params.js";
import { rule as ruleWellFormedBookDefinitions } from "./rules/well-formed-book-definitions.js";
import { rule as ruleWellFormedBookReferences } from "./rules/well-formed-book-references.js";
import { rule as ruleWellFormedCatalogDefinitions } from "./rules/well-formed-catalog-definitions.js";

export type Plugin = {
  meta: {
    name: string;
    version?: string;
  };
  rules: {
    "migrate-from-lingui": typeof ruleMigrateFromLingui;
    "no-dynamic-translation-ids": typeof ruleNoDynamicTranslationIds;
    "react-component-params": typeof ruleReactComponentParams;
    "well-formed-book-references": typeof ruleWellFormedBookReferences;
    "well-formed-book-definitions": typeof ruleWellFormedBookDefinitions;
    "well-formed-catalog-definitions": typeof ruleWellFormedCatalogDefinitions;
  };
  configs: SharedConfigs;
};

export type SharedConfigs = {
  "flat/recommended": TSESLint.FlatConfig.Config;
  "flat/recommended-type-checked-only": TSESLint.FlatConfig.Config;
  "flat/recommended-type-checked": TSESLint.FlatConfig.Config;
  recommended: TSESLint.ClassicConfig.Config;
  "recommended-type-checked-only": TSESLint.ClassicConfig.Config;
  "recommended-type-checked": TSESLint.ClassicConfig.Config;
  /** @deprecated - please use "recommended-type-checked" instead. */
  "recommended-requiring-type-checking": TSESLint.ClassicConfig.Config;
};

/** Initialize partially to build cyclic references */
const plugin: Plugin = {} as Plugin;

const flatRecommended: TSESLint.FlatConfig.Config = {
  plugins: { "@hi18n": plugin },
  rules: {
    "@hi18n/no-dynamic-translation-ids": "error",
    "@hi18n/well-formed-book-references": "error",
    "@hi18n/well-formed-book-definitions": "error",
    "@hi18n/well-formed-catalog-definitions": "error",
  },
};

const flatRecommendedTypeCheckedOnly: TSESLint.FlatConfig.Config = {
  plugins: { "@hi18n": plugin },
  rules: {
    "@hi18n/react-component-params": "error",
  },
};

const flatRecommendedTypeChecked: TSESLint.FlatConfig.Config = {
  plugins: { "@hi18n": plugin },
  rules: {
    ...flatRecommended.rules,
    ...flatRecommendedTypeCheckedOnly.rules,
  },
};

const classicRecommended: TSESLint.ClassicConfig.Config = {
  plugins: ["@hi18n"],
  rules: flatRecommended.rules!,
};

const classicRecommendedTypeCheckedOnly: TSESLint.ClassicConfig.Config = {
  plugins: ["@hi18n"],
  rules: flatRecommendedTypeCheckedOnly.rules!,
};

const classicRecommendedTypeChecked: TSESLint.ClassicConfig.Config = {
  plugins: ["@hi18n"],
  rules: flatRecommendedTypeChecked.rules!,
};

const pluginContents: Plugin = {
  meta: {
    // TODO: copy name/version from package.json
    name: "@hi18n/eslint-plugin",
  },
  rules: {
    "migrate-from-lingui": ruleMigrateFromLingui,
    "no-dynamic-translation-ids": ruleNoDynamicTranslationIds,
    "react-component-params": ruleReactComponentParams,
    "well-formed-book-references": ruleWellFormedBookReferences,
    "well-formed-book-definitions": ruleWellFormedBookDefinitions,
    "well-formed-catalog-definitions": ruleWellFormedCatalogDefinitions,
  },
  configs: {
    "flat/recommended": flatRecommended,
    "flat/recommended-type-checked-only": flatRecommendedTypeCheckedOnly,
    "flat/recommended-type-checked": flatRecommendedTypeChecked,
    recommended: classicRecommended,
    "recommended-type-checked-only": classicRecommendedTypeCheckedOnly,
    "recommended-type-checked": classicRecommendedTypeChecked,
    "recommended-requiring-type-checking": classicRecommendedTypeChecked,
  },
};

Object.assign(plugin, pluginContents);

export { plugin as default };
