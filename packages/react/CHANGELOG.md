## Unreleased

- Add prepack script. It allows you to use unreleased versions from git with yarn v2 or later.
- Add `"sideEffects": false` for better tree-shaking.
- Add `useLocales` to get the context without immediately converting it to the translator object.

## 0.1.1

- Add `Translate.Dynamic` for dynamically selecting translations
- Add `Translate.Todo` for bootstrapping new translations
- Fix "Cannot find module react/jsx-runtime" error with ESM (dist/index.mjs).

## 0.1.0

Initial release.
