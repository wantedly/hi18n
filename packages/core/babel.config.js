module.exports = {
  targets: "defaults, not ie 11, not ie_mob 11",
  presets: [
    ["@babel/preset-env", { modules: "commonjs" }],
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
