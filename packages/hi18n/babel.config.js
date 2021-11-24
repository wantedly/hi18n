module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "12" }, modules: "commonjs" }],
    ["@babel/preset-typescript", { allowDeclareFields: true }],
  ],
};
