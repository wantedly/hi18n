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
      import catalogEn from "./en";
      import catalogJa from "./ja";
      export const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { Book } from "@hi18n/core";
      import { default as catalogEn } from "./en";
      import { default as catalogJa } from "./ja";
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
        import catalogEn from "./en";
        import catalogJa from "./ja";
        export const book = new Book(42);
      `,
      errors: ["the first argument should be an object literal"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        import catalogJa from "./ja";
        export const book = new Book(...others);
      `,
      errors: ["the first argument should be an object literal"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        import catalogJa from "./ja";
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
        import catalogEn from "./en";
        import catalogJa from "./ja";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
          [otherName]: catalogOther,
        });
      `,
      errors: ["do not use dynamic translation ids for the catalog list"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        export const book = new Book({
          en: catalogEn,
          ja: {},
        });
      `,
      errors: ["the catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        const catalogJa = {};
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        import { something as catalogJa } from "./ja";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the catalog should be exported as default"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        import * as catalogJa from "./ja";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: ["the catalog should be exported as default"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        import catalogJa from "./ja";
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
        import catalogEn from "./en";
        import catalogJa from "./ja";
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
        import catalogEn from "./en";
        import catalogJa from "./ja";
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
        import catalogEn from "./en";
        import catalogJa from "./ja";
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
      type Vocabulary = {};
      export const book = new Book<Vocabulary>({});
    `,
    `
      import { Book } from "@hi18n/core";
      interface Vocabulary {}
      export const book = new Book<Vocabulary>({});
    `,
    `
      import { Book } from "@hi18n/core";
      import catalogEn from "./en";
      import catalogJa from "./ja";
      type Vocabulary = {};
      export const book = new Book<Vocabulary>({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { Book } from "@hi18n/core";
      import type { Message } from "@hi18n/core";
      import catalogEn from "./en";
      import catalogJa from "./ja";
      type Vocabulary = {
        "example/greeting": Message,
      };
      export const book = new Book<Vocabulary>({
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
      errors: ["declare catalog type as type Vocabulary = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        export const book = new Book<Vocabulary>({});
      `,
      errors: ["declare catalog type as type Vocabulary = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        class Vocabulary {}
        export const book = new Book<Vocabulary>({});
      `,
      errors: ["declare catalog type as type Vocabulary = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {} & {};
        export const book = new Book<Vocabulary>({});
      `,
      errors: ["declare catalog type as type Vocabulary = { ... }"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          "example/foo"(): number,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          "example/foo"?: Message,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          readonly "example/foo": Message,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          [Symbol.toStringTag]: Message,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: ["only simple signatures are allowed"],
    },
  ],
});
