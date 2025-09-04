import { afterAll, describe, it } from "vitest";
import * as espree from "espree";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./well-formed-book-references.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: {
    parser: espree,
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
}).run("well-formed-book-references", rule, {
  valid: [
    `
      import { getTranslator } from "@hi18n/core";
      import { book } from "../locale";

      const { t } = getTranslator(book, "en");
      t("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { book as book2 } from "../locale";

      const { t } = getTranslator(book2, "en");
      t("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { book2 as book } from "../locale";

      const { t } = getTranslator(book, "en");
      t("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { book2 } from "../locale";

      const { t } = getTranslator(book2, "en");
      t("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import book from "../locale";

      const { t } = getTranslator(book, "en");
      t("example.greeting");
    `,
    `
      import { Book, getTranslator } from "@hi18n/core";

      const book = new Book({});

      const { t } = getTranslator(book, "en");
      t("example.greeting");
    `,
  ],
  invalid: [
    {
      code: `
        import { getTranslator } from "@hi18n/core";

        const { t } = getTranslator(...data);
        t("example.greeting");
      `,
      errors: [{ messageId: "clarify-book-reference" }],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";

        const { t } = getTranslator(42, "en");
        t("example.greeting");
      `,
      errors: [{ messageId: "clarify-book-reference" }],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import * as book from "../locale";

        const { t } = getTranslator(book, "en");
        t("example.greeting");
      `,
      errors: [{ messageId: "clarify-book-reference" }],
    },
  ],
});
