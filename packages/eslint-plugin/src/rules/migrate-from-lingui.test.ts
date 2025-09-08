import { afterAll, describe, it } from "vitest";
import * as espree from "espree";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./migrate-from-lingui.ts";

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
}).run("migrate-from-lingui", rule, {
  valid: [
    {
      code: `
        import { getTranslator } from "@hi18n/core";
        import { book } from "../locale";

        const { t } = getTranslator(book, "en");
        t("example.greeting");
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
    },
  ],
  invalid: [
    {
      code: `
        import React from "react";
        import { useLingui } from "@lingui/react";

        function MyComponent() {
          const { i18n } = useLingui();
          i18n._("example/greeting");
        }
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-underscore" }],
      output: `
        import React from "react";
        import { useI18n } from "@hi18n/react";
        import { useLingui } from "@lingui/react";
        import { book } from "./locale";

        function MyComponent() {
          const { t } = useI18n(book);
          const { i18n } = useLingui();
          t("example/greeting");
        }
      `,
    },
    {
      code: `
        import React from "react";
        import { useLingui, i18nMark } from "@lingui/react";

        function MyComponent() {
          const { i18n } = useLingui();
          i18n._(i18nMark("example/greeting"));
        }
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-underscore" }],
      output: `
        import React from "react";
        import { useI18n } from "@hi18n/react";
        import { useLingui, i18nMark } from "@lingui/react";
        import { book } from "./locale";

        function MyComponent() {
          const { t } = useI18n(book);
          const { i18n } = useLingui();
          t("example/greeting");
        }
      `,
    },
    {
      code: `
        import React from "react";
        import { useI18n } from "@hi18n/react";
        import { useLingui } from "@lingui/react";

        function MyComponent() {
          const { t } = useI18n(book);
          const { i18n } = useLingui();
          t("example/greeting");
          i18n._("example/greeting2");
        }
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-underscore" }],
      output: `
        import React from "react";
        import { useI18n } from "@hi18n/react";
        import { useLingui } from "@lingui/react";
        import { book } from "./locale";

        function MyComponent() {
          const { t } = useI18n(book);
          const { i18n } = useLingui();
          t("example/greeting");
          t("example/greeting2");
        }
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        <Translate book={book} id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting">
          <br />
        </Trans>;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        <Translate book={book} id="example/greeting">
          <br />
        </Translate>;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      filename: "src/components/foo/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "../../locale";

        <Translate book={book} id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        const Translate = 0;

        <Trans id="example/greeting" />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate as Translate0 } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        const Translate = 0;

        <Translate0 book={book} id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import {} from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        <Translate book={book} id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import { useI18n } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { useI18n, Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        <Translate book={book} id="example/greeting" />;
      `,
    },
    {
      code: `
        import { book } from "./locale";
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import { book } from "./locale";
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";

        <Translate book={book} id="example/greeting" />;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" render={<Foo />} />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        <Translate book={book} id="example/greeting" renderInElement={<Foo />} />;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" component={Foo} />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        <Translate book={book} id="example/greeting" renderInElement={<Foo />} />;
      `,
    },
    {
      code: `
        import React from "react";
        import { Trans } from "@lingui/react";

        <Trans id="example/greeting" values={{ foo: 42, bar: 100 }} components={[<a />]} />;
      `,
      filename: "src/index.ts",
      options: [
        {
          bookPath: "src/locale",
        },
      ],
      errors: [{ messageId: "migrate-trans-jsx" }],
      output: `
        import React from "react";
        import { Translate } from "@hi18n/react";
        import { Trans } from "@lingui/react";
        import { book } from "./locale";

        <Translate book={book} id="example/greeting" foo={42} bar={100} {...{ 0: <a /> }} />;
      `,
    },
  ],
});
