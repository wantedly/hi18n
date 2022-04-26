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
      import { book } from "../locale";

      {
        const { t } = getTranslator(book, "en");
        t("example.greeting");
        t("example.greeting2", { name: "Taro" });
      }

      {
        const { t: tt } = useI18n(book);
        tt("example.price");
        <Translate id="example.introduction" book={book} />;
      }

      // Module scope
      const { t: ttt } = getTranslator(book, "en");
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
        "collect-translation-ids": ["error", (u: TranslationUsage) => {
          collected.push(u);
        }],
      },
    });
    expect(collected).toEqual([
      { id: "example.greeting", bookSource: "../locale", filename: "<input>" },
      { id: "example.greeting2", bookSource: "../locale", filename: "<input>" },
      { id: "example.greeting3", bookSource: "../locale", filename: "<input>" },
      { id: "example.price", bookSource: "../locale", filename: "<input>" },
      { id: "example.introduction", bookSource: "../locale", filename: "<input>" },
    ]);
  });
});
