import { RuleTester } from "eslint";
import * as rule from "./no-nonstandard-local-catalogs";

new RuleTester({
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}).run("@hi18n/no-nonstandard-local-catalogs", rule, {
  valid: [
    `
      import { LocalCatalog } from "@hi18n/core";
      export default new LocalCatalog({});
    `,
    `
      import { LocalCatalog, msg } from "@hi18n/core";
      export default new LocalCatalog({
        "example/greeting": msg("Hello!"),
        "example/greeting2": msg("Hello, world!"),
        "example/greeting3": msg("Hello again!"),
        "example/multiline": msg(
          "This is a long text. This is a long text. This is a long text. This is a long text."
        ),
      });
    `,
  ],
  invalid: [
    {
      code: `
        import { LocalCatalog } from "@hi18n/core";
        new LocalCatalog({});
      `,
      errors: ["the local catalog should be exported as default"],
    },
    {
      code: `
        import { LocalCatalog } from "@hi18n/core";
        export const catalogEn = new LocalCatalog({});
      `,
      errors: ["the local catalog should be exported as default"],
    },
    {
      code: `
        import { LocalCatalog } from "@hi18n/core";
        export default new LocalCatalog(otherData);
      `,
      errors: ["the catalog data should be an object literal"],
    },
    {
      code: `
        import { LocalCatalog } from "@hi18n/core";
        export default new LocalCatalog(...otherData);
      `,
      errors: ["the catalog data should be an object literal"],
    },
    {
      code: `
        import { LocalCatalog } from "@hi18n/core";
        export default new LocalCatalog({
          ...otherData,
        });
      `,
      errors: ["do not use spread in the catalog data"],
    },
    {
      code: `
        import { LocalCatalog, msg } from "@hi18n/core";
        export default new LocalCatalog({
          [dynamicKey]: msg("Hello"),
        });
      `,
      errors: ["do not use dynamic keys for the catalog data"],
    },
  ],
})
