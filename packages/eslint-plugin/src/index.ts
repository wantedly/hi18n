import type { Linter, Rule } from "eslint";
import * as ruleNoDynamicKeys from "./rules/no-dynamic-keys";
import * as ruleLocalCatalogExport from "./rules/local-catalog-export";
import * as ruleNoMissingTranslationIds from "./rules/no-missing-translation-ids";
import * as ruleNoUnusedTranslationIds from "./rules/no-unused-translation-ids";

type RuleName =
  | "local-catalog-export"
  | "no-dynamic-keys"
  | "no-missing-translation-ids"
  | "no-unused-translation-ids";

export const configs: Record<string, Linter.Config> = {};
export const rules: Record<RuleName, Rule.RuleModule> = {
  "local-catalog-export": ruleLocalCatalogExport,
  "no-dynamic-keys": ruleNoDynamicKeys,
  "no-missing-translation-ids": ruleNoMissingTranslationIds,
  "no-unused-translation-ids": ruleNoUnusedTranslationIds,
};

export { createCollectTranslationIds } from "./collect-translation-ids";
export type { TranslationUsage } from "./collect-translation-ids";
export { createFindCatalogLinks } from "./find-catalog-links";
export type { CatalogLink } from "./find-catalog-links";
