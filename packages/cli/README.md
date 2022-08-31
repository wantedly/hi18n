# Command line tool for [hi18n](https://github.com/wantedly/hi18n)

See [hi18n's README](https://github.com/wantedly/hi18n#readme) for general information.

## hi18n sync

```
hi18n sync [...files] --ignore <glob>
```

Synchronizes unused and missing translations.

## hi18n export

```
hi18n export
```

Exports hi18n's data into external files. You must configure `connector` / `connectorOptions` before using it.

## Configuration

Configuration is loaded via [cosmiconfig](https://github.com/davidtheclark/cosmiconfig). Cosmiconfig's documentation explains a lot, but in short, it reads:

- `hi18n` property in `package.json`
- `.hi18nrc`
- `.hi18nrc.json`
- `.hi18nrc.yaml`
- `.hi18nrc.yml`
- `.hi18nrc.js`
- `.hi18nrc.cjs`
- `hi18n.config.js`
- `hi18n.config.cjs`

### `include` and `exclude`

```javascript
// .hi18nrc.js
module.exports = {
  include: ["src/**/*.ts", "src/**/*.tsx"],
  exclude: ["**/*.d.ts"],
};
```

- `include` is a required field unless given as a command-line argument.
  This is a list of JavaScript/TypeScript files that hi18n reads.
  Make sure to include:
  - All files that declare Catalog, Vocabulary, or Book, and
  - all files that use translation.
- `exclude` is an optional field that hi18n should not read.
  This is useful if hi18n fails to parse some files.

Both `include` and `exclude` are processed by [glob](https://www.npmjs.com/package/glob).

### `parser` and `parserOptions`

```javascript
// .hi18nrc.js
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
};
```

These configurations resemble [those in ESLint](https://eslint.org/docs/user-guide/configuring/language-options). See ESLint's docs for details.

Default:

```javascript
{
  parser: "@babel/eslint-parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}
```

### `extensions`

```javascript
// .hi18nrc.js
module.exports = {
  extensions: ["...", ".mjsx", ".cjsx"],
};
```

Configures extensions to resolve. `...` will be expanded to the default list.

Default: `.js`, `.cjs`, `.mjs`, `.ts`, `.cts`, `.mts`, `.jsx`, `.tsx`

### `extensionsToRemove`

```javascript
// .hi18nrc.js
module.exports = {
  extensions: ["...", ".json"],
};
```

Configures extensions to remove before resolving paths. `...` will be expanded to the default list.

Default: `.js`, `.cjs`, `.mjs`

### `baseUrl`

```javascript
// .hi18nrc.js
module.exports = {
  baseUrl: ".",
};
```

Maps the specified directory to the virtual root of the package tree.

It resembles the behavior of [tsconfig's baseUrl](https://www.typescriptlang.org/tsconfig#baseUrl).

Default: `undefined`, meaning paths such as `jquery` will be only searched for in node_modules.

### `paths`

```javascript
// .hi18nrc.js
module.exports = {
  baseUrl: ".",
  paths: {
    "@/*": ["src/components/*"],
  },
};
```

Configures path mapping. Requires `baseUrl` to be set.

It resembles the behavior of [tsconfig's paths](https://www.typescriptlang.org/tsconfig#paths).

### `connector` / `connectorOptions`

```javascript
// .hi18nrc.js
module.exports = {
  connector: "@hi18n/cli/json-mf-connector",
  connectorOptions: {
    path: "./export.json",
  },
};
```

Configures export/import functionality.

- You can export data using `hi18n export` command.
- You can import data using `hi18n sync` command (called passive importing).
  It uses the imported data only when the new translation is requested and
  the translation id matches one of the imported translations.
- Active importing is not yet implemented.

`connector` must be one of the following:

- `@hi18n/cli/json-mf-connector` is treated specially and refers to `@hi18n/cli`'s built-in connector.
- A path to a module. See `@hi18n/tools-core`'s API references for necessary APIs to implement connectors.
  - `@hi18n/connector-i18n-js` is a connector for [i18n-js](https://github.com/fnando/i18n).

The builtin connector `@hi18n/cli/json-mf-connector` accepts the following options:

- `path` (required) ... a file path to the JSON file.
