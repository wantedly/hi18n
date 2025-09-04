## `@hi18n/eslint-plugin`

This is a collection of ESLint rules to enforce correct and conventional uses
of [hi18n](https://github.com/wantedly/hi18n), an internationalization library.

It also contains rules internally used by `@hi18n/cli`.

## Configuration example

```
npm install -D @hi18n/eslint-plugin
# Or:
yarn add -D @hi18n/eslint-plugin
```

And:

```javascript
// eslint.config.js
import hi18n from "@hi18n/eslint-plugin";

export default [
  // ...

  hi18n.configs["flat/recommended"],
  // Useful if TypeScript is configured in your project
  hi18n.configs["flat/recommended-type-checked-only"],

  // ...
];
```
