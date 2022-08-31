## `@hi18n/connector-i18n-js`

This is a converter between hi18n (`@hi18n/*`) and [i18n-js](https://github.com/fnando/i18n).

Currently, only the importer is implemented.

### Configuration

```javascript
// .hi18nrc.js
module.exports = {
  connector: "@hi18n/connector-i18n-js",
  connectorOptions: {
    root: ".",
    include: ["config/locales/*.yml"],
  },
};
```

- `root` ... a path to the i18n-js's project root, relative to hi18n's configuration file.
  Defaults to `.`.
- `include` ... An array of glob paths to YAML files containing the translations.
  Defaults to `["config/locales/*.yml"]`.
