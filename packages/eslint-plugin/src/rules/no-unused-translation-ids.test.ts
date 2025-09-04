import { afterAll, describe, it } from "vitest";
import * as espree from "espree";
import * as tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./no-unused-translation-ids.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: {
    parser: espree,
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
    },
  },
}).run("no-unused-translation-ids", rule, {
  valid: [
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/greeting": msg("Hello!"),
          "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          // "example/greeting4": msg("Good morning!"),
          "example/multiline": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
          // "example/multiline2": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
        });
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": [
            "example/greeting",
            "example/greeting2",
            "example/greeting3",
            "example/multiline",
          ],
        },
      },
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/greeting": msg("Hello!"),
          "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          // "example/greeting4": msg("Good morning!"),
          "example/multiline": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
          // "example/multiline2": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
        });
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": [
            "example/greeting",
            "example/greeting2",
            "example/greeting3",
            "example/multiline",
          ],
        },
      },
    },
  ],
  invalid: [
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/greeting": msg("Hello!"),
          "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          // "example/greeting4": msg("Good morning!"),
          "example/multiline": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
          // "example/multiline2": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
        });
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": [
            "example/greeting",
            "example/greeting3",
            "example/greeting4",
            "example/multiline2",
          ],
        },
      },
      errors: [
        { messageId: "unused-translation-id" },
        { messageId: "unused-translation-id" },
      ],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/greeting": msg("Hello!"),
          // "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          // "example/greeting4": msg("Good morning!"),
          // "example/multiline": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
          // "example/multiline2": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
        });
      `,
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/greeting": msg("Hello!"),
          "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          // "example/greeting4": msg("Good morning!"),
          "example/multiline": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
          // "example/multiline2": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
        });
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": [
            "example/greeting",
            "example/greeting3",
            "example/greeting4",
            "example/multiline2",
          ],
        },
      },
      errors: [
        { messageId: "unused-translation-id" },
        { messageId: "unused-translation-id" },
      ],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/greeting": msg("Hello!"),
          // "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          // "example/greeting4": msg("Good morning!"),
          // "example/multiline": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
          // "example/multiline2": msg(
          //   "This is a long text. This is a long text. This is a long text. This is a long text."
          // ),
        });
      `,
    },
  ],
});

new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
    },
  },
}).run("no-missing-translation-ids (with TypeScript)", rule, {
  valid: [],
  invalid: [
    {
      code: `
        import { Book, Catalog, getTranslator, Message, msg } from "@hi18n/core";

        type Vocabulary = {
          // "standalone/ask": Message<{ name: string }>;
          "standalone/farewell": Message;
          "standalone/greeting": Message;
        };
        const catalogEn = new Catalog<Vocabulary>("en", {
          // "standalone/ask": msg("Are you {name}?"),
          "standalone/farewell": msg("Bye!"),
          "standalone/greeting": msg("Hi!"),
        });
        const catalogJa = new Catalog<Vocabulary>("ja", {
          // "standalone/ask": msg("きみ、{name}?"),
          "standalone/farewell": msg("んじゃ!"),
          "standalone/greeting": msg("んちゃ!"),
        });
        const book = new Book<Vocabulary>({ en: catalogEn, ja: catalogJa });

        {
          const { t } = getTranslator(book, "en");
          t("standalone/farewell");
          // @ts-ignore
          t("standalone/ask", { name: "John" });
          // @ts-ignore
          t("standalone/answer");
        }
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?local=catalogEn": "file.ts?local=book",
          "file.ts?local=catalogJa": "file.ts?local=book",
        },
        "@hi18n/used-translation-ids": {
          "file.ts?local=book": [
            "standalone/answer",
            "standalone/ask",
            "standalone/farewell",
          ],
        },
        "@hi18n/value-hints": {},
      },
      errors: [
        { messageId: "unused-translation-id" },
        { messageId: "unused-translation-id" },
      ],
      output: `
        import { Book, Catalog, getTranslator, Message, msg } from "@hi18n/core";

        type Vocabulary = {
          // "standalone/ask": Message<{ name: string }>;
          "standalone/farewell": Message;
          "standalone/greeting": Message;
        };
        const catalogEn = new Catalog<Vocabulary>("en", {
          // "standalone/ask": msg("Are you {name}?"),
          "standalone/farewell": msg("Bye!"),
          // "standalone/greeting": msg("Hi!"),
        });
        const catalogJa = new Catalog<Vocabulary>("ja", {
          // "standalone/ask": msg("きみ、{name}?"),
          "standalone/farewell": msg("んじゃ!"),
          // "standalone/greeting": msg("んちゃ!"),
        });
        const book = new Book<Vocabulary>({ en: catalogEn, ja: catalogJa });

        {
          const { t } = getTranslator(book, "en");
          t("standalone/farewell");
          // @ts-ignore
          t("standalone/ask", { name: "John" });
          // @ts-ignore
          t("standalone/answer");
        }
      `,
    },
  ],
});
