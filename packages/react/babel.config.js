module.exports = {
  presets: [
    [
      "@babel/preset-env",
      { targets: "defaults, not ie 11, not ie_mob 11", modules: "commonjs" },
    ],
    // Use the classic runtime until we drop support for React < 18.0
    // because in older versions they don't have "exports" in package.json
    // and it does not work well with ESM.
    // See configs/tsconfig.base.json too
    ["@babel/preset-react"],
    ["@babel/preset-typescript", { allowDeclareFields: true }],
  ],
  plugins: [
    ["@babel/plugin-transform-runtime", { corejs: 3, version: "^7.17.9" }],
  ],
};
