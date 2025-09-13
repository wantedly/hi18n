# Message syntax (JavaScript DSL)

In the JavaScript DSL, messages are constructed in a type-safe manner using JavaScript fuctions.

## Plain texts

plain texts are constructed using the `msg` template tag exported from `@hi18n/core/msg`.

```ts
msg`Hello, world!`;
```

The function of the same name exported from `@hi18n/core` can also function in the same way, but the one from `@hi18n/core/msg` is recommended.

You can use escapes defined in JavaScript, and no escapes other than them are recognized. Specifically, symbols like `'`, `{`, `}`, `<` and `>` are recognized as it is unlike in MessageFormat.

```ts
msg`'' is a pair of single quotes`;
msg`</sarcasm> appears as it is`;
msg`The text (\n) contains Line Feed`;
```

## Interpolation

You can embed complex constructions in the tagged template.

The example below demonstrates how to embed the string-valued parameter named `name`
in the message.

```ts
msg`Hello, ${arg("name")}!`;
```

## String-valued parameters

Use `arg()` helper from `@hi18n/core/msg` without the second parameter to embed a string-valued parameter.

```ts
msg`Hello, ${arg("name")}!`;
```

## Number-valued parameters

Give `"number"` as `arg()`'s second parameter to embed a number-valued parameter.

```ts
msg`Score: ${arg("score", "number")}`;
// => Score: 1,234,567
```

Simple style options:

```ts
// default (equivalent to {})
arg("score", "number", "number");
// equivalent to { maximumFractionDigits: 0 }
arg("score", "number", "integer");
// equivalent to { style: "percent" }
arg("score", "number", "percent");
```

Complex style options:

```ts
arg("score", "number", {
  style: "decimal",
  minimumIntegerDigits: 5,
  minimumFractionDigits: 5,
  maximumFractionDigits: 8,
  signDisplay: "always",
});
```

Most [options to `Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options) can be specified.

## Date-valued, time-valued, and datetime-valued parameters

Give `"date"` as `arg()`'s second parameter to embed a date-valued parameter.
Similarly, you can use `"time"` and `"datetime"`.

```ts
arg("due", "date");
// => 1/20/2025

arg("due", "time");
// => 12:34:56 AM

arg("due", "datetime");
// => 1/20/2025, 12:34:56 AM
```

When styles are omitted just like the above, the default styles are assumed:

- for `"date"`, as `{ year: "numeric", month: "numeric", date: "numeric" }`
- for `"time"`, as `{ hour: "numeric", minute: "numeric", second: "numeric" }`
- for `"datetime"`, the combination of both

date/time shorthands:

```ts
// Equivalent of { dateStyle: "short" }
arg("due", "date", "short");
// Equivalent of { dateStyle: "medium" }
arg("due", "date", "medium");
// Equivalent of { dateStyle: "long" }
arg("due", "date", "long");
// Equivalent of { dateStyle: "full" }
arg("due", "date", "full");
// Equivalent of { timeStyle: "short" }
arg("due", "time", "short");
// Equivalent of { timeStyle: "medium" }
arg("due", "time", "medium");
// Equivalent of { timeStyle: "long" }
arg("due", "time", "long");
// Equivalent of { timeStyle: "full" }
arg("due", "time", "full");

// Equivalent of { dateStyle: "short", timeStyle: "short" }
arg("due", "datetime", "short");
// Equivalent of { dateStyle: "medium", timeStyle: "medium" }
arg("due", "datetime", "medium");
// Equivalent of { dateStyle: "long", timeStyle: "long" }
arg("due", "datetime", "long");
// Equivalent of { dateStyle: "full", timeStyle: "full" }
arg("due", "datetime", "full");
```

Full options example:

```ts
arg("due", "datetime", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
```

Most [options to `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#options) can be specified.

## Plurals

English has two plural forms. Arabic has six! In this case, use `plural` to branch over the number of items you have.

```ts
plural("count").branch(
  when("one", msg`You have ${arg("count", "number")} message.`),
  otherwise(msg`You have ${arg("count", "number")} messages.`),
);
```

Here, the condition is one of:

- Plural category other than `"other"`. That is, `"zero"`, `"one"`, `"two"`, `"few"`, or `"many"`.
  Note that the names may be inaccurate.
  For example, "one" may include 21 in some languages.
  "two" does not match nothing in English.
- A number for exact match.

### subtraction

For backward compatibility, hi18n does a simple subtraction for you.

Specify the `subtract` option in `plural()` or `arg(..., "number")`.

```ts
plural("count", { subtract: 1 }).branch(
  when(0, msg`No one is online.`),
  when(1, msg`${arg("friendName")} is online.`),
  when(
    "one",
    msg`${arg("friendName")} and ${arg("count", "number")} other are online.`,
  ),
  otherwise(
    msg`${arg("friendName")} and ${arg("count", "number")} others are online.`,
  ),
);
```

Note that `subtract` is not applied to exact matching.
Therefore, in the example above, each branch matches in the following conditions:

- The branch `0` matches when `count` is 0.
- The branch `1` matches when `count` is 1.
- The branch `one` matches when `count` is 2.
- The `otherwise` branch matches otherwise.

### cardinals and ordinals

`plurals()` currently works only for cardinal numbers.

## Markups

You can include markups in messages when using `@hi18n/react`.

Markup is done by wrapping a part of the message using `tag(tagName)(...)`.
The tagName behaves like a parameter and should be filled by the caller.

There is no such thing as attributes in the message itself.
The caller should fill the element attributes if necessary.

```ts
msg`Hello, ${tag("emphasis")(arg("name"))}`;
```
