# `@hi18n/cli`

## 0.1.14

### Patch Changes

- 10baf8f: fix(monorepo): ensure workspace dependencies are removed from published materials
- 19e0ca6: chore(build): bump TypeScript to 5.9
- Updated dependencies [10baf8f]
- Updated dependencies [19e0ca6]
  - @hi18n/eslint-plugin@0.1.12
  - @hi18n/tools-core@0.1.4

## 0.1.13

### Patch Changes

- d3f3120: chore(misc): migrate from Jest to Vitest
- Updated dependencies [d3f3120]
  - @hi18n/eslint-plugin@0.1.11
  - @hi18n/tools-core@0.1.3

## 0.1.12

### Patch Changes

- bafd25f: chore(misc): Test in Node.js 22
- fbe729b: Align CHANGELOG format with Changesets
- 38253a0: chore(misc): use pnpm mode
- 6a5c0bd: chore(misc): set up Changesets to manage releases
- Updated dependencies [bafd25f]
- Updated dependencies [fbe729b]
- Updated dependencies [38253a0]
- Updated dependencies [6a5c0bd]
  - @hi18n/eslint-plugin@0.1.10
  - @hi18n/tools-core@0.1.2

## 0.1.11

### Patch Changes

- Bump `@hi18n/tools-core`

## 0.1.10

### Patch Changes

- Add `connector`/`connectorOptions` configurations.
- Add `hi18n export` command.
  - When `connector` is configured, it exports hi18n's translation data to the specified format.
- Implement passive importing in `hi18n sync`.
  - When `connector` is configured, the corresponding external source is referenced
    to complement missing translations.

## 0.1.9

### Patch Changes

- Add `config.include` and `config.exclude` options in `.hi18nrc.js` that replace the corresponding command line options.
  - Just type `hi18n sync` and you get your translations synchronized.
  - This is now a recommended way to configure the command.

## 0.1.8

### Patch Changes

- Support dynamically-loaded Catalogs introduced in `@hi18n/core` 0.1.9.

## 0.1.7

### Patch Changes

- Support a new overload for `new Catalog` constructor introduced in `@hi18n/core` 0.1.6. It accepts a locale identifier as the first argument.

## 0.1.6

### Patch Changes

- Resolver improvements
  - Make `extensions` configurable
  - Support path mapping via `baseUrl` and `paths` similarly to tsconfig.
  - Remove specific extensions (e.g. `.js`) before resolving paths.
    - This is useful if you do not omit extensions to support Node.js ESM and the path is actually being resolved with a different extension (e.g. `.js` being resolved as `.ts`).
- Allow configuring parsers
  - You can have `parser` and `parserOptions` configurations very much like in `.eslintrc`.

## 0.1.5

### Patch Changes

- Implement `hi18n sync --check` (shorthand: `-c`) option to raise an error when files would be changed.
  It is useful when you want to ensure synchronization in your CI.
- Switched command line parser (yargs to commander). The behavior may slightly change.
- Fix `TypeError: Cannot read properties of undefined (reading 'node')`
  on an empty Vocabulary or an empty Catalog.

## 0.1.4

### Patch Changes

- Placeholder is changed from `msg()` to `msg.todo("[TODO: example/greeting]")`.

## 0.1.3

### Patch Changes

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Fix error where codes like `const [, x] = [];` cannot appear with `import { Translate } from "@hi18n/react";`.

## 0.1.2

### Patch Changes

- Add support for `translationId`, `t.todo` and `<Translate.Todo>`

## 0.1.1

### Patch Changes

- Fix binary name

## 0.1.0

### Patch Changes

Initial release.
