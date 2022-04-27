module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: ["../../.eslintrc.js", "plugin:react/recommended", "plugin:react/jsx-runtime", "plugin:react-hooks/recommended"],
  parserOptions: {
    project: [
      require.resolve("./tsconfig.json"),
      require.resolve("./configs/tsconfig.main.json"),
    ],
  },
  settings: {
    react: {
      version: "17.0.2",
    }
  },
});
