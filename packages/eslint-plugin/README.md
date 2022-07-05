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
// .eslintrc.js
module.exports = {
  extends: [
    // ...
    "plugin:@hi18n/recommended",
    // Useful if TypeScript is configured in your project
    "plugin:@hi18n/recommended-requiring-type-checking",
  ],
  // ...
};
```
