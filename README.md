# hi18n: message internationalization meets immutability and type-safety

## Quickstart

Installation:

```
npm install @hi18n/core @hi18n/react-context @hi18n/react
npm install -D @hi18n/cli

# Or:

yarn add @hi18n/core @hi18n/react-context @hi18n/react
yarn add -D @hi18n/cli
```

Put the following file named like `src/locale/index.ts`:

```typescript
import { Book, Catalog, Message, msg } from "@hi18n/core";

type Vocabulary = {
  "example/greeting": Message<{ name: string }>;
};
const catalogEn = new Catalog<Vocabulary>("en", {
  "example/greeting": msg("Hello, {name}!"),
});
export const book = new Book<Vocabulary>({ en: catalogEn });
```

And you can use the translation anywhere like:

```typescript
import React from "react";
import { useI18n } from "@hi18n/react";
import { book } from "../locale";

export const Greeting: React.FC = () => {
  // Locale can be configured via <LocaleProvider>
  const { t } = useI18n(book);
  return <p>{t("example/greeting", { name: "John" })}</p>;
};
```

Instead of `useI18n`, you can also use the following items for translation:

- `getTranslator` from `@hi18n/core`
- `<Translate>` component from `@hi18n/react`

## Updating vocabularies and catalogs

To update vocabularies and catalogs, first put a configuration:

```javascript
module.exports = {
  // The files that hi18n should read
  include: ["src/**/*.ts", "src/**/*.tsx"],
};
```

Then use the following command to synchronize vocabularies and catalogs:

```
hi18n sync
```

Alternatively you can directly specify what files to include:

```
hi18n sync 'src/**/*.ts' 'src/**/*.tsx'
```

It does the following:

- It collects all book definitions, catalog definitions, vocabulary definitions and translation usages in the given files.
- For each books:
  - If there are unused translation in the vocabulary or in the catalogs, it comments out the relavant definitions.
  - If there are missing translation referenced from somewhere, it adds the skeleton convenient for working on the translation. If there are previously commented out definitions, it instead uncomments these lines.

## Adding new translations

### Implementation-first way

You can use "todo" versions of the translation functions:

- `t.todo("example/new")` instead of `t("example/new")`
- `<Translate.Todo id="example/new" book={book} />` instead of `<Translate id="example/new" book={book} />`

Then run `hi18n sync` and the CLI automatically prepares the skeleton for you.

(Ideally `hi18n sync` should also remove the `.todo` part but it is not implemented yet)

### Translation-first way

You can manually edit your data, and then add the corresponding implementation that makes use of the new translation.

## Dynamically selecting translation ids

You can use `translationId` in conjunction with `t.dynamic` to select translation ids dynamically.

```typescript
const menus = [
  {
    url: "https://example.com/home",
    titleId: translationId("menu/home/title"),
    tooltipId: translationId("menu/home/tooltip"),
  },
  {
    url: "https://example.com/map",
    titleId: translationId("menu/map/title"),
    tooltipId: translationId("menu/map/tooltip"),
  },
];

// Translate menu title
t.dynamic(menus[i].titleId); // Works like t("menu/home/title")
```

There is also `<Translate.Dynamic/>` which works like `<Translate/>`.

## Concepts

- Translation id
  - A string representing a message to be translated. It can be arbitrary strings but we recommend using one of:
    - Slash-separated names like `example/greeting`
    - Or, message in your project's main language like `Hello, {name}!`
- Translated message
  - A message in each locale, like `こんにちは、{name}さん!`. It may contain placeholders.
- Catalog
  - A set of translated messages in a specific locale. More precisely, it contains a mapping from translation ids to translation messages.
- Book
  - A set of catalogs over all supported locales.
  - A project may contain multiple books. This is useful for splitting data to reduce chunk sizes.
- Locale provider
  - Something that tells you the current locale.
  - Existing locale providers:
    - `@hi18n/react`
    - Custom locale provider
- Translator, translation helper
  - The actual function to get the translated and evaluated message.
  - You can acquire a translator by supplying a book and the current locale.

Books and locale providers are orthogonal. You can have multiple books and multiple locale providers in a single project.

You combine books and locales in each file. It may require you some effort at first, but provides the better experience in the long run.

```typescript
// useI18n -- locale provider
import { useI18n } from "@hi18n/react";
// book
import { book } from "../locale";

// You do this in each file
const { t } = useI18n(book);
```

## File layout

### Referencing catalogs from books

Catalogs must be referenced by one of the following ways:

- Single-file configuration: referenced as a toplevel file-scope local variable in the same file
- Multi-file configuration: referenced as a module export

In the single-file configuration, it is recommended to use the name `catalogEn` for English for example.

```typescript
// Top-level file-scope local variables
const catalogEn = new Catalog<Vocabulary>("en", { ... });
const catalogJa = new Catalog<Vocabulary>("ja", { ... });
export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
```

In the multi-file configuration, it is recommended to use the default exports.

```typescript
// en.ts
export default new Catalog<Vocabulary>("en", { ... });

// ja.ts
export default new Catalog<Vocabulary>("ja", { ... });

// index.ts
import catalogEn from "./en";
import catalogJa from "./ja";
export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
```

### Referencing books from the application code

Books must also be referenced by one of the following ways:

- Single-file configuration: referenced as a toplevel file-scope local variable in the same file
- Multi-file configuration: referenced as a module export

Multi-file configuration is recommended. In that case, it is recommended to use the name `book` for the export.

```typescript
// src/locale/index.ts
export const book = new Book<Vocabulary>({ ...  });

// src/components/greeting.ts
import { book } from "../locale";
const { t } = useI18n(book);
```

## Message syntax

Message roughly resembles [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/).

- Simple message: `Hello, world!`
- Interpolation: `Hello, {name}!`
- Interleaving with markups: `Please <link>read the license agreement</link> before continuing.`

See [formatting.md](docs/formatting.md) for more details.

## Loading only a specific language

If you have many languages to support, you want to load only a specific locale. This is possible by the following steps:

1. Declare dynamic loading in a book
2. Preload catalogs before rendering

### Declare dynamic loading in a book

Switch from:

```typescript
import catalogEn from "./en";
import catalogJa from "./ja";

export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
```

to:

```typescript
export const book = new Book<Vocabulary>({
  en: () => import("./en"),
  ja: () => import("./ja"),
});
```

Then hi18n does not load the catalogs immediately;
instead you need to tell hi18n to load a specific catalog
when you know which language to use.

### Preload catalogs before rendering

Switch from:

```tsx
// Start the app
root.render(
  <LocaleProvider locales="en">
    <App />
  </LocaleProvider>,
);
```

to:

```tsx
import { book } from "./path/to/translations";
import { preloadCatalogs } from "@hi18n/core";

await preloadCatalogs(book, "en");

// Start the app
root.render(
  <LocaleProvider locales="en">
    <App />
  </LocaleProvider>,
);
```

to ensure catalogs are loaded before rendering.

You may want to use `Promise.prototype.then` instead:

```tsx
import { book } from "./path/to/translations";
import { preloadCatalogs } from "@hi18n/core";

preloadCatalogs(book, "en")
  .then(() => {
    // Start the app
    root.render(
      <LocaleProvider locales="en">
        <App />
      </LocaleProvider>,
    );
  })
  .catch((e) => {
    console.error("load error");
  });
```

### Alternative: React Suspense

If you are using React, you may instead use React Suspense to wait for the translations to be loaded.

```tsx
// Start the app
root.render(
  <LocaleProvider locales="en">
    {/* when the translations are not yet available, loadingPage will be shown */}
    <React.Suspense fallback={loadingPage}>
      <App />
    </React.Suspense>
  </LocaleProvider>,
);
```

Then simply use the React API (`useI18n` or `<Translate>`) against dynamically loaded books.

This is an **experimental API** which relies on React's undocumented API for suspension. The feature may break if React removes or changes the undocumented API.
