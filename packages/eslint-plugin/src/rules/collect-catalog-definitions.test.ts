import { describe, expect, it } from "@jest/globals";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./collect-catalog-definitions";
import { CatalogDef } from "./collect-catalog-definitions";

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
        catalogLocation: {
          path: "<input>",
          localName: undefined,
          exportNames: ["default"],
        },
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
        catalogLocation: {
          path: "<input>",
          localName: "catalogEn",
          exportNames: [],
        },
      },
      {
        catalogLocation: {
          path: "<input>",
          localName: "catalogJa",
          exportNames: [],
        },
      },
    ]);
  });
});
