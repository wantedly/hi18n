module.exports = /** @type {import("eslint").Linter.Config} */ ({
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["jest", "@typescript-eslint/eslint-plugin"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  reportUnusedDisableDirectives: true,
  rules: {
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
      parser: "@typescript-eslint/parser",
      extends: [
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
    },
    {
      files: ["*.test.ts"],
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
