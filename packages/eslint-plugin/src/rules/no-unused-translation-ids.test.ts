import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-unused-translation-ids";

new TSESLint.RuleTester({
  parser: require.resolve("espree"),
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
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
        "@hi18n/used-translation-ids": [
          "example/greeting",
          "example/greeting2",
          "example/greeting3",
          "example/multiline",
        ],
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
        "@hi18n/used-translation-ids": [
          "example/greeting",
          "example/greeting3",
          "example/greeting4",
          "example/multiline2",
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: ["unused translation id" as any, "unused translation id"],
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
  ],
});
