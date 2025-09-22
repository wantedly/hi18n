/**
 * Parse error. Usually wrapped in {@link MessageError}.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class ParseError extends Error {
  static {
    this.prototype.name = "ParseError";
  }
}
