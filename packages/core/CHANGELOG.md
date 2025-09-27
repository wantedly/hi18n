# `@hi18n/core`

## 0.2.5

### Patch Changes

- ba03f1b: chore(monorepo): use references in tsconfig

## 0.2.4

### Patch Changes

- da85d77: fix(core): transpile class static initialization blocks

## 0.2.3

### Patch Changes

- ccb20f3: fix(core): check template escape correctness

## 0.2.2

### Patch Changes

- 7ab7369: fix(core): add missing export of tag

## 0.2.1

### Patch Changes

- 28fb275: feat(core): add new message builder

## 0.2.0

### Migration Guide

#### Removed deprecated Catalog constructor overload

Now you cannot do this:

```typescript
const catalogEn = new Catalog<Vocabulary>({
  "example/greeting": msg("Hello, {name}!"),
});
```

Instead, put the language tag in the first argument.
It should match the tag used when building the Book instance.

```typescript
const catalogEn = new Catalog<Vocabulary>("en", {
  "example/greeting": msg("Hello, {name}!"),
});
```

#### Use of `msg()` is now mandatory when building a Catalog

Now you cannot do this:

```javascript
import { Catalog } from "@hi18n/core";

const catalogEn = new Catalog("en", {
  "example/greeting": "Hello, {name}!",
});
```

Instead, you must wrap the message in `msg()` utility.

```javascript
import { Catalog, msg } from "@hi18n/core";

const catalogEn = new Catalog("en", {
  "example/greeting": msg("Hello, {name}!"),
});
```

### Minor Changes

- 1ddccf8: BREAKING CHANGE: remove deprecated Catalog constructor overload
- d44fd6d: feat(core)!: require use of msg()

## 0.1.16

### Patch Changes

- e40e31c: chore(ts): enable verbatimModuleSyntax and isolatedDeclarations
- 40b5c82: chore(ts): import ts files as \*.ts

## 0.1.15

### Patch Changes

- c478ab5: feat(eslint): support ESLint 9

## 0.1.14

### Patch Changes

- 9a55438: chore(build): Use TypeScript to build packages

## 0.1.13

### Patch Changes

- 19e0ca6: chore(build): bump TypeScript to 5.9

## 0.1.12

### Patch Changes

- d3f3120: chore(misc): migrate from Jest to Vitest

## 0.1.11

### Patch Changes

- bafd25f: chore(misc): Test in Node.js 22
- fbe729b: Align CHANGELOG format with Changesets
- 38253a0: chore(misc): use pnpm mode
- 6a5c0bd: chore(misc): set up Changesets to manage releases

## 0.1.10

### Patch Changes

- Prevent minifier from changing error name

## 0.1.9

### Patch Changes

- New APIs for dynamically loading Catalogs of specific languages.
  - Generalized `Book` constructor. Now you can pass lazy-loading function `() => import("...")` where a catalog object has been expected.
  - `preloadCatalogs(book, locales)` to start loading catalogs. There is also `Book.prototype.loadCatalog()` but the former is preferred.
  - `getTranslator` accepts a new `throwPromise` option. When `throwPromise` is true, it throws a Promise instance instead of a "catalog not loaded" error. This is used to support React Suspense in `@hi18n/react`.

## 0.1.8

### Patch Changes

- Implement fallbacks in case of missing Intl in the following cases:
  - If `Intl.NumberFormat` is missing, it falls back to `toString` in `{arg,number}` and `{arg,number,integer}`.
  - If `Intl.PluralRules` is missing, it falls back to the "other" branch in `{arg,plural,...}`.
    - Exact matches like `=0` are still valid.

## 0.1.7

### Patch Changes

- Add `handleError` option to `new Book`.
  The option can be passed as part of a second argument to the constructor.
  With this option, you can ignore certain errors and report it in background instead.
- Add `implicitLocale` option to `new Book`.
  The option can be passed as part of a second argument to the constructor.
  This option can be used in conjunction with `handleError` to fall back to English (or another language of your option)
  in case someone forgets to configure locales before rendering.
- Refactored error class hierarchy. Now the following classes are exposed:
  - `MessageError`
  - `MissingTranslationError`
  - `NoLocaleError`
  - `MissingLocaleError`
  - `ParseError`
  - `MessageEvaluationError`
  - `MissingArgumentError`
  - `ArgumentTypeError`

## 0.1.6

### Patch Changes

- Add a new overload for `new Catalog` constructor. It accepts a locale identifier as the first argument.
  - Please make sure to update the ESLint plugin / CLI too to support the new format.
  - The old overload is deprecated.

## 0.1.5

### Patch Changes

- Include less polyfills from core-js.
- Reduce polyfill for matchAll and Array.prototype.includes.
- Fix error when Date is mocked in a certain way like `@sinonjs/fake-timers`.

## 0.1.4

### Patch Changes

- Support `offset:` parameter in plural translations.
- Fix bug where date skeletons `{foo,date,::MMMMdjmm}` is not actually applied.

## 0.1.3

### Patch Changes

- Support `#` in plural translations.
- Implement `{foo,number,integer}` and `{foo,number,percent}` formats.
- Implement the following date/time formats:
  - `{foo,date}`
  - `{foo,date,short}`
  - `{foo,date,medium}`
  - `{foo,date,long}`
  - `{foo,date,full}`
  - `{foo,date,::MMMMdjmm}`, etc. where `MMMMdjmm` is a format string called skeleton.
  - `{foo,time}`
  - `{foo,time,short}`
  - `{foo,time,medium}`
  - `{foo,time,long}`
  - `{foo,time,full}`
- Add `msg.todo`.

## 0.1.2

### Patch Changes

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Add `"sideEffects": false` for better tree-shaking.
- Accept multiple locales in `getTranslator`. For now, only the first element is relevant.

## 0.1.1

### Patch Changes

- Add `translationId` and `t.dynamic` for dynamically selecting translations
- Add `t.todo` for bootstrapping new translations

## 0.1.0

### Patch Changes

Initial release.
