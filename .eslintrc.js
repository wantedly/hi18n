module.exports = /** @type {import("eslint").Linter.Config} */ ({
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  // TODO: replace jest -> vitest once we have ESLint upgraded
  plugins: ["jest", "@typescript-eslint/eslint-plugin"],
  settings: {
    jest: {
      version: 29,
    },
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  reportUnusedDisableDirectives: true,
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
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
  overrides: [
    {
      files: ["*.ts"],
      excludedFiles: ["*.d.ts"],
      parser: "@typescript-eslint/parser",
      extends: [
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
    },
    {
      files: ["*.test.ts", "*.test.tsx"],
      extends: ["plugin:jest/recommended"],
    },
    {
      files: [
        "**/.eslintrc.js",
        "**/babel.config.js",
        "**/babel-esm.config.js",
      ],
      parserOptions: {
        sourceType: "script",
      },
      env: {
        node: true,
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
});
