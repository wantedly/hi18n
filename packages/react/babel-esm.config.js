module.exports = {
  extends: "./babel.config.js",
  presets: [["@babel/preset-env", { modules: false }]],
  plugins: [["replace-import-extension", { extMapping: { ".js": ".mjs" } }]],
};
