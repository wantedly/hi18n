import { TSESLint } from "@typescript-eslint/utils";
import * as rule from "./no-missing-translation-ids";

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
      errors: ["missing translation ids" as any],
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
        "@hi18n/used-translation-ids": [
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
      errors: ["missing translation ids"],
      output: `
        import { Catalog, msg } from "@hi18n/core";
        export default new Catalog({
          "example/b": msg(),
          "example/c": msg("Hello!"),
          "example/d": msg(),
          "example/g": msg("Hello!"),
          "example/k": msg("Hello!"),
          "example/e": msg("Hello!"),
          "example/f": msg(),
          "example/h": msg(),
          "example/i": msg("Hello!"),
          "example/j": msg(),
          "example/l": msg(),
          "example/m": msg("Hello!"),
          "example/n": msg(),
        });
      `,
    },
  ],
});
