## Unreleased

- Support `offset:` parameter in plural translations.

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
