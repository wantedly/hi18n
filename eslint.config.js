// @ts-check
import js from "@eslint/js";
import globals from "globals";
import jest from "eslint-plugin-jest";
import ts from "typescript-eslint";
// @ts-expect-error probably package.json issue
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  js.configs.recommended,
  ...ts.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      // TODO: replace jest -> vitest once we have ESLint upgraded
      jest,
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },

    settings: {
      jest: {
        version: 29,
      },
      node: {
        version: ">= 18.0.0",
      },
    },

    rules: {
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],

      "no-constant-condition": [
        "error",
        {
          checkLoops: false,
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  ...ts.configs.recommendedTypeChecked.map((config) => ({
    files: ["**/*.ts"],
    ignores: ["**/*.d.ts"],
    ...config,

    languageOptions: {
      parser: tsParser,
    },
  })),
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    ...jest.configs["flat/recommended"],
  },
  {
    files: ["**/eslint.config.js"],

    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: 5,
      sourceType: "commonjs",
    },

    settings: {
      node: {
        version: ">= 22.0.0",
      },
    },

    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];
export { config as default };
