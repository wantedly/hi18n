module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: ["plugin:node/recommended", "plugin:eslint-plugin/recommended"],
  rules: {
    "node/no-unsupported-features/es-syntax": "off",
    "node/no-missing-import": "off",
  },
  ignorePatterns: ["configs/fixtures/*.ts", "configs/fixtures/*.tsx"],
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
