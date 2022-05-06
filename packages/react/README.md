## Core library for [hi18n](https://github.com/wantedly/hi18n)

See [hi18n's README](https://github.com/wantedly/hi18n#readme) for general information.

## LocaleProvider

Configures the locale context.

```tsx
<LocaleProvider locale="en">
  <App />
</LocaleProvider>
```

## useI18n

Retrieves a translation helper from a book and the locale from the context.

```tsx
const { t } = useI18n(book);
```

## LocaleContext

It provides an advanced control over the locale context.

## Translate

Translates the message, possible interleaved with React elements.

```tsx
<Translate book={book} id="example/greeting">
  <a key="link" href="" />
</Translate>
```
