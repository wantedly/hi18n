import path from "node:path";
import { afterAll, describe, it } from "vitest";
import * as tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./react-component-params.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
      project: "./tsconfig.json",
      tsconfigRootDir: path.resolve(__dirname, "../../configs/fixtures"),
    },
  },
}).run("react-component-params", rule, {
  valid: [
    `
      import { Book, ComponentPlaceholder, Message } from "@hi18n/core";
      import { Translate } from "@hi18n/react";

      type Vocabulary = {
        "example/link": Message<{ link: ComponentPlaceholder }>;
      };

      const book = new Book<Vocabulary>({});

      <Translate book={book} id="example/link">
        <a key="link" />
      </Translate>
    `,
    `
      import { Book, ComponentPlaceholder, Message } from "@hi18n/core";
      import { Translate } from "@hi18n/react";

      type Vocabulary = {
        "example/link": Message<{ 0: ComponentPlaceholder }>;
      };

      const book = new Book<Vocabulary>({});

      <Translate book={book} id="example/link">
        <a />
      </Translate>
    `,
  ],
  invalid: [
    {
      code: `
        import { Book, ComponentPlaceholder, Message } from "@hi18n/core";
        import { Translate } from "@hi18n/react";

        type Vocabulary = {
          "example/link": Message<{ link: ComponentPlaceholder }>;
        };

        const book = new Book<Vocabulary>({});

        <Translate book={book} id="example/link">
        </Translate>
      `,
      errors: [
        {
          messageId: "missing-component-argument",
          data: { paramNames: "link" },
        },
      ],
    },
    {
      code: `
        import { Book, ComponentPlaceholder, Message } from "@hi18n/core";
        import { Translate } from "@hi18n/react";

        type Vocabulary = {
          "example/link": Message<{ link: ComponentPlaceholder }>;
        };

        const book = new Book<Vocabulary>({});

        <Translate book={book} id="example/link">
          <a key="link" />
          <strong />
        </Translate>
      `,
      errors: [{ messageId: "extra-component-argument", data: { argName: 0 } }],
    },
    {
      code: `
        import { Book, ComponentPlaceholder, Message } from "@hi18n/core";
        import { Translate } from "@hi18n/react";

        type Vocabulary = {
          "example/link": Message<{ link: ComponentPlaceholder }>;
        };

        const book = new Book<Vocabulary>({});

        <Translate book={book} id="example/link">
          <a key="link" />
          <strong key="strong" />
        </Translate>
      `,
      errors: [
        { messageId: "extra-component-argument", data: { argName: "strong" } },
      ],
    },
  ],
});
