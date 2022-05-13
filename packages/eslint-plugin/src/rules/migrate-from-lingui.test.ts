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
