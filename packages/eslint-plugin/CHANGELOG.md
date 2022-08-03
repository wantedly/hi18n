## Unreleased

- Support dynamically-loaded Catalogs introduced in `@hi18n/core` 0.1.9.

## 0.1.7

- Support a new overload for `new Catalog` constructor introduced in `@hi18n/core` 0.1.6. It accepts a locale identifier as the first argument.

## 0.1.6

- Add a new rule `@hi18n/react-component-params` https://github.com/wantedly/dx/issues/702
  - This is not included in `plugin:@hi18n/recommended` because it requires type checking.
- Added a new preset `plugin:@hi18n/recommended-requiring-type-checking`
  - `@hi18n/react-component-params` is included in this preset.
- Corner case bug fix on `new Book<this>()`

## 0.1.5

- Fix `TypeError: Cannot read properties of undefined (reading 'node')`
  on an empty Vocabulary or an empty Catalog in internally used rules.

## 0.1.4

- Automatically include the plugin in the "recommended" config.
- Internal: add support for `msg.todo` (for use in `@hi18n/cli`)

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
