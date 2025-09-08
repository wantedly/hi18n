import { describe, expect, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import { type TranslationUsage, getRule } from "./collect-translation-ids.ts";

function getConfig(collected: TranslationUsage[]): TSESLint.FlatConfig.Config {
  return {
    plugins: {
      "@hi18n": {
        rules: {
          "collect-translation-ids": getRule((l: TranslationUsage) => {
            collected.push(l);
          }),
        },
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: "module",
      },
    },
    rules: {
      "@hi18n/collect-translation-ids": "error",
    },
  };
}

describe("collect-translation-ids", () => {
  it("detects translation ids", () => {
    const collected: TranslationUsage[] = [];
    const linter = new TSESLint.Linter();
    linter.verify(
      `
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
    `,
      getConfig(collected),
    );
    expect(collected).toEqual([
      {
        id: "example.greeting",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.greeting2",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.greeting3",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.price",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.introduction",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
    ]);
  });

  it("detects translation ids with locally-defined books", () => {
    const collected: TranslationUsage[] = [];
    const linter = new TSESLint.Linter();
    linter.verify(
      `
      import { Book, getTranslator } from "@hi18n/core";
      import { useI18n, Translate } from "@hi18n/react";

      const book = new Book({});

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
    `,
      getConfig(collected),
    );
    expect(collected).toEqual([
      {
        id: "example.greeting",
        bookLocation: {
          base: "<input>",
          localName: "book",
        },
      },
      {
        id: "example.greeting2",
        bookLocation: {
          base: "<input>",
          localName: "book",
        },
      },
      {
        id: "example.greeting3",
        bookLocation: {
          base: "<input>",
          localName: "book",
        },
      },
      {
        id: "example.price",
        bookLocation: {
          base: "<input>",
          localName: "book",
        },
      },
      {
        id: "example.introduction",
        bookLocation: {
          base: "<input>",
          localName: "book",
        },
      },
    ]);
  });

  it("detects dynamically-referenced translation ids", () => {
    const collected: TranslationUsage[] = [];
    const linter = new TSESLint.Linter();
    linter.verify(
      `
      import { getTranslator, translationId } from "@hi18n/core";
      import { useI18n, Translate } from "@hi18n/react";
      import { book } from "../locale";

      {
        const id1 = translationId(book, "example.greeting");
        const id2 = translationId(book, "example.greeting2");
        const { t } = getTranslator(book, "en");
        t.dynamic(id1);
        t.dynamic(id2, { name: "Taro" });
      }

      {
        const id3 = translationId(book, "example.price");
        const id4 = translationId(book, "example.introduction");
        const { t: tt } = useI18n(book);
        tt.dynamic(id3);
        <Translate.Dynamic id={id4} book={book} />;
      }

      // Module scope
      const id5 = translationId(book, "example.greeting3");
      const { t: ttt } = getTranslator(book, "en");
      ttt.dynamic(id5);
    `,
      getConfig(collected),
    );
    expect(collected).toEqual([
      {
        id: "example.greeting",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.greeting2",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.price",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.introduction",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.greeting3",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
    ]);
  });

  it("detects bootstrapping translation ids", () => {
    const collected: TranslationUsage[] = [];
    const linter = new TSESLint.Linter();
    linter.verify(
      `
      import { getTranslator } from "@hi18n/core";
      import { useI18n, Translate } from "@hi18n/react";
      import { book } from "../locale";

      {
        const { t } = getTranslator(book, "en");
        t.todo("example.greeting");
        t.todo("example.greeting2", { name: "Taro" });
      }

      {
        const { t: tt } = useI18n(book);
        tt.todo("example.price");
        <Translate.Todo id="example.introduction" book={book} />;
        // const { Todo } = Translate;
        // <Todo id="example.introduction" book={book} />;
      }

      // Module scope
      const { t: ttt } = getTranslator(book, "en");
      ttt.todo("example.greeting3");
    `,
      getConfig(collected),
    );
    expect(collected).toEqual([
      {
        id: "example.greeting",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.greeting2",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.greeting3",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.price",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
      {
        id: "example.introduction",
        bookLocation: {
          base: "<input>",
          path: "../locale",
          exportName: "book",
        },
      },
    ]);
  });
});
