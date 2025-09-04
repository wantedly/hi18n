// @ts-check

import n from "eslint-plugin-n";

import baseConfig from "../../eslint.config.js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  n.configs["flat/recommended"],
  ...n.configs["flat/mixed-esm-and-cjs"],
  {
    rules: {
      "node/no-missing-import": "off",
      "node/no-unsupported-features/es-syntax": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: [new URL(import.meta.resolve("./tsconfig.json")).pathname],
      },
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "node/no-unpublished-import": "off",
      "node/no-unpublished-require": "off",
    },
  },
  {
    files: ["**/eslint.config.js"],

    settings: {
      node: {
        version: ">= 22.0.0",
      },
    },
  },
];
export { config as default };
