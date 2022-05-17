## Unreleased

- Automatically include the plugin in the "recommended" config.

## 0.1.3

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Add a new rule `@hi18n/migrate-from-lingui` implementing semi-automatic codemod as autofix.
  This rule is turned off by default.
- Fix error where codes like `const [, x] = [];` cannot appear with `import { Translate } from "@hi18n/react";`.

## 0.1.2

- Internal: add support for `translationId`, `t.todo` and `<Translate.Todo>` (for use in `@hi18n/cli`)

## 0.1.1

- Fix wrong rule names in the recommended config

## 0.1.0

Initial release.
