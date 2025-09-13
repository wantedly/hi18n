import type { Message } from "../opaque.ts";

/**
 * Can be used to indicate an untranslated state.
 *
 * @param message the translated message
 * @returns the argument itself
 *
 * @since 0.2.1 (`@hi18n/core`)
 */
export function todo<Args>(message: Message<Args>): Message<Args> {
  return message;
}
