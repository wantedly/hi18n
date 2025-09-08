import { describe, expect, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import { type CatalogDef, getRule } from "./collect-catalog-definitions.js";

function getConfig(
  collected: CatalogDef[],
  options: { requestMessages?: boolean | undefined } = {},
): TSESLint.FlatConfig.Config {
  const { requestMessages = false } = options;
  return {
    plugins: {
      "@hi18n": {
        rules: {
          "collect-catalog-definitions": getRule((l: CatalogDef) => {
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
      "@hi18n/collect-catalog-definitions": ["error", { requestMessages }],
    },
  };
}

describe("collect-catalog-definitions", () => {
  it("detects catalog definitions", () => {
    const collected: CatalogDef[] = [];
    const linter = new TSESLint.Linter();
    linter.verify(
      `
      import { Catalog, msg } from "@hi18n/core";
      export default new Catalog("en", {
        "example/greeting": msg("Hello!"),
      });
    `,
      getConfig(collected),
    );
    expect(collected).toEqual([
      {
        locale: "en",
        catalogLocation: {
          path: "<input>",
          localName: undefined,
          exportNames: ["default"],
        },
        messages: {},
      },
    ]);
  });

  it("detects locally-defined catalogs", () => {
    const collected: CatalogDef[] = [];
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
        locale: "en",
        catalogLocation: {
          path: "<input>",
          localName: "catalogEn",
          exportNames: [],
        },
        messages: {},
      },
      {
        locale: "ja",
        catalogLocation: {
          path: "<input>",
          localName: "catalogJa",
          exportNames: [],
        },
        messages: {},
      },
    ]);
  });

  it("collects messages", () => {
    const collected: CatalogDef[] = [];
    const linter = new TSESLint.Linter();
    linter.verify(
      `
      import { Catalog, msg } from "@hi18n/core";
      export default new Catalog("en", {
        "example/greeting": msg("Hello!"),
        "example/greeting2": "Hello2!",
      });
    `,
      getConfig(collected, { requestMessages: true }),
    );
    expect(collected).toEqual([
      {
        locale: "en",
        catalogLocation: {
          path: "<input>",
          localName: undefined,
          exportNames: ["default"],
        },
        messages: {
          "example/greeting": {
            value: "Hello!",
          },
          "example/greeting2": {
            value: "Hello2!",
          },
        },
      },
    ]);
  });
});
