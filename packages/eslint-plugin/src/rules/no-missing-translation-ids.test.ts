import { describe, it } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-missing-translation-ids";

TSESLint.RuleTester.describe = describe;
TSESLint.RuleTester.it = it;

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
          "<input>?exported=default": "book.ts",
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
