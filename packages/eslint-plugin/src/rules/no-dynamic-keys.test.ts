import { RuleTester } from "eslint";
import * as rule from "./no-dynamic-keys";

new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
}).run("no-dynamic-keys", rule, {
  valid: [
    `
      import { getTranslator } from "@hi18n/core";
      import { book } from "../locale";

      const { t } = getTranslator(book, "en");
      t("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { book } from "../locale";

      const { t: translate } = getTranslator(book, "en");
      translate("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { book } from "../locale";

      const translate = getTranslator(book, "en").t;
      translate("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { book } from "../locale";

      const { t: translate } = getTranslator(book, "en");
      const id = "example.greeting";
      t(id);
    `,
  ],
  invalid: [
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book } from "../locale";

        const { t } = getTranslator(book, "en");
        const id = "example.greeting";
        t(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book } from "../locale";

        const { t: translate } = getTranslator(book, "en");
        const id = "example.greeting";
        translate(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book } from "../locale";

        const translate = getTranslator(book, "en").t;
        const id = "example.greeting";
        translate(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { useI18n } from "@hi18n/react";
        import { book } from "../locale";

        const { t } = useI18n(book);
        const id = "example.greeting";
        t(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { Translate } from "@hi18n/react";
        import { book } from "../locale";

        const id = "example.greeting";
        <Translate id={id} book={book} />;
      `,
      errors: ["Don't use dynamic translation keys"],
    },
  ],
})
