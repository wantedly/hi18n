import type { TSESLint } from "@typescript-eslint/utils";
import { rule as ruleMigrateFromLingui } from "./rules/migrate-from-lingui.ts";
import { rule as ruleNoDynamicTranslationIds } from "./rules/no-dynamic-translation-ids.ts";
import { rule as ruleNoInvalidEscape } from "./rules/no-invalid-escape.ts";
import { rule as rulePreferMessageStyle } from "./rules/prefer-message-style.ts";
import { rule as ruleReactComponentParams } from "./rules/react-component-params.ts";
import { rule as ruleWellFormedBookDefinitions } from "./rules/well-formed-book-definitions.ts";
import { rule as ruleWellFormedBookReferences } from "./rules/well-formed-book-references.ts";
import { rule as ruleWellFormedCatalogDefinitions } from "./rules/well-formed-catalog-definitions.ts";
import type { ESLint, Linter } from "eslint";

export type Plugin = TSESLint.FlatConfig.Plugin &
  ESLint.Plugin & { configs: SharedConfigs };

export type SharedConfigs = {
  "flat/recommended": Config;
  "flat/recommended-type-checked-only": Config;
  "flat/recommended-type-checked": Config;
  recommended: LegacyConfig;
  "recommended-type-checked-only": LegacyConfig;
  "recommended-type-checked": LegacyConfig;
  /** @deprecated - please use "recommended-type-checked" instead. */
  "recommended-requiring-type-checking": LegacyConfig;
};

export type Config = TSESLint.FlatConfig.Config & Linter.Config;
export type LegacyConfig = TSESLint.ClassicConfig.Config & Linter.LegacyConfig;

// Initialize partially to build cyclic references
/** The ESLint plugin for hi18n. */
const plugin: Plugin = {} as Plugin;

const flatRecommended: Config = {
  plugins: { "@hi18n": plugin },
  rules: {
    "@hi18n/no-dynamic-translation-ids": "error",
    "@hi18n/no-invalid-escape": "error",
    "@hi18n/well-formed-book-references": "error",
    "@hi18n/well-formed-book-definitions": "error",
    "@hi18n/well-formed-catalog-definitions": "error",
  },
};

const flatRecommendedTypeCheckedOnly: Config = {
  plugins: { "@hi18n": plugin },
  rules: {
    "@hi18n/react-component-params": "error",
  },
};

const flatRecommendedTypeChecked: Config = {
  plugins: { "@hi18n": plugin },
  rules: {
    ...flatRecommended.rules,
    ...flatRecommendedTypeCheckedOnly.rules,
  },
};

const classicRecommended: LegacyConfig = {
  plugins: ["@hi18n"],
  rules: flatRecommended.rules!,
};

const classicRecommendedTypeCheckedOnly: LegacyConfig = {
  plugins: ["@hi18n"],
  rules: flatRecommendedTypeCheckedOnly.rules!,
};

const classicRecommendedTypeChecked: LegacyConfig = {
  plugins: ["@hi18n"],
  rules: flatRecommendedTypeChecked.rules!,
};

type ModifiedPluginType = Omit<TSESLint.FlatConfig.Plugin, "configs"> & {
  configs: SharedConfigs;
};

const pluginContents: ModifiedPluginType = {
  meta: {
    // TODO: copy name/version from package.json
    name: "@hi18n/eslint-plugin",
  },
  rules: {
    "migrate-from-lingui": ruleMigrateFromLingui,
    "no-dynamic-translation-ids": ruleNoDynamicTranslationIds,
    "no-invalid-escape": ruleNoInvalidEscape,
    "prefer-message-style": rulePreferMessageStyle,
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
