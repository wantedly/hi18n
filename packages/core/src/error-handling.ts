export type ErrorLevel = "error" | "warn";

export type ErrorHandler = (e: Error, level: ErrorLevel) => void;

export function defaultErrorHandler(e: Error, level: ErrorLevel) {
  switch (level) {
    case "error":
      throw e;
    case "warn":
      console.warn(e);
      break;
  }
}
