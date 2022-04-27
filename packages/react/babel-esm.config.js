const config = require("./babel.config");

module.exports = {
  ...config,
  presets: config.presets.map((preset) =>
    preset[0] === "@babel/preset-env"
      ? [preset[0], { ...preset[1], modules: false }]
      : preset
  ),
};
