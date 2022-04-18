import type { Linter, Rule } from "eslint";
import * as ruleNoDynamicKeys from "./rules/no-dynamic-keys";
import * as ruleLocalCatalogExport from "./rules/local-catalog-export";

export const configs: Record<string, Linter.Config> = {};
export const rules: Record<string, Rule.RuleModule> = {
  "no-dynamic-keys": ruleNoDynamicKeys,
  "local-catalog-export": ruleLocalCatalogExport,
};

export { createCollectTranslationIds } from "./collect-translation-ids";
export type { TranslationUsage } from "./collect-translation-ids";
