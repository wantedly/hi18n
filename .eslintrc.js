module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint/eslint-plugin"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", {
      varsIgnorePattern: "^_",
      argsIgnorePattern: "^_",
      destructuredArrayIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    }],
  },
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      extends: ["plugin:@typescript-eslint/recommended-requiring-type-checking"],
    },
    {
      files: [
        "**/.eslintrc.js",
        "**/babel.config.js",
      ],
      parserOptions: {
        sourceType: "script",
      },
      env: {
        node: true,
      },
      extends: ["plugin:@typescript-eslint/recommended-requiring-type-checking"],
    },
  ],
});
