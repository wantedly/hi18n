import { afterAll, describe, it } from "vitest";
import * as espree from "espree";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./prefer-message-style.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: {
    parser: espree,
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
}).run("prefer-message-style", rule, {
  valid: [
    {
      name: "when simpleMessageStyle=no-preference, accepts both types of messages",
      options: [{ simpleMessageStyle: "no-preference" }],
      code: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`foo\`,
          "example/greeting2": mf1("foo"),
        });
      `,
    },
    {
      name: "when simpleMessageStyle=js, accepts js messages",
      options: [{ simpleMessageStyle: "js" }],
      code: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`foo\`,
        });
      `,
    },
    {
      name: "when simpleMessageStyle=js, accepts mf1 messages",
      options: [{ simpleMessageStyle: "mf1" }],
      code: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": mf1("foo"),
        });
      `,
    },
  ],
  invalid: [
    {
      name: "when simpleMessageStyle=js, rejects mf1 messages",
      options: [{ simpleMessageStyle: "js" }],
      code: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": mf1("foo"),
        });
      `,
      errors: [{ messageId: "prefer-js-style" }],
      output: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`foo\`,
        });
      `,
    },
    {
      name: "when simpleMessageStyle=mf1, rejects js messages",
      options: [{ simpleMessageStyle: "mf1" }],
      code: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`foo\`,
        });
      `,
      errors: [{ messageId: "prefer-mf1-style" }],
      output: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": mf1("foo"),
        });
      `,
    },
    {
      name: "when simpleMessageStyle=mf1 but part of the text is unknown, rejects js messages and does not auto-fix",
      options: [{ simpleMessageStyle: "mf1" }],
      code: `
        import { Catalog } from "@hi18n/core";
        import { mf1, msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": "foo " + foo,
        });
      `,
      errors: [{ messageId: "prefer-mf1-style" }],
    },
  ],
});
