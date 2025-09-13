/* eslint-disable @typescript-eslint/no-empty-object-type */

import type { CompiledMessage } from "./msgfmt.ts";

declare const messageBrandSymbol: unique symbol;

/**
 * An opaque type that represents translation messages.
 *
 * @param Args parameters required by this message
 *
 * @since 0.1.0 (`@hi18n/core`)
 */
export type Message<Args = {}> = {
  [messageBrandSymbol]: (args: Args) => void;
};

export function wrap<Args>(msg: CompiledMessage): Message<Args> {
  return msg as unknown as Message<Args>;
}

export function unwrap<Args>(msg: Message<Args>): CompiledMessage {
  return msg as unknown as CompiledMessage;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const componentPlaceholderSymbol: unique symbol;
export type ComponentPlaceholder = typeof componentPlaceholderSymbol;
