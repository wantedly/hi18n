import { destringify, type CompiledMessage } from "../msgfmt.ts";
import { unwrap, wrap, type Message } from "../opaque.ts";

/**
 * A tagged template function to construct a type-safe message object.
 *
 * Note the difference from the `msg` function exported from `@hi18n/core`'s
 * root module or the `mf1` function from `@hi18n/core/msg`:
 *
 * - The `msg`/`mf1` function takes a single string argument
 *   and parses it as an ICU MessageFormat 1.0 message.
 * - This `msg` function is a tagged template function that takes
 *   template strings and embedded expressions. The string parts
 *   are treated as literal strings, so MessageFormat escapes are not interpreted.
 *   Instead, you can use other helper functions from `@hi18n/core/msg`
 *   (e.g. `arg`) to construct complex messages.
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog("en", {
 *     greeting: msg`Hello, ${arg("name")}!`,
 *   });
 *   ```
 */
export function msg<const Exprs extends Message<never>[]>(
  strings: TemplateStringsArray,
  ...exprs: Exprs
): Message<
  Exprs extends Message<infer T>[] ? { [K in keyof T]: T[K] } : never
> {
  const parts: CompiledMessage[] = [];
  for (let i = 0; i < strings.length; i++) {
    const quasi = strings[i];
    if (quasi == null) {
      throw new SyntaxError("Invalid escape sequence in template string");
    }
    pushPart(parts, quasi);
    if (i < exprs.length) {
      pushPart(parts, unwrap(exprs[i]!));
    }
  }
  const compiledMessage = (
    parts.length === 0 ? "" : parts.length === 1 ? parts[0] : parts
  ) as CompiledMessage;
  return wrap(destringify(compiledMessage));
}

function pushPart(parts: CompiledMessage[], part: CompiledMessage): void {
  if (part == null) {
    return;
  }
  if (typeof part === "string") {
    if (part === "") {
      return;
    }
    const lastPart = parts[parts.length - 1];
    if (typeof lastPart === "string") {
      parts[parts.length - 1] = lastPart + part;
      return;
    }
  }
  if (Array.isArray(part)) {
    for (const subPart of part) {
      pushPart(parts, subPart);
    }
    return;
  }
  parts.push(part);
}
