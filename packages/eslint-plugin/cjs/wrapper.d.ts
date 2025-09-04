import index = require("./dist/index.js");

// @ts-expect-error intentionally declaring conflicting exports
export = index.default;

export type {
  Plugin,
  Config,
  LegacyConfig,
  SharedConfigs,
} from "./dist/index.js";
