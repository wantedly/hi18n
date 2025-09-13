# Message syntax

There are roughly two ways to describe messages:

- **JavaScript DSL** uses JavaScript functions to build type-safe messages.
- **MessageFormat syntax** uses a dedicated syntax for translation structures.

## JavaScript DSL

To write translations in JavaScript DSL, use various helpers from `@hi18n/core/msg`.

```ts
import { Catalog, type Message } from "@hi18n/core";
import { msg, arg } from "@hi18n/core/msg";

type Vocabulary = {
  "root/greeting": Message<{ name: string }>;
};

const catalogEn = new Catalog<Vocabulary>("en", {
  "root/greeting": msg`Hello, ${arg("name")}!`,
});
```

## MessageFormat syntax

To write translations in MessageFormat syntax, use the `mf1` helper from `@hi18n/core/msg`.

```ts
import { Catalog, type Message } from "@hi18n/core";
import { mf1 } from "@hi18n/core/msg";

type Vocabulary = {
  "root/greeting": Message<{ name: string }>;
};

const catalogEn = new Catalog<Vocabulary>("en", {
  "root/greeting": mf1("Hello, {name}!"),
});
```

There is also a `msg` helper from `@hi18n/core` for backward compatibility, but `@hi18n/core/msg` is preferred.

```ts
// msg is deprecated. Use mf1.
import { Catalog, type Message, msg } from "@hi18n/core";

type Vocabulary = {
  "root/greeting": Message<{ name: string }>;
};

const catalogEn = new Catalog<Vocabulary>("en", {
  "root/greeting": msg("Hello, {name}!"),
});
```

For syntax structures used within the function, see [Message syntax (MessageFormat 1.0)](./msgfmt.md).
