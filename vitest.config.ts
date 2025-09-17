import { defineConfig, type ViteUserConfig } from "vitest/config";

export { config as default };
const config: ViteUserConfig = defineConfig({
  test: {
    projects: ["packages/*"],
  },
});
