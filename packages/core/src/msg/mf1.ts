import type { InferredMessageType } from "../msgfmt-parser-types.ts";
import { parseMessage } from "../msgfmt-parser.ts";
import { destringify } from "../msgfmt.ts";
import { wrap } from "../opaque.ts";

/**
 * Wraps an ICU MessageFormat 1.0 message string in a wrapper object.
 *
 * Equivalent to `msg(...)` exported from `@hi18n/core`, except:
 *
 * - It does not defer parse errors, unlike `msg(...)`.
 * - It does not contain overloads for ``msg`...` `` tagged templates.
 *
 * @param s the translated message
 * @returns the first argument
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   export default new Book<Vocabulary>({
 *     "example/greeting": mf1("Hello, {name}!"),
 *   });
 *   ```
 */
export function mf1<S extends string>(s: S): InferredMessageType<S> {
  return wrap(destringify(parseMessage(s))) as InferredMessageType<S>;
}
