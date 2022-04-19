import { describe, expect, it } from "@jest/globals";
import { Linter } from "eslint";
import { createFindCatalogLinks, CatalogLink } from "./find-catalog-links";

describe("collect-translation-ids", () => {
  it("detects translation ids", () => {
    const collected: CatalogLink[] = [];
    const rule = createFindCatalogLinks((u) => collected.push(u));
    const linter = new Linter();
    linter.defineRule("find-catalog-links", rule);
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
        "find-catalog-links": "error",
      },
    });
    expect(collected).toEqual([
      { locale: "en", localCatalogSource: "./catalog-en", catalogFilename: "<input>" },
      { locale: "ja", localCatalogSource: "./catalog-ja", catalogFilename: "<input>" },
    ]);
  });
});
