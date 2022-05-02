import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-dynamic-translation-ids";

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
}).run("@hi18n/no-dynamic-translation-ids", rule, {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: ["Don't use dynamic translation keys" as any],
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
});
