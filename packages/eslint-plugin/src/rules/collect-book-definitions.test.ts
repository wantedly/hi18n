import { describe, expect, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./collect-book-definitions";
import { BookDef } from "./collect-book-definitions";

const baseConfig: TSESLint.Linter.Config = {
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
};

describe("collect-book-definitions", () => {
  it("detects book definitions", () => {
    const collected: BookDef[] = [];
    const linter = new TSESLint.Linter();
    linter.defineRule("@hi18n/collect-book-definitions", rule);
    linter.verify(
      `
      import { Book } from "@hi18n/core";
      import catalogEn from "./en";
      import catalogJa from "./ja";

      export const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
      {
        ...baseConfig,
        rules: {
          "@hi18n/collect-book-definitions": [
            "error",
            (l: BookDef) => {
              collected.push(l);
            },
          ],
        },
      }
    );
    expect(collected).toEqual([
      {
        bookLocation: {
          path: "<input>",
          localName: "book",
          exportNames: ["book"],
        },
        catalogLinks: [
          {
            locale: "en",
            catalogLocation: {
              base: "<input>",
              path: "./en",
              exportName: "default",
            },
          },
          {
            locale: "ja",
            catalogLocation: {
              base: "<input>",
              path: "./ja",
              exportName: "default",
            },
          },
        ],
      },
    ]);
  });

  it("detects locally-defined book definitions", () => {
    const collected: BookDef[] = [];
    const linter = new TSESLint.Linter();
    linter.defineRule("@hi18n/collect-book-definitions", rule);
    linter.verify(
      `
      import { Book } from "@hi18n/core";
      import catalogEn from "./en";
      import catalogJa from "./ja";

      const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
      {
        ...baseConfig,
        rules: {
          "@hi18n/collect-book-definitions": [
            "error",
            (l: BookDef) => {
              collected.push(l);
            },
          ],
        },
      }
    );
    expect(collected).toEqual([
      {
        bookLocation: {
          path: "<input>",
          localName: "book",
          exportNames: [],
        },
        catalogLinks: [
          {
            locale: "en",
            catalogLocation: {
              base: "<input>",
              path: "./en",
              exportName: "default",
            },
          },
          {
            locale: "ja",
            catalogLocation: {
              base: "<input>",
              path: "./ja",
              exportName: "default",
            },
          },
        ],
      },
    ]);
  });

  it("detects book definitions referencing locally-defined catalogs", () => {
    const collected: BookDef[] = [];
    const linter = new TSESLint.Linter();
    linter.defineRule("@hi18n/collect-book-definitions", rule);
    linter.verify(
      `
      import { Book, Catalog, msg } from "@hi18n/core";
      const catalogEn = new Catalog("en", {
        "example/greeting": msg("Hello!"),
      });
      const catalogJa = new Catalog("ja", {
        "example/greeting": msg("こんにちは!"),
      });

      export const book = new Book({
        en: catalogEn,
        ja: catalogJa,
      });
    `,
      {
        ...baseConfig,
        rules: {
          "@hi18n/collect-book-definitions": [
            "error",
            (l: BookDef) => {
              collected.push(l);
            },
          ],
        },
      }
    );
    expect(collected).toEqual([
      {
        bookLocation: {
          path: "<input>",
          localName: "book",
          exportNames: ["book"],
        },
        catalogLinks: [
          {
            locale: "en",
            catalogLocation: {
              base: "<input>",
              localName: "catalogEn",
            },
          },
          {
            locale: "ja",
            catalogLocation: {
              base: "<input>",
              localName: "catalogJa",
            },
          },
        ],
      },
    ]);
  });

  it("detects dynamically-loaded book definitions", () => {
    const collected: BookDef[] = [];
    const linter = new TSESLint.Linter();
    linter.defineRule("@hi18n/collect-book-definitions", rule);
    linter.verify(
      `
      import { Book } from "@hi18n/core";

      export const book = new Book({
        en: () => import("./en"),
        ja: () => import("./ja"),
      });
    `,
      {
        ...baseConfig,
        rules: {
          "@hi18n/collect-book-definitions": [
            "error",
            (l: BookDef) => {
              collected.push(l);
            },
          ],
        },
      }
    );
    expect(collected).toEqual([
      {
        bookLocation: {
          path: "<input>",
          localName: "book",
          exportNames: ["book"],
        },
        catalogLinks: [
          {
            locale: "en",
            catalogLocation: {
              base: "<input>",
              path: "./en",
              exportName: "default",
            },
          },
          {
            locale: "ja",
            catalogLocation: {
              base: "<input>",
              path: "./ja",
              exportName: "default",
            },
          },
        ],
      },
    ]);
  });
});
