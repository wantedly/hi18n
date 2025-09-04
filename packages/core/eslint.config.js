// @ts-check

import baseConfig from "../../eslint.config.js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: [new URL(import.meta.resolve("./tsconfig.json")).pathname],
      },
    },
  },
];
export { config as default };
