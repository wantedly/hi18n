import { RuleTester } from "eslint";
import * as rule from "./no-nonstandard-book-references";

new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
}).run("@hi18n/no-nonstandard-book-references", rule, {
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
  ],
  invalid: [
    {
      code: `
        import { getTranslator } from "@hi18n/core";

        const { t } = getTranslator(...data);
        t("example.greeting");
      `,
      errors: ["the book should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";

        const { t } = getTranslator(42, "en");
        t("example.greeting");
      `,
      errors: ["the book should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        const book = 42;

        const { t } = getTranslator(book, "en");
        t("example.greeting");
      `,
      errors: ["the book should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book2 } from "../locale";

        const { t } = getTranslator(book2, "en");
        t("example.greeting");
      `,
      errors: ["the book should be exported as \"book\""],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book2 as book } from "../locale";

        const { t } = getTranslator(book, "en");
        t("example.greeting");
      `,
      errors: ["the book should be exported as \"book\""],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import book from "../locale";

        const { t } = getTranslator(book, "en");
        t("example.greeting");
      `,
      errors: ["the book should be exported as \"book\""],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import * as book from "../locale";

        const { t } = getTranslator(book, "en");
        t("example.greeting");
      `,
      errors: ["the book should be exported as \"book\""],
    },
  ],
})
