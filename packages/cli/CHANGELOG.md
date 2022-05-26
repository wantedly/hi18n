## Unreleased

- Implement `hi18n sync --check` (shorthand: `-c`) option to raise an error when files would be changed.
  It is useful when you want to ensure synchronization in your CI.
- Switched command line parser (yargs to commander). The behavior may slightly change.
- Fix `TypeError: Cannot read properties of undefined (reading 'node')`
  on an empty Vocabulary or an empty Catalog.

## 0.1.4

- Placeholder is changed from `msg()` to `msg.todo("[TODO: example/greeting]")`.

## 0.1.3

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Fix error where codes like `const [, x] = [];` cannot appear with `import { Translate } from "@hi18n/react";`.

## 0.1.2

- Add support for `translationId`, `t.todo` and `<Translate.Todo>`

## 0.1.1

- Fix binary name

## 0.1.0

Initial release.
