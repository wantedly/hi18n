module.exports = /** @type {import("eslint").Linter.Config} */ ({
  overrides: [
    {
      files: ["index.js"],
      env: { commonjs: true },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
});
