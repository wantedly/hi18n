import { ESLintUtils } from "@typescript-eslint/utils";

export type PluginDocs = {
  recommended: boolean;
};

export type CreateRuleType = <
  Options extends readonly unknown[],
  MessageIds extends string,
>({
  meta,
  name,
  ...rule
}: Readonly<
  ESLintUtils.RuleWithMetaAndName<Options, MessageIds, PluginDocs>
>) => ESLintUtils.RuleModule<
  MessageIds,
  Options,
  PluginDocs,
  ESLintUtils.RuleListener
>;

export const createRule: CreateRuleType = ESLintUtils.RuleCreator<PluginDocs>(
  (name) =>
    `https://github.com/wantedly/hi18n/blob/master/packages/eslint-plugin/src/rules/${name}.ts`,
);
