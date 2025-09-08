import { afterAll, describe, it } from "vitest";
import * as tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./no-missing-translation-ids-in-types.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
    },
  },
}).run("no-missing-translation-ids-in-types", rule, {
  valid: [
    {
      code: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message,
          "example/greeting2": Message,
          "example/greeting3": Message,
          // "example/greeting4": Message,
          "example/multiline": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>,
          // "example/multiline2": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>,
        };
        export const book = new Book<Vocabulary>({});
      `,
      settings: {
        "@hi18n/used-translation-ids": {
          "file.ts?exported=book": [
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
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message;
          "example/greeting2": Message;
          "example/greeting3": Message;
          // "example/greeting4": Message;
          "example/multiline": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>;
          // "example/multiline2": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>;
        };
        export const book = new Book<Vocabulary>({});
      `,
      settings: {
        "@hi18n/used-translation-ids": {
          "file.ts?exported=book": [
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
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message,
          "example/greeting2": Message,
          "example/greeting3": Message,
          // "example/greeting4": Message,
          "example/multiline": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>,
          // "example/multiline2": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>,
        };
        export const book = new Book<Vocabulary>({});
      `,
      settings: {
        "@hi18n/used-translation-ids": {
          "file.ts?exported=book": [
            "example/greeting",
            "example/greeting3",
            "example/greeting4",
            "example/multiline2",
          ],
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message,
          "example/greeting2": Message,
          "example/greeting3": Message,
          "example/greeting4": Message,
          "example/multiline": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>,
          "example/multiline2": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>,
        };
        export const book = new Book<Vocabulary>({});
      `,
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message;
          "example/greeting2": Message;
          "example/greeting3": Message;
          // "example/greeting4": Message;
          "example/multiline": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>;
          // "example/multiline2": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>;
        };
        export const book = new Book<Vocabulary>({});
      `,
      settings: {
        "@hi18n/used-translation-ids": {
          "file.ts?exported=book": [
            "example/greeting",
            "example/greeting3",
            "example/greeting4",
            "example/multiline2",
          ],
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message;
          "example/greeting2": Message;
          "example/greeting3": Message;
          "example/greeting4": Message;
          "example/multiline": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>;
          "example/multiline2": Message<{
            param1: number;
            param2: number;
            param3: number;
          }>;
        };
        export const book = new Book<Vocabulary>({});
      `,
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/c": Message,
          "example/g": Message,
          "example/k": Message,
          "example/e": Message,
          "example/i": Message,
          "example/m": Message,
        };
        export const book = new Book<Vocabulary>({});
      `,
      settings: {
        "@hi18n/used-translation-ids": {
          "file.ts?exported=book": [
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
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/b": Message;
          "example/c": Message,
          "example/d": Message;
          "example/g": Message,
          "example/k": Message,
          "example/e": Message,
          "example/f": Message;
          "example/h": Message;
          "example/i": Message,
          "example/j": Message;
          "example/l": Message;
          "example/m": Message,
          "example/n": Message;
        };
        export const book = new Book<Vocabulary>({});
      `,
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/c": Message;
          "example/g": Message;
          "example/k": Message;
          "example/e": Message;
          "example/i": Message;
          "example/m": Message;
        };
        export const book = new Book<Vocabulary>({});
      `,
      settings: {
        "@hi18n/used-translation-ids": {
          "file.ts?exported=book": [
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
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/b": Message;
          "example/c": Message;
          "example/d": Message;
          "example/g": Message;
          "example/k": Message;
          "example/e": Message;
          "example/f": Message;
          "example/h": Message;
          "example/i": Message;
          "example/j": Message;
          "example/l": Message;
          "example/m": Message;
          "example/n": Message;
        };
        export const book = new Book<Vocabulary>({});
      `,
    },
    {
      code: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {};
        export const book = new Book<Vocabulary>({});
      `,
      settings: {
        "@hi18n/used-translation-ids": {
          "file.ts?exported=book": ["example/greeting"],
        },
      },
      errors: [{ messageId: "missing-translation-ids" }],
      output: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message;};
        export const book = new Book<Vocabulary>({});
      `,
    },
  ],
});
