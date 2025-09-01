import { describe, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./well-formed-book-definitions";
import type {} from "../tseslint-babel";

TSESLint.RuleTester.describe = describe;
TSESLint.RuleTester.it = it;

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}).run("@hi18n/well-formed-book-definitions", rule, {
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
      const catalogEn = new Catalog("en", {});
      const catalogJa = new Catalog("ja", {});
      export const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
    `
      import { Book } from "@hi18n/core";
      export const book = new Book({
        en: () => import("./en"),
        ja: () => import("./ja"),
      });
    `,
    `
      import { Book } from "@hi18n/core";
      export const book = new Book({
        en: () => { return import("./en"); },
        ja: () => { return import("./ja"); },
      });
    `,
    `
      import { Book } from "@hi18n/core";
      export const book = new Book({
        en: function () { return import("./en"); },
        ja: function () { return import("./ja"); },
      });
    `,
    `
      import { Book } from "@hi18n/core";
      export const book = new Book({
        en() { return import("./en"); },
        ja() { return import("./ja"); },
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
      errors: [{ messageId: "catalogs-should-be-object" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        import catalogJa from "./ja";
        export const book = new Book(...others);
      `,
      errors: [{ messageId: "catalogs-should-be-object" }],
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
      errors: [{ messageId: "catalogs-invalid-spread" }],
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
      errors: [{ messageId: "catalogs-invalid-id" }],
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
      errors: [{ messageId: "clarify-catalog-reference" }],
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
      errors: [{ messageId: "clarify-catalog-reference" }],
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
      errors: [{ messageId: "clarify-catalog-reference" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        export const book = new Book({
          en: catalogEn,
          ja: import("./ja"),
        });
      `,
      errors: [{ messageId: "clarify-catalog-reference" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        export const book = new Book({
          en: catalogEn,
          ja: () => 42,
        });
      `,
      errors: [{ messageId: "clarify-catalog-reference" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        export const book = new Book({
          en: catalogEn,
          ja: () => impoort("./" + locale),
        });
      `,
      errors: [{ messageId: "clarify-catalog-reference" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import catalogEn from "./en";
        export const book = new Book({
          en: catalogEn,
          ja: () => { console.log("foo"); return import("./ja"); },
        });
      `,
      errors: [{ messageId: "clarify-catalog-reference" }],
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
      errors: [{ messageId: "expose-book" }],
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
      errors: [{ messageId: "catalog-type-must-be-type-alias" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        export const book = new Book<Vocabulary>({});
      `,
      errors: [{ messageId: "catalog-type-must-be-type-alias" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        class Vocabulary {}
        export const book = new Book<Vocabulary>({});
      `,
      errors: [{ messageId: "catalog-type-must-be-type-alias" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {} & {};
        export const book = new Book<Vocabulary>({});
      `,
      errors: [{ messageId: "catalog-type-must-be-type-alias" }],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          "example/foo"(): number,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: [
        { messageId: "catalog-type-must-contain-only-simple-signatures" },
      ],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          "example/foo"?: Message,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: [
        { messageId: "catalog-type-must-contain-only-simple-signatures" },
      ],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          readonly "example/foo": Message,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: [
        { messageId: "catalog-type-must-contain-only-simple-signatures" },
      ],
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        type Vocabulary = {
          [Symbol.toStringTag]: Message,
        };
        export const book = new Book<Vocabulary>({});
      `,
      errors: [
        { messageId: "catalog-type-must-contain-only-simple-signatures" },
      ],
    },
  ],
});
