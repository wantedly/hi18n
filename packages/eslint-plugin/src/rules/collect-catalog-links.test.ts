import { describe, expect, it } from "@jest/globals";
import { Linter } from "eslint";
import * as rule from "./collect-catalog-links";
import { CatalogLink } from "./collect-catalog-links";

describe("collect-translation-ids", () => {
  it("detects translation ids", () => {
    const collected: CatalogLink[] = [];
    const linter = new Linter();
    linter.defineRule("@hi18n/collect-catalog-links", rule);
    linter.verify(`
      import { MessageCatalog } from "@hi18n/core";
      import catalogEn from "./catalog-en";
      import catalogJa from "./catalog-ja";

      export const catalog = new MessageCatalog({
        en: catalogEn,
        ja: catalogJa,
      });
    `, {
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: "module",
      },
      rules: {
        "@hi18n/collect-catalog-links": "error",
      },
      settings: {
        "@hi18n/collect-catalog-links-callback"(l: CatalogLink) {
          collected.push(l);
        },
      },
    });
    expect(collected).toEqual([
      { locale: "en", localCatalogSource: "./catalog-en", catalogFilename: "<input>" },
      { locale: "ja", localCatalogSource: "./catalog-ja", catalogFilename: "<input>" },
    ]);
  });
});
