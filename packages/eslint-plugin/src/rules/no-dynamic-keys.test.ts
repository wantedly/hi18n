import { RuleTester } from "eslint";
import * as rule from "./no-dynamic-keys";

new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
  },
}).run("no-dynamic-keys", rule, {
  valid: [
    `
      import { getI18n } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const { t } = getI18n(catalog, "en");
      t("example.greeting");
    `,
    `
      import { getI18n } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const { t: translate } = getI18n(catalog, "en");
      translate("example.greeting");
    `,
    `
      import { getI18n } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const translate = getI18n(catalog, "en").t;
      translate("example.greeting");
    `,
    `
      import { getI18n } from "@hi18n/core";
      import { catalog } from "../locale/catalog";

      const { t: translate } = getI18n(catalog, "en");
      const id = "example.greeting";
      t(id);
    `,
  ],
  invalid: [
    {
      code: `
        import { getI18n } from "@hi18n/core";
        import { catalog } from "../locale/catalog";

        const { t } = getI18n(catalog, "en");
        const id = "example.greeting";
        t(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { getI18n } from "@hi18n/core";
        import { catalog } from "../locale/catalog";

        const { t: translate } = getI18n(catalog, "en");
        const id = "example.greeting";
        translate(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
    {
      code: `
        import { getI18n } from "@hi18n/core";
        import { catalog } from "../locale/catalog";

        const translate = getI18n(catalog, "en").t;
        const id = "example.greeting";
        translate(id);
      `,
      errors: ["Don't use dynamic translation keys"],
    },
  ],
})