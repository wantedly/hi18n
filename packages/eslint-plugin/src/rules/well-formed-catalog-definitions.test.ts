import { afterAll, describe, it } from "vitest";
import * as espree from "espree";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./well-formed-catalog-definitions.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: {
    parser: espree,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
}).run("well-formed-catalog-definitions", rule, {
  valid: [
    `
      import { Catalog } from "@hi18n/core";
      export default new Catalog({});
    `,
    `
      import { Catalog } from "@hi18n/core";
      export default new Catalog("en", {});
    `,
    `
      import { Catalog } from "@hi18n/core";
      export const catalogEn = new Catalog({});
    `,
    `
      import { Catalog } from "@hi18n/core";
      export const catalogEn = new Catalog("en", {});
    `,
    `
      import { Catalog } from "@hi18n/core";
      const catalogEn = new Catalog({});
    `,
    `
      import { Catalog } from "@hi18n/core";
      const catalogEn = new Catalog("en", {});
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
    `
      import { Catalog, msg } from "@hi18n/core";
      export default new Catalog("en", {
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
      errors: [{ messageId: "expose-catalog" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        new Catalog("en", {});
      `,
      errors: [{ messageId: "expose-catalog" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        {
          const catalogEn = new Catalog({});
        }
      `,
      errors: [{ messageId: "expose-catalog" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        {
          const catalogEn = new Catalog("en", {});
        }
      `,
      errors: [{ messageId: "expose-catalog" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog(otherData);
      `,
      errors: [{ messageId: "catalog-data-should-be-object" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog("en", otherData);
      `,
      errors: [{ messageId: "catalog-data-should-be-object" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog(...otherData);
      `,
      errors: [{ messageId: "catalog-data-should-be-object" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog("en", ...otherData);
      `,
      errors: [{ messageId: "catalog-data-should-be-object" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog({
          ...otherData,
        });
      `,
      errors: [{ messageId: "catalog-data-invalid-spread" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        export default new Catalog("en", {
          ...otherData,
        });
      `,
      errors: [{ messageId: "catalog-data-invalid-spread" }],
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          [dynamicKey]: msg("Hello"),
        });
      `,
      errors: [{ messageId: "catalog-data-invalid-id" }],
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          [dynamicKey]: msg("Hello"),
        });
      `,
      errors: [{ messageId: "catalog-data-invalid-id" }],
    },
  ],
});
