# hi18n: message internationalization meets immutability and type-safety

## Quickstart

Installation:

```
npm install @hi18n/core @hi18n/react-context @hi18n/react
npm install -D hi18n

# Or:

yarn add @hi18n/core @hi18n/react-context @hi18n/react
yarn add -D hi18n
```

Put the following file named like `src/locale/index.ts`:

```typescript
import { Book, Catalog, Message, msg } from "@hi18n/core";

type Vocabulary = {
  "example/greeting": Message<{ name: string }>;
};
const catalogEn = new Catalog<Vocabulary>({
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

Use the following command to synchronize vocabularies and catalogs:

```
hi18n sync 'src/**/*.ts' 'src/**/*.tsx'
```

It does the following:

- It collects all book definitions, catalog definitions, vocabulary definitions and translation usages in the given files.
- For each books:
  - If there are unused translation in the vocabulary or in the catalogs, it comments out the relavant definitions.
  - If there are missing translation referenced from somewhere, it adds the skeleton convenient for working on the translation. If there are previously commented out definitions, it instead uncomments these lines.

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
const catalogEn = new Catalog<Vocabulary>({ ... });
const catalogJa = new Catalog<Vocabulary>({ ... });
export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
```

In the multi-file configuration, it is recommended to use the default exports.

```typescript
// en.ts
export default new Catalog<Vocabulary>({ ... });

// ja.ts
export default new Catalog<Vocabulary>({ ... });

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

- Unquoted literal messages:
  - Any characters except `{`, `}`, `'`, `<`, and `#` are interpreted literally.
  - `'` is interpreted literally if not followed by `{`, `}`, `'`, `<`, `#` or `|`.
  - `#` is interpreted literally except directly under the plural/selectordinal argument.
- Escapes:
  - `''` is interpreted as a single apostrophe.
- Quoted texts:
  - `'` starts a quoted text if followed by `{`, `}`, `<`, `#` or `|`.
    - Within a quoted text, any characters except `'` are interpreted literally.
    - Within a quoted text, `''` is interpreted as a single apostrophe.
    - Within a quoted text, `'` not followed by another `'` ends the quote.
- Argument formatting with `{` ... `}`
  - Except specified, whitespaces are allowed between tokens in the argument specifiers.
  - `{foo}` inserts the string argument `foo`.
    - Argument name may be an identifier-like (like `foo123`) or a number (like `42`).
  - `{foo,number}` formats the argument `foo` as a number. The following formats are available:
    - `{foo,number}`
      - `{foo,number,integer}` (not implemented yet)
      - `{foo,number,currency}` (not implemented yet)
      - `{foo,number,percent}` (not implemented yet)
      - `{foo,number,::<skeleton>}` (not implemented yet)
    - `{foo,spellout}` (not implemented yet)
    - `{foo,ordinal}` (not implemented yet)
    - `{foo,date}` (not implemented yet)
      - `{foo,date,short}` (not implemented yet)
      - `{foo,date,medium}` (not implemented yet)
      - `{foo,date,long}` (not implemented yet)
      - `{foo,date,full}` (not implemented yet)
      - `{foo,date,::<skeleton>}` (not implemented yet)
    - `{foo,time}` (not implemented yet)
      - `{foo,time,short}` (not implemented yet)
      - `{foo,time,medium}` (not implemented yet)
      - `{foo,time,long}` (not implemented yet)
      - `{foo,time,full}` (not implemented yet)
    - `{foo,duration}` (not implemented yet)
  - `{foo,plural,...}` switches messages based on the plural forms of the number `foo`.
    - Optional offset `offset: 1` follows after `plural,`. There is no whitespace between `offset` and `:`.
    - After that, branches follow. Each branch is one of:
      - Exact match `=1 {There is one apple.}`. There is no whitespace between `=` and the number.
      - Plural form match `many {There are # apples.}`
      - Catchall branch `other {There are # apples.}`. The last branch must be a catchall branch.
    - Example: `{count,plural,one{There is # apple.}other{There are # apples.}}`
  - `{foo,selectordinal,...}` is a variant of `plural` for ordinals instead of cardinals.
  - `{foo,select,...}` is a simple string-based branch like `{gender,select,female{...}male{...}other{...}}` (not implemented yet)
- Within plural, `#` refers to the number we are branching on.
- Component formatting with `<>` ... `</>`
  - Part of the message can be enclosed with `<foo>` and `</foo>`. This is handled by a framework-specific interpolator. One such example is `@hi18n/react`'s `<Translate>` component.
    - `<foo` and `</foo` should not contain whitespace.
