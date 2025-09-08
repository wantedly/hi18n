/**
 * Error level. Diagnostics less important than these levels directly go to console.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export type ErrorLevel = "error" | "warn";

/**
 * @since 0.1.7 (`@hi18n/core`)
 */
export type ErrorHandler = (e: Error, level: ErrorLevel) => void;

/**
 * By default, it just throws the error if `level === "error"` and reports in the console otherwise.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export function defaultErrorHandler(e: Error, level: ErrorLevel): void {
  switch (level) {
    case "error":
      throw e;
    case "warn":
      console.warn(e);
      break;
  }
}
