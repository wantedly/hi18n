## TypeScript Language Service plugin for [hi18n](https://github.com/wantedly/hi18n)

Features:

- Hover over a translation id to show the corresponding translation

## Configuration

```
npm install -D @hi18n/ts-plugin

# Or:

yarn add -D @hi18n/ts-plugin
```

Then edit tsconfig.json:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@hi18n/ts-plugin",
        "locales": ["en"]
      }
    ]
  }
}
```

In VS Code, you may need to configure the editor to use the project's TypeScript rather than the editor's built-in one.
