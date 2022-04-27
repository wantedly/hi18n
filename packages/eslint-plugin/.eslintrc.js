module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: ["plugin:node/recommended", "plugin:eslint-plugin/recommended"],
  parserOptions: {
    project: [
      require.resolve("./tsconfig.json"),
      require.resolve("./configs/tsconfig.main.json"),
    ],
  },
  rules: {
    "node/no-unsupported-features/es-syntax": "off",
    "node/no-missing-import": "off",
  },
  overrides: [
    {
      files: ["**/*.test.ts"],
      rules: {
        "node/no-unpublished-import": "off",
        "node/no-unpublished-require": "off",
      },
    },
  ],
});
