## Unreleased

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Add `"sideEffects": false` for better tree-shaking.
- Add `useLocales` to get the context without immediately converting it to the translator object.
  - `useI18n` now internally uses `useLocales`. Be careful if you have a locale named `""` (empty string), which I believe is very rare.
- `useI18n` now memoizes the translator object.
  You get the identical object or function in the same element until the book or the locale changes.
- Add `renderInElement` prop to `<Translate>`.

## 0.1.1

- Add `Translate.Dynamic` for dynamically selecting translations
- Add `Translate.Todo` for bootstrapping new translations
- Fix "Cannot find module react/jsx-runtime" error with ESM (dist/index.mjs).

## 0.1.0

Initial release.
