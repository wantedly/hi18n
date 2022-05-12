import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./migrate-from-lingui";

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
}).run("@hi18n/migrate-from-lingui", rule, {
  valid: [
    `
      import { getTranslator } from "@hi18n/core";
      import { book } from "../locale";

      const { t } = getTranslator(book, "en");
      t("example.greeting");
    `,
  ],
  invalid: [
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Translate id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        const Translate = 0;

        <Trans id="example/greeting" />;
      `,
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate as Translate0 } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        const Translate = 0;

        <Translate0 id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import {} from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Translate id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import { useI18n } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { useI18n, Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Translate id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" render={<Foo />} />;
      `,
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Translate id="example/greeting" renderInElement={<Foo />} />;
      `,
    },
  ],
});
