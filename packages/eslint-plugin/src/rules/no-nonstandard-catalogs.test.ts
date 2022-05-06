import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-nonstandard-catalogs";

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}).run("@hi18n/no-nonstandard-catalogs", rule, {
  valid: [
    `
      import { Catalog } from "@hi18n/core";
      export default new Catalog({});
    `,
    `
      import { Catalog } from "@hi18n/core";
      export const catalogEn = new Catalog({});
    `,
    `
      import { Catalog } from "@hi18n/core";
      const catalogEn = new Catalog({});
    `,
    `
      import { Catalog, msg } from "@hi18n/core";
      export default new Catalog({
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
        import { Catalog } from "@hi18n/core";
        new Catalog({});
      `,
      errors: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "expose the catalog as an export or a file-scope variable" as any,
      ],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        {
          const catalogEn = new Catalog({});
        }
      `,
      errors: ["expose the catalog as an export or a file-scope variable"],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog(otherData);
      `,
      errors: ["the catalog data should be an object literal"],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog(...otherData);
      `,
      errors: ["the catalog data should be an object literal"],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog({
          ...otherData,
        });
      `,
      errors: ["do not use spread in the catalog data"],
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          [dynamicKey]: msg("Hello"),
        });
      `,
      errors: ["do not use dynamic translation ids for the catalog data"],
    },
  ],
});
