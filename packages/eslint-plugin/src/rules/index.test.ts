import { RuleTester } from "eslint";
import * as rule from "./local-catalog-export";

new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
  },
}).run("local-catalog-export", rule, {
  valid: [
    `
      import { LocalCatalog } from "@hi18n/core";
      export default new LocalCatalog({});
    `,
    `
      import { LocalCatalog as MyLocalCatalog } from "@hi18n/core";
      export default new LocalCatalog({});
    `,
  ],
  invalid: [
    {
      code: `
        import { LocalCatalog } from "@hi18n/core";
        const foo = new LocalCatalog({});
      `,
      errors: ["LocalCatalog should be exported as default."],
    },
    {
      code: `
        import { LocalCatalog as MyLocalCatalog } from "@hi18n/core";
        const foo = new MyLocalCatalog({});
      `,
      errors: ["LocalCatalog should be exported as default."],
    },
  ],
})
