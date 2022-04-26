import { RuleTester } from "eslint";
import * as rule from "./no-nonstandard-books";

new RuleTester({
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}).run("@hi18n/no-nonstandard-books", rule, {
  valid: [
    `
      import { Book } from "@hi18n/core";
      export const book = new Book({});
    `,
    `
      import { Book } from "@hi18n/core";
      import catalogEn from "./catalog-en";
      import catalogJa from "./catalog-ja";
      export const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { Book } from "@hi18n/core";
      import { default as catalogEn } from "./catalog-en";
      import { default as catalogJa } from "./catalog-ja";
      export const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
  ],
  invalid: [
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const book = new Book(42);
      `,
      errors: ["the first argument should be an object literal"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const book = new Book(...others);
      `,
      errors: ["the first argument should be an object literal"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
          ...others,
        });
      `,
      errors: ["do not use spread in the catalog list"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
          [otherName]: catalogOther,
        });
      `,
      errors: ["do not use dynamic keys for the catalog list"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        export const book = new Book({
          en: catalogEn,
          ja: {},
        });
      `,
      errors: ["the local catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        const catalogJa = {};
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the local catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import { something as catalogJa } from "./catalog-ja";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the local catalog should be exported as default"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import * as catalogJa from "./catalog-ja";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the local catalog should be exported as default"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export default new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the book should be exported as \"book\""],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the book should be exported as \"book\""],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the book should be exported as \"book\""],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./catalog-en";
        import catalogJa from "./catalog-ja";
        export const foo = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the book should be exported as \"book\""],
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
}).run("@hi18n/no-nonstandard-books (with TypeScript)", rule, {
  valid: [
    `
      import { Book } from "@hi18n/core";
      type Messages = {};
      export const book = new Book<Messages>({});
    `,
    `
      import { Book } from "@hi18n/core";
      interface Messages {}
      export const book = new Book<Messages>({});
    `,
    `
      import { Book } from "@hi18n/core";
      import catalogEn from "./catalog-en";
      import catalogJa from "./catalog-ja";
      type Messages = {};
      export const book = new Book<Messages>({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { Book } from "@hi18n/core";
      import type { Message } from "@hi18n/core";
      import catalogEn from "./catalog-en";
      import catalogJa from "./catalog-ja";
      type Messages = {
        "example/greeting": Message,
      };
      export const book = new Book<Messages>({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
  ],
  invalid: [
    {
      code: `
        import { Book } from "@hi18n/core";
        export const book = new Book<{}>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        export const book = new Book<Messages>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        class Messages {}
        export const book = new Book<Messages>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Messages = {} & {};
        export const book = new Book<Messages>({});
      `,
      errors: ["declare catalog type as type Messages = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Messages = {
          "example/foo"(): number,
        };
        export const book = new Book<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Messages = {
          "example/foo"?: Message,
        };
        export const book = new Book<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Messages = {
          readonly "example/foo": Message,
        };
        export const book = new Book<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Messages = {
          [Symbol.toStringTag]: Message,
        };
        export const book = new Book<Messages>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
  ],
});
