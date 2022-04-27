module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: ["plugin:node/recommended"],
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
  ignorePatterns: ["src/__fixtures__/**/*.ts"],
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
