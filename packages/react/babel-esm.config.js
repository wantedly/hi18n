module.exports = {
  extends: "./babel.config.js",
  presets: [
    [
      "@babel/preset-env",
      { targets: "defaults, not ie 11, not ie_mob 11", modules: false },
    ],
  ],
  plugins: [["replace-import-extension", { extMapping: { ".js": ".mjs" } }]],
};
