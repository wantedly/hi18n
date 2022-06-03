# Command line tool for [hi18n](https://github.com/wantedly/hi18n)

See [hi18n's README](https://github.com/wantedly/hi18n#readme) for general information.

## hi18n sync

```
hi18n sync <...files> --ignore <glob>
```

Synchronizes unused and missing translations.

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
