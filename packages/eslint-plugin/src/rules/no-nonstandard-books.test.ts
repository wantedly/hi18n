import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-nonstandard-books";
import type {} from "../tseslint-babel";

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
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
      const book = new Book({});
    `,
    `
      import { Book } from "@hi18n/core";
      export default new Book({});
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
    `
      import { Book } from "@hi18n/core";
      import { catalog as catalogEn } from "./en";
      import { catalog as catalogJa } from "./ja";
      export const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { Book, Catalog } from "@hi18n/core";
      const catalogEn = new Catalog({});
      const catalogJa = new Catalog({});
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: ["the first argument should be an object literal" as any],
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
      errors: [
        "the catalog should be an imported variable or a variable declared in the file scope",
      ],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        export const book = new Book({
          en: catalogEn,
          ja: catalogJa,
        });
      `,
      errors: [
        "the catalog should be an imported variable or a variable declared in the file scope",
      ],
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
      errors: [
        "the catalog should be an imported variable or a variable declared in the file scope",
      ],
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
      errors: ["expose the book as an export or a file-scope variable"],
    },
  ],
});

new TSESLint.RuleTester({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: ["declare catalog type as type Vocabulary = { ... }" as any],
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
