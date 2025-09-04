import { ESLintUtils } from "@typescript-eslint/utils";

export type PluginDocs = {
  recommended: boolean;
};

export const createRule = ESLintUtils.RuleCreator<PluginDocs>(
  (name) =>
    `https://github.com/wantedly/hi18n/blob/master/packages/eslint-plugin/src/rules/${name}.ts`
);
