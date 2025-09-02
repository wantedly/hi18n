import { describe, expect, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./collect-catalog-definitions.js";
import { CatalogDef } from "./collect-catalog-definitions.js";

const baseConfig: TSESLint.Linter.Config = {
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
};

describe("collect-catalog-definitions", () => {
  it("detects catalog definitions", () => {
    const collected: CatalogDef[] = [];
    const linter = new TSESLint.Linter();
    linter.defineRule("@hi18n/collect-catalog-definitions", rule);
    linter.verify(
      `
      import { Catalog, msg } from "@hi18n/core";
      export default new Catalog("en", {
        "example/greeting": msg("Hello!"),
      });
    `,
      {
        ...baseConfig,
        rules: {
          "@hi18n/collect-catalog-definitions": [
            "error",
            (l: CatalogDef) => {
              collected.push(l);
            },
          ],
        },
      }
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
    linter.defineRule("@hi18n/collect-catalog-definitions", rule);
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
          "@hi18n/collect-catalog-definitions": [
            "error",
            (l: CatalogDef) => {
              collected.push(l);
            },
          ],
        },
      }
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
    linter.defineRule("@hi18n/collect-catalog-definitions", rule);
    linter.verify(
      `
      import { Catalog, msg } from "@hi18n/core";
      export default new Catalog("en", {
        "example/greeting": msg("Hello!"),
        "example/greeting2": "Hello2!",
      });
    `,
      {
        ...baseConfig,
        rules: {
          "@hi18n/collect-catalog-definitions": [
            "error",
            (l: CatalogDef) => {
              collected.push(l);
            },
            { requestMessages: true },
          ],
        },
      }
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
