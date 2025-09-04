// @ts-check

import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

import baseConfig from "../../eslint.config.js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    settings: {
      react: {
        version: "19.1.1",
      },
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
];
export { config as default };
