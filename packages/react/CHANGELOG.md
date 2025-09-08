# `@hi18n/react`

## 0.1.11

### Patch Changes

- e40e31c: chore(ts): enable verbatimModuleSyntax and isolatedDeclarations
- Updated dependencies [e40e31c]
- Updated dependencies [40b5c82]
  - @hi18n/core@0.1.16

## 0.1.10

### Patch Changes

- c478ab5: feat(eslint): support ESLint 9
- Updated dependencies [c478ab5]
  - @hi18n/react-context@0.1.3
  - @hi18n/core@0.1.15

## 0.1.9

### Patch Changes

- 9a55438: chore(build): Use TypeScript to build packages
- Updated dependencies [9a55438]
  - @hi18n/core@0.1.14

## 0.1.8

### Patch Changes

- 10baf8f: fix(monorepo): ensure workspace dependencies are removed from published materials
- 19e0ca6: chore(build): bump TypeScript to 5.9
- Updated dependencies [19e0ca6]
  - @hi18n/core@0.1.13

## 0.1.7

### Patch Changes

- d3f3120: chore(misc): migrate from Jest to Vitest
- a6ef0aa: chore(deps): support React 19
- 8c21974: refactor(react): future-proof context changes
- Updated dependencies [d3f3120]
- Updated dependencies [a6ef0aa]
  - @hi18n/core@0.1.12
  - @hi18n/react-context@0.1.2

## 0.1.6

### Patch Changes

- bafd25f: chore(misc): Test in Node.js 22
- fbe729b: Align CHANGELOG format with Changesets
- 38253a0: chore(misc): use pnpm mode
- 6a5c0bd: chore(misc): set up Changesets to manage releases
- Updated dependencies [bafd25f]
- Updated dependencies [fbe729b]
- Updated dependencies [38253a0]
- Updated dependencies [6a5c0bd]
  - @hi18n/core@0.1.11
  - @hi18n/react-context@0.1.1

## 0.1.5

### Patch Changes

- Add support for dynamically loading Catalogs of specific languages. For details, see the changelog for `@hi18n/core` 0.1.9.

## 0.1.4

### Patch Changes

- Allow using one React element multiple times in a translation.
  You can now add translations like `A<0/>B<0/>C` which uses
  the element `0` twice.

## 0.1.3

### Patch Changes

- Include less polyfills from core-js.

## 0.1.2

### Patch Changes

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Add `"sideEffects": false` for better tree-shaking.
- Add `useLocales` to get the context without immediately converting it to the translator object.
  - `useI18n` now internally uses `useLocales`. Be careful if you have a locale named `""` (empty string), which I believe is very rare.
- `useI18n` now memoizes the translator object.
  You get the identical object or function in the same element until the book or the locale changes.
- Add `renderInElement` prop to `<Translate>`.

## 0.1.1

### Patch Changes

- Add `Translate.Dynamic` for dynamically selecting translations
- Add `Translate.Todo` for bootstrapping new translations
- Fix "Cannot find module react/jsx-runtime" error with ESM (dist/index.mjs).

## 0.1.0

### Patch Changes

Initial release.
