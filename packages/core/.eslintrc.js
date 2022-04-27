module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: ["../../.eslintrc.js"],
  parserOptions: {
    project: [
      require.resolve("./tsconfig.json"),
      require.resolve("./configs/tsconfig.main.json"),
    ],
  },
});
