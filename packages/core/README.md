## Core library for [hi18n](https://github.com/wantedly/hi18n)

See [hi18n's README](https://github.com/wantedly/hi18n#readme) for general information.

## msg

Returns the first argument. Used for type-safe translations.

```typescript
export default new Catalog<Vocabulary>("en", {
  "example/greeting": msg("Hello, {name}!"),
});
```

## Catalog

Creates a set of translated messages for a specific locale.

```typescript
export default new Catalog<Vocabulary>("en", {
  "example/greeting": msg("Hello, {name}!"),
});
```

## Book

Creates a set of translated messages for all supported locales.

```typescript
const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
```

## getTranslator

Retrieves a translation helper from a book and a locale.

```typescript
const { t } = getTranslator(book, "ja");
t("example/greeting", { name: "太郎" });
```
