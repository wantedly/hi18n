import { describe, expect, it } from "@jest/globals";
import { Linter } from "eslint";
import * as rule from "./collect-translation-ids";
import { TranslationUsage } from "./collect-translation-ids";

describe("collect-translation-ids", () => {
  it("detects translation ids", () => {
    const collected: TranslationUsage[] = [];
    const linter = new Linter();
    linter.defineRule("collect-translation-ids", rule);
    linter.verify(`
      import { getTranslator } from "@hi18n/core";
      import { useI18n, Translate } from "@hi18n/react";
      import { catalog } from "../locale/catalog";

      {
        const { t } = getTranslator(catalog, "en");
        t("example.greeting");
        t("example.greeting2", { name: "Taro" });
      }

      {
        const { t: tt } = useI18n(catalog);
        tt("example.price");
        <Translate id="example.introduction" catalog={catalog} />;
      }

      // Module scope
      const { t: ttt } = getTranslator(catalog, "en");
      ttt("example.greeting3");
    `, {
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: "module",
      },
      rules: {
        "collect-translation-ids": "error",
      },
      settings: {
        "@hi18n/collect-ids-callback"(u: TranslationUsage) {
          collected.push(u);
        },
      },
    });
    expect(collected).toEqual([
      { id: "example.greeting", catalogSource: "../locale/catalog", filename: "<input>" },
      { id: "example.greeting2", catalogSource: "../locale/catalog", filename: "<input>" },
      { id: "example.greeting3", catalogSource: "../locale/catalog", filename: "<input>" },
      { id: "example.price", catalogSource: "../locale/catalog", filename: "<input>" },
      { id: "example.introduction", catalogSource: "../locale/catalog", filename: "<input>" },
    ]);
  });
});
