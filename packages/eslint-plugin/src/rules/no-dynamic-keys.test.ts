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
      import { catalog } from "../locale/catalog";

      const { t } = getTranslator(catalog, "en");
      t("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const { t: translate } = getTranslator(catalog, "en");
      translate("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const translate = getTranslator(catalog, "en").t;
      translate("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const { t: translate } = getTranslator(catalog, "en");
      const id = "example.greeting";
      t(id);
    `,
  ],
  invalid: [
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { catalog } from "../locale/catalog";

        const { t } = getTranslator(catalog, "en");
        const id = "example.greeting";
        t(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { catalog } from "../locale/catalog";

        const { t: translate } = getTranslator(catalog, "en");
        const id = "example.greeting";
        translate(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { catalog } from "../locale/catalog";

        const translate = getTranslator(catalog, "en").t;
        const id = "example.greeting";
        translate(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { useI18n } from "@hi18n/react";
        import { catalog } from "../locale/catalog";

        const { t } = useI18n(catalog);
        const id = "example.greeting";
        t(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { Translate } from "@hi18n/react";
        import { catalog } from "../locale/catalog";

        const id = "example.greeting";
        <Translate id={id} catalog={catalog} />;
      `,
      errors: ["Don't use dynamic translation keys"],
    },
  ],
})
