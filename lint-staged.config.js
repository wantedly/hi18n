/** @type {import("lint-staged").Configuration} */
const config = {
  "*": "prettier --ignore-unknown -w",
  "*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}": [
    "eslint --fix",
    "vitest related",
    () => "tsc --noEmit",
  ],
};
export { config as default };
