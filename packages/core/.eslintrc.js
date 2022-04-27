module.exports = /** @type {import("eslint").Linter.Config} */ ({
  parserOptions: {
    project: [
      require.resolve("./tsconfig.json"),
      require.resolve("./configs/tsconfig.main.json"),
    ],
  },
});
