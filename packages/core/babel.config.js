module.exports = {
  presets: [
    [
      "@babel/preset-env",
      { targets: "defaults, not ie 11, not ie_mob 11", modules: "commonjs" },
    ],
    ["@babel/preset-typescript", { allowDeclareFields: true }],
  ],
  plugins: [
    ["@babel/plugin-transform-runtime", { corejs: 3, version: "^7.17.9" }],
  ],
};
