// @ts-check
import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import jest from "eslint-plugin-jest";
import ts from "typescript-eslint";
// @ts-expect-error probably package.json issue
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import n from "eslint-plugin-n";
import eslintEslint from "eslint-plugin-eslint-plugin";

const dirname = new URL(".", import.meta.url).pathname;

export default defineConfig([
  {
    extends: [
      js.configs.recommended,
      ts.configs.recommended,
      n.configs["flat/recommended"],
      n.configs["flat/mixed-esm-and-cjs"],
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      {
        plugins: {
          "react-hooks": reactHooks,
        },
        rules: reactHooks.configs.recommended.rules,
      },
    ],
  },
  {
    files: ["packages/eslint-plugin/**"],
    extends: [eslintEslint.configs.recommended],
  },
  globalIgnores([".yarn", "**/dist", "**/src/__fixtures__/**/*"]),
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
      react: {
        version: "19.1.1",
      },
    },
  },
  {
    files: ["**/*.ts"],
    ignores: ["**/*.d.ts"],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js"],
          tsconfigRootDir: dirname,
        },
      },
    },

    extends: ts.configs.recommendedTypeChecked,
  },
  {
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

      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",

      "n/no-missing-import": "off",
      "n/no-unsupported-features/es-syntax": "off",
    },
  },
  {
    files: ["**/*.test.@(js|ts|cjs|cts|mjs|mts|jsx|tsx)"],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },

    rules: {
      "node/no-unpublished-import": "off",
      "node/no-unpublished-require": "off",
    },

    extends: [jest.configs["flat/recommended"]],
  },
  {
    files: ["eslint.config.js"],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },

    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
  {
    files: [
      "**/*.@(cjs|cts)",
      "packages/react-context/index.*",
      "**/cjs/wrapper.*",
    ],

    languageOptions: {
      globals: {
        ...globals.commonjs,
      },
      sourceType: "commonjs",
    },

    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/bin/hi18n.cjs"],
    rules: {
      // Ignoring it for now
      "n/no-unpublished-bin": "off",
    },
  },
  {
    extends: [eslintConfigPrettier],
  },
]);
