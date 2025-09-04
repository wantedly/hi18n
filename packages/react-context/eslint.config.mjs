// @ts-check

import globals from "globals";

import baseConfig from "../../eslint.config.js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    files: ["index.js"],
    languageOptions: {
      globals: {
        ...globals.commonjs,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
export { config as default };
