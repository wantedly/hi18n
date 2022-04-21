import { RuleTester } from "eslint";
import * as rule from "./no-missing-translation-ids";

new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
  },
}).run("no-missing-translation-ids", rule, {
  valid: [
    {
      code: `
        import { LocalCatalog, msg } from "@hi18n/core";
        export default new LocalCatalog({
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
    }
  ],
  invalid: [
    {
      code: `
        import { LocalCatalog, msg } from "@hi18n/core";
        export default new LocalCatalog({
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
      errors: ["missing translation ids"],
      output: `
        import { LocalCatalog, msg } from "@hi18n/core";
        export default new LocalCatalog({
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
  ],
})
