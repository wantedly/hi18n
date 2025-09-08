import { describe, expect, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import { type BookDef, getRule } from "./collect-book-definitions.ts";

function getConfig(collected: BookDef[]): TSESLint.FlatConfig.Config {
  return {
    plugins: {
      "@hi18n": {
        rules: {
          "collect-book-definitions": getRule((l: BookDef) => {
            collected.push(l);
          }),
        },
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@hi18n/collect-book-definitions": "error",
    },
  };
}

describe("collect-book-definitions", () => {
  it("detects book definitions", () => {
    const collected: BookDef[] = [];
    const linter = new TSESLint.Linter();
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
      getConfig(collected),
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
      getConfig(collected),
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
      getConfig(collected),
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
    linter.verify(
      `
      import { Book } from "@hi18n/core";

      export const book = new Book({
        en: () => import("./en"),
        ja: () => import("./ja"),
      });
    `,
      getConfig(collected),
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
