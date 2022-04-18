import { describe, expect, it } from "@jest/globals";
import { Linter } from "eslint";
import { createCollectTranslationIds, TranslationUsage } from "./collect-translation-ids";

describe("collect-translation-ids", () => {
  it("detects translation ids", () => {
    const collected: TranslationUsage[] = [];
    const rule = createCollectTranslationIds((u) => collected.push(u));
    const linter = new Linter();
    linter.defineRule("collect-translation-ids", rule);
    linter.verify(`
      import { getI18n } from "@hi18n/core";
      import { useI18n, Translate } from "@hi18n/react";
      import { catalog } from "../locale/catalog";

      {
        const { t } = getI18n(catalog, "en");
        t("example.greeting");
        t("example.greeting2", { name: "Taro" });
      }

      {
        const { t: tt } = useI18n(catalog);
        tt("example.price");
        <Translate id="example.introduction" catalog={catalog} />;
      }

      // Module scope
      const { t: ttt } = getI18n(catalog, "en");
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
