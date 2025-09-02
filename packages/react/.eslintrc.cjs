module.exports = /** @type {import("eslint").Linter.Config} */ ({
  extends: [
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  settings: {
    react: {
      version: "17.0.2",
    },
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parserOptions: {
        project: [require.resolve("./tsconfig.json")],
      },
    },
  ],
});
