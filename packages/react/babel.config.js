module.exports = {
  targets: "defaults, not ie 11, not ie_mob 11",
  presets: [
    ["@babel/preset-env", { modules: "commonjs" }],
    // Use the classic runtime until we drop support for React < 18.0
    // because in older versions they don't have "exports" in package.json
    // and it does not work well with ESM.
    // See configs/tsconfig.base.json too
    ["@babel/preset-react"],
    ["@babel/preset-typescript", { allowDeclareFields: true }],
  ],
  plugins: [
    ["@babel/plugin-transform-runtime", { version: "^7.18.3" }],
    [
      "babel-plugin-polyfill-corejs3",
      { method: "usage-pure", version: "^3.23.2" },
    ],
  ],
};
