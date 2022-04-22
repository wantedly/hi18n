import { RuleTester } from "eslint";
import * as rule from "./no-nonstandard-catalogs";

new RuleTester({
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}).run("@hi18n/no-nonstandard-catalogs", rule, {
  valid: [
    `
      import { MessageCatalog } from "@hi18n/core";
      export const catalog = new MessageCatalog({});
    `,
    `
      import { MessageCatalog } from "@hi18n/core";
      import catalogEn from "./catalog-en";
      import catalogJa from "./catalog-ja";
      export const catalog = new MessageCatalog({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { MessageCatalog } from "@hi18n/core";
      import { default as catalogEn } from "./catalog-en";
      import { default as catalogJa } from "./catalog-ja";
      export const catalog = new MessageCatalog({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
  ],
  invalid: [
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const catalog = new MessageCatalog(42);
      `,
      errors: ["the first argument should be an object literal"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const catalog = new MessageCatalog(...others);
      `,
      errors: ["the first argument should be an object literal"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const catalog = new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
          ...others,
        });
      `,
      errors: ["do not use spread in the catalog list"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const catalog = new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
          [otherName]: catalogOther,
        });
      `,
      errors: ["do not use dynamic keys for the catalog list"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        export const catalog = new MessageCatalog({
          en: catalogEn,
          ja: {},
        });
      `,
      errors: ["the local catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        const catalogJa = {};
        export const catalog = new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the local catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import { something as catalogJa } from "./catalog-ja";
        export const catalog = new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the local catalog should be exported as default"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import * as catalogJa from "./catalog-ja";
        export const catalog = new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the local catalog should be exported as default"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export default new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        const catalog = new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const foo = new MessageCatalog({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
  ],
});

new RuleTester({
  parser: require.resolve("@babel/eslint-parser"),
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    babelOptions: {
      parserOpts: {
        plugins: ["typescript"],
      },
    },
  },
}).run("@hi18n/no-nonstandard-catalogs (with TypeScript)", rule, {
  valid: [
    `
      import { MessageCatalog } from "@hi18n/core";
      type Messages = {};
      export const catalog = new MessageCatalog<Messages>({});
    `,
    `
      import { MessageCatalog } from "@hi18n/core";
      interface Messages {}
      export const catalog = new MessageCatalog<Messages>({});
    `,
    `
      import { MessageCatalog } from "@hi18n/core";
      import catalogEn from "./catalog-en";
      import catalogJa from "./catalog-ja";
      type Messages = {};
      export const catalog = new MessageCatalog<Messages>({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { MessageCatalog } from "@hi18n/core";
      import type { Message } from "@hi18n/core";
      import catalogEn from "./catalog-en";
      import catalogJa from "./catalog-ja";
      type Messages = {
        "example/greeting": Message,
      };
      export const catalog = new MessageCatalog<Messages>({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
  ],
  invalid: [
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        export const catalog = new MessageCatalog<{}>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        export const catalog = new MessageCatalog<Messages>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        class Messages {}
        export const catalog = new MessageCatalog<Messages>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        type Messages = {} & {};
        export const catalog = new MessageCatalog<Messages>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        type Messages = {
          "example/foo"(): number,
        };
        export const catalog = new MessageCatalog<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        type Messages = {
          "example/foo"?: Message,
        };
        export const catalog = new MessageCatalog<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        type Messages = {
          readonly "example/foo": Message,
        };
        export const catalog = new MessageCatalog<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { MessageCatalog } from "@hi18n/core";
        type Messages = {
          [Symbol.toStringTag]: Message,
        };
        export const catalog = new MessageCatalog<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
  ],
});
