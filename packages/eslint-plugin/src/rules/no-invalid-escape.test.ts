import { afterAll, describe, it } from "vitest";
import * as tsParser from "@typescript-eslint/parser";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "./no-invalid-escape.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: {
    // Using tsParser here because espree rejects NotEscapeSequence
    // in tagged template literals in the first place.
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
}).run("no-invalid-escape", rule, {
  valid: [
    `
      import { Catalog } from "@hi18n/core";
      import { mf1, msg } from "@hi18n/core/msg";
      export default new Catalog("en", {
        "example/greeting": mf1("Hello!"),
        "example/greeting2": msg\`Hello!\`,
      });
    `,
    `
      import { Catalog } from "@hi18n/core";
      import { msg } from "@hi18n/core/msg";
      export default new Catalog("en", {
        "example/greeting": msg\`Hello, \\0!\`,
      });
    `,
  ],
  invalid: [
    {
      code: `
        import { Catalog } from "@hi18n/core";
        import { msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`Hello, \\00!\`,
        });
      `,
      errors: [{ messageId: "no-octal-escape" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        import { msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`Hello, \\8!\`,
        });
      `,
      errors: [{ messageId: "no-nonoctal-decimal-escape" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        import { msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`Hello, \\x7!\`,
        });
      `,
      errors: [{ messageId: "no-incomplete-hex-escape" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        import { msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`Hello, \\u{4!\`,
        });
      `,
      errors: [{ messageId: "no-incomplete-unicode-escape" }],
    },
    {
      code: `
        import { Catalog } from "@hi18n/core";
        import { msg } from "@hi18n/core/msg";
        export default new Catalog("en", {
          "example/greeting": msg\`Hello, \\u{1234567}!\`,
        });
      `,
      errors: [{ messageId: "no-large-codepoint" }],
    },
  ],
});
