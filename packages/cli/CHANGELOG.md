## 0.1.11

- Bump `@hi18n/tools-core`

## 0.1.10

- Add `connector`/`connectorOptions` configurations.
- Add `hi18n export` command.
  - When `connector` is configured, it exports hi18n's translation data to the specified format.
- Implement passive importing in `hi18n sync`.
  - When `connector` is configured, the corresponding external source is referenced
    to complement missing translations.

## 0.1.9

- Add `config.include` and `config.exclude` options in `.hi18nrc.js` that replace the corresponding command line options.
  - Just type `hi18n sync` and you get your translations synchronized.
  - This is now a recommended way to configure the command.

## 0.1.8

- Support dynamically-loaded Catalogs introduced in `@hi18n/core` 0.1.9.

## 0.1.7

- Support a new overload for `new Catalog` constructor introduced in `@hi18n/core` 0.1.6. It accepts a locale identifier as the first argument.

## 0.1.6

- Resolver improvements
  - Make `extensions` configurable
  - Support path mapping via `baseUrl` and `paths` similarly to tsconfig.
  - Remove specific extensions (e.g. `.js`) before resolving paths.
    - This is useful if you do not omit extensions to support Node.js ESM and the path is actually being resolved with a different extension (e.g. `.js` being resolved as `.ts`).
- Allow configuring parsers
  - You can have `parser` and `parserOptions` configurations very much like in `.eslintrc`.

## 0.1.5

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
