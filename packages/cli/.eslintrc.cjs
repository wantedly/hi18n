module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: ["plugin:node/recommended"],
  rules: {
    "node/no-unsupported-features/es-syntax": "off",
    "node/no-missing-import": "off",
  },
  ignorePatterns: ["src/__fixtures__/**/*.ts", "src/__fixtures__/**/*.js"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parserOptions: {
        project: [require.resolve("./tsconfig.json")],
      },
    },
    {
      files: ["**/*.test.ts"],
      rules: {
        "node/no-unpublished-import": "off",
        "node/no-unpublished-require": "off",
      },
    },
  ],
});
