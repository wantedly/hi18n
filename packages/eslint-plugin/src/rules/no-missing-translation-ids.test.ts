import { afterAll, describe, it } from "vitest";
import * as espree from "espree";
import * as tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./no-missing-translation-ids.ts";

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
}).run("no-missing-translation-ids", rule, {
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
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/greeting": msg("Hello!"),
          "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          "example/greeting4": msg("Good morning!"),
          "example/multiline": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
          "example/multiline2": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
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
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/greeting": msg("Hello!"),
          "example/greeting2": msg("Hello, world!"),
          "example/greeting3": msg("Hello again!"),
          "example/greeting4": msg("Good morning!"),
          "example/multiline": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
          "example/multiline2": msg(
            "This is a long text. This is a long text. This is a long text. This is a long text."
          ),
        });
      `,
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/c": msg("Hello!"),
          "example/g": msg("Hello!"),
          "example/k": msg("Hello!"),
          "example/e": msg("Hello!"),
          "example/i": msg("Hello!"),
          "example/m": msg("Hello!"),
        });
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": [
            "example/b",
            "example/c",
            "example/d",
            "example/e",
            "example/f",
            "example/g",
            "example/h",
            "example/i",
            "example/j",
            "example/k",
            "example/l",
            "example/m",
            "example/n",
          ],
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/b": msg.todo("[TODO: example/b]"),
          "example/c": msg("Hello!"),
          "example/d": msg.todo("[TODO: example/d]"),
          "example/g": msg("Hello!"),
          "example/k": msg("Hello!"),
          "example/e": msg("Hello!"),
          "example/f": msg.todo("[TODO: example/f]"),
          "example/h": msg.todo("[TODO: example/h]"),
          "example/i": msg("Hello!"),
          "example/j": msg.todo("[TODO: example/j]"),
          "example/l": msg.todo("[TODO: example/l]"),
          "example/m": msg("Hello!"),
          "example/n": msg.todo("[TODO: example/n]"),
        });
      `,
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/c": msg("Hello!"),
          "example/g": msg("Hello!"),
          "example/k": msg("Hello!"),
          "example/e": msg("Hello!"),
          "example/i": msg("Hello!"),
          "example/m": msg("Hello!"),
        });
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": [
            "example/b",
            "example/c",
            "example/d",
            "example/e",
            "example/f",
            "example/g",
            "example/h",
            "example/i",
            "example/j",
            "example/k",
            "example/l",
            "example/m",
            "example/n",
          ],
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/b": msg.todo("[TODO: example/b]"),
          "example/c": msg("Hello!"),
          "example/d": msg.todo("[TODO: example/d]"),
          "example/g": msg("Hello!"),
          "example/k": msg("Hello!"),
          "example/e": msg("Hello!"),
          "example/f": msg.todo("[TODO: example/f]"),
          "example/h": msg.todo("[TODO: example/h]"),
          "example/i": msg("Hello!"),
          "example/j": msg.todo("[TODO: example/j]"),
          "example/l": msg.todo("[TODO: example/l]"),
          "example/m": msg("Hello!"),
          "example/n": msg.todo("[TODO: example/n]"),
        });
      `,
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({});
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": ["example/greeting"],
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/greeting": msg.todo("[TODO: example/greeting]"),});
      `,
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {});
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": ["example/greeting"],
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/greeting": msg.todo("[TODO: example/greeting]"),});
      `,
    },
    {
      code: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/greeting2": msg("Hello, world!"),
        });
      `,
      settings: {
        "@hi18n/linkage": {
          "file.ts?exported=default": "book.ts",
        },
        "@hi18n/used-translation-ids": {
          "book.ts": ["example/greeting", "example/greeting2"],
        },
        "@hi18n/value-hints": {
          en: {
            "example/greeting": "Hello!",
          },
          ja: {
            "example/greeting": "こんにちは!",
          },
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog("en", {
          "example/greeting": msg("Hello!"),
          "example/greeting2": msg("Hello, world!"),
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
          // "standalone/greeting": Message;
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
        { messageId: "missing-translation-ids" },
        { messageId: "missing-translation-ids" },
      ],
      output: `
        import { Book, Catalog, getTranslator, Message, msg } from "@hi18n/core";

        type Vocabulary = {
          // "standalone/ask": Message<{ name: string }>;
          "standalone/farewell": Message;
          // "standalone/greeting": Message;
        };
        const catalogEn = new Catalog<Vocabulary>("en", {
          "standalone/answer": msg.todo("[TODO: standalone/answer]"),
          "standalone/ask": msg("Are you {name}?"),
          "standalone/farewell": msg("Bye!"),
          // "standalone/greeting": msg("Hi!"),
        });
        const catalogJa = new Catalog<Vocabulary>("ja", {
          "standalone/answer": msg.todo("[TODO: standalone/answer]"),
          "standalone/ask": msg("きみ、{name}?"),
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
