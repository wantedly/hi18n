import { RuleTester } from "eslint";
import * as rule from "./no-nonstandard-catalog-references";

new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
}).run("@hi18n/no-nonstandard-catalog-references", rule, {
  valid: [
    `
      import { getTranslator } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const { t } = getTranslator(catalog, "en");
      t("example.greeting");
    `,
    `
      import { getTranslator } from "@hi18n/core";
      import { catalog as catalog2 } from "../locale/catalog";

      const { t } = getTranslator(catalog2, "en");
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
      errors: ["the catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";

        const { t } = getTranslator(42, "en");
        t("example.greeting");
      `,
      errors: ["the catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        const catalog = 42;

        const { t } = getTranslator(catalog, "en");
        t("example.greeting");
      `,
      errors: ["the catalog should be directly imported from the corresponding module."],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { catalog2 } from "../locale/catalog";

        const { t } = getTranslator(catalog2, "en");
        t("example.greeting");
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { catalog2 as catalog } from "../locale/catalog";

        const { t } = getTranslator(catalog, "en");
        t("example.greeting");
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import catalog from "../locale/catalog";

        const { t } = getTranslator(catalog, "en");
        t("example.greeting");
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import * as catalog from "../locale/catalog";

        const { t } = getTranslator(catalog, "en");
        t("example.greeting");
      `,
      errors: ["the catalog should be exported as \"catalog\""],
    },
  ],
})
