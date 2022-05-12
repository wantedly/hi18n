import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-unused-translation-ids-in-types";
import type {} from "../tseslint-babel";

new TSESLint.RuleTester({
  parser: require.resolve("@babel/eslint-parser"),
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    babelOptions: {
      parserOpts: {
        plugins: ["typescript"],
      },
    },
  },
}).run("@hi18n/no-unused-translation-ids-in-types", rule, {
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
          "<input>?exported=book": [
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
          "<input>?exported=book": [
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
          "<input>?exported=book": [
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
          "<input>?exported=book": [
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
