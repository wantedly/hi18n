import { describe, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-dynamic-translation-ids";

TSESLint.RuleTester.describe = describe;
TSESLint.RuleTester.it = it;

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
      errors: [{ messageId: "no-dynamic-keys" }],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book } from "../locale";

        const { t: translate } = getTranslator(book, "en");
        const id = "example.greeting";
        translate(id);
      `,
      errors: [{ messageId: "no-dynamic-keys" }],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book } from "../locale";

        const translate = getTranslator(book, "en").t;
        const id = "example.greeting";
        translate(id);
      `,
      errors: [{ messageId: "no-dynamic-keys" }],
    },
    {
      code: `
        import { useI18n } from "@hi18n/react";
        import { book } from "../locale";

        const { t } = useI18n(book);
        const id = "example.greeting";
        t(id);
      `,
      errors: [{ messageId: "no-dynamic-keys" }],
    },
    {
      code: `
        import { Translate } from "@hi18n/react";
        import { book } from "../locale";

        const id = "example.greeting";
        <Translate id={id} book={book} />;
      `,
      errors: [{ messageId: "no-dynamic-keys" }],
    },
  ],
});
