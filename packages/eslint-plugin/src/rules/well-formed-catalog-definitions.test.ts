import { describe, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./well-formed-catalog-definitions.js";

TSESLint.RuleTester.describe = describe;
TSESLint.RuleTester.it = it;

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}).run("@hi18n/well-formed-catalog-definitions", rule, {
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
