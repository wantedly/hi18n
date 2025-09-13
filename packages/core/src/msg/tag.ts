import { ElementArg } from "../msgfmt.ts";
import {
  unwrap,
  wrap,
  type ComponentPlaceholder,
  type Message,
} from "../opaque.ts";
import { validateName } from "./util.ts";

/**
 * An intermediary builder for constructing a marked-up message.
 *
 * @since 0.2.1 (`@hi18n/core`)
 */
export type ElementBuilder<Name extends string | number> = <Args>(
  submessage?: Message<Args>,
) => Message<Args & { [K in Name]: ComponentPlaceholder }>;

/**
 * Builds a marked-up message that would be expanded in some way
 * to the real markup (e.g., HTML, XML, React/Vue components, etc.).
 *
 * @param name the name of the argument representing the element
 * @returns a builder function that takes a submessage
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *    greeting: msg`Hello, ${tag("strong")(msg`${arg("name")}`)}!`,
 *  });
 *   ```
 */
export function tag<const Name extends string | number>(
  name: Name,
): ElementBuilder<Name> {
  validateName(name);
  return (submessage) => wrap(ElementArg(name, unwrap(submessage!)));
}
