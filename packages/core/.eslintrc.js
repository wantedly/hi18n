module.exports = /** @type {import("eslint").Linter.Config} */ ({
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parserOptions: {
        project: [
          require.resolve("./tsconfig.json"),
          require.resolve("./configs/tsconfig.main.json"),
        ],
      },
    },
  ],
});
