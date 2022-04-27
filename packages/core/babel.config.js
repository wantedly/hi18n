module.exports = {
  presets: [
    ["@babel/preset-env", { modules: "commonjs" }],
    ["@babel/preset-typescript", { allowDeclareFields: true }],
  ],
  plugins: [
    ["@babel/plugin-transform-runtime", { corejs: 3, version: "^7.17.9" }],
  ],
};
