## 0.1.10

- Prevent minifier from changing error name

## 0.1.9

- New APIs for dynamically loading Catalogs of specific languages.
  - Generalized `Book` constructor. Now you can pass lazy-loading function `() => import("...")` where a catalog object has been expected.
  - `preloadCatalogs(book, locales)` to start loading catalogs. There is also `Book.prototype.loadCatalog()` but the former is preferred.
  - `getTranslator` accepts a new `throwPromise` option. When `throwPromise` is true, it throws a Promise instance instead of a "catalog not loaded" error. This is used to support React Suspense in `@hi18n/react`.

## 0.1.8

- Implement fallbacks in case of missing Intl in the following cases:
  - If `Intl.NumberFormat` is missing, it falls back to `toString` in `{arg,number}` and `{arg,number,integer}`.
  - If `Intl.PluralRules` is missing, it falls back to the "other" branch in `{arg,plural,...}`.
    - Exact matches like `=0` are still valid.

## 0.1.7

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

- Add a new overload for `new Catalog` constructor. It accepts a locale identifier as the first argument.
  - Please make sure to update the ESLint plugin / CLI too to support the new format.
  - The old overload is deprecated.

## 0.1.5

- Include less polyfills from core-js.
- Reduce polyfill for matchAll and Array.prototype.includes.
- Fix error when Date is mocked in a certain way like `@sinonjs/fake-timers`.

## 0.1.4

- Support `offset:` parameter in plural translations.
- Fix bug where date skeletons `{foo,date,::MMMMdjmm}` is not actually applied.

## 0.1.3

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

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Add `"sideEffects": false` for better tree-shaking.
- Accept multiple locales in `getTranslator`. For now, only the first element is relevant.

## 0.1.1

- Add `translationId` and `t.dynamic` for dynamically selecting translations
- Add `t.todo` for bootstrapping new translations

## 0.1.0

Initial release.
