import { afterAll, describe, it } from "vitest";
import * as tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./no-unused-translation-ids-in-types.js";

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
}).run("no-unused-translation-ids-in-types", rule, {
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
      errors: [
        { messageId: "unused-translation-id" },
        { messageId: "unused-translation-id" },
      ],
      output: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message,
          // "example/greeting2": Message,
          "example/greeting3": Message,
          // "example/greeting4": Message,
          // "example/multiline": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>,
          // "example/multiline2": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>,
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
      errors: [
        { messageId: "unused-translation-id" },
        { messageId: "unused-translation-id" },
      ],
      output: `
        import { Book } from "@hi18n/core";
        import type { Message } from "@hi18n/core";
        export type Vocabulary = {
          "example/greeting": Message;
          // "example/greeting2": Message;
          "example/greeting3": Message;
          // "example/greeting4": Message;
          // "example/multiline": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>;
          // "example/multiline2": Message<{
          //   param1: number;
          //   param2: number;
          //   param3: number;
          // }>;
        };
        export const book = new Book<Vocabulary>({});
      `,
    },
  ],
});
