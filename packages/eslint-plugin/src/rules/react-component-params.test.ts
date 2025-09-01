import path from "node:path";
import { describe, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./react-component-params";

TSESLint.RuleTester.describe = describe;
TSESLint.RuleTester.it = it;

new TSESLint.RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
    project: "./tsconfig.json",
    tsconfigRootDir: path.resolve(__dirname, "../../configs/fixtures"),
  },
}).run("@hi18n/react-component-params", rule, {
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
