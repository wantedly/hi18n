import { defaultErrorHandler, type ErrorHandler } from "./error-handling.ts";
import {
  ArgumentTypeError,
  MessageEvaluationError,
  MissingArgumentError,
} from "./errors.ts";
import { parseMessage } from "./msgfmt-parser.ts";
import type { CompiledMessage } from "./msgfmt.ts";

export type EvalOption<T> = {
  id?: string | undefined;
  locale: string;
  timeZone?: string | undefined;
  params?: Record<string, unknown>;
  handleError?: ErrorHandler | undefined;
  collect?: ((submessages: (T | string)[]) => T | string) | undefined;
  wrap?:
    | ((component: unknown, message: T | string | undefined) => T | string)
    | undefined;
};

export function evaluateMessage<T = string>(
  msg: CompiledMessage,
  options: EvalOption<T>,
  numberValue?: number | bigint,
): T | string {
  if (typeof msg === "string") {
    return msg;
  } else if (Array.isArray(msg)) {
    const reduced = reduceSubmessages(
      msg.map((part) => evaluateMessage(part, options, numberValue)),
    );
    if (typeof reduced === "string") {
      return reduced;
    }
    const { collect } = options;
    if (!collect)
      throw new MessageEvaluationError(
        "Invalid message: not a default-collectable message",
      );
    return collect(reduced);
  } else if (msg.type === "Var") {
    const value = (options.params ?? {})[msg.name];
    if (value === undefined)
      throw new MissingArgumentError({
        argName: msg.name,
      });
    switch (msg.argType) {
      case "string":
        if (typeof value !== "string")
          throw new MessageEvaluationError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
            `Invalid argument ${msg.name}: expected string, got ${value}`,
          );
        return value;
      case "number": {
        if (typeof value !== "number" && typeof value !== "bigint") {
          throw new ArgumentTypeError({
            argName: msg.name,
            expectedType: "number",
            got: value,
          });
        }
        const offsetValue =
          typeof value === "bigint"
            ? value - BigInt(msg.subtract ?? 0)
            : value - (msg.subtract ?? 0);
        // TODO: Remove this fallback because it is nowadays widely supported.
        if (typeof Intl === "undefined" || !Intl.NumberFormat) {
          const fallback = numberFormatFallback(offsetValue, msg.argStyle);
          if (fallback != null) {
            (options.handleError ?? defaultErrorHandler)(
              new Error("Missing Intl.NumberFormat"),
              "warn",
            );
            return fallback;
          }
        }
        // TODO: allow injecting polyfill
        return new Intl.NumberFormat(options.locale, msg.argStyle).format(
          offsetValue,
        );
      }
      case "datetime": {
        if (!isDateLike(value)) {
          throw new ArgumentTypeError({
            argName: msg.name,
            expectedType: "Date",
            got: value,
          });
        }
        if (typeof options.timeZone !== "string") {
          throw new MissingArgumentError({
            argName: "timeZone",
          });
        }
        const formatOptions: Intl.DateTimeFormatOptions = {
          timeZone: options.timeZone,
          ...msg.argStyle,
        };
        // TODO: allow injecting polyfill
        return new Intl.DateTimeFormat(options.locale, formatOptions).format(
          value,
        );
      }
      default:
        throw new Error(
          `Unimplemented: argType=${((msg as { argType: never }).argType as string) ?? "string"}`,
        );
    }
  } else if (msg.type === "Plural") {
    const value = (options.params ?? {})[msg.name];
    let relativeValue: number | bigint;
    if (value === undefined) {
      throw new MissingArgumentError({
        argName: msg.name,
      });
    }
    if (typeof value === "number") {
      relativeValue = value - (msg.subtract ?? 0);
    } else if (typeof value === "bigint") {
      relativeValue = value - BigInt(msg.subtract ?? 0);
    } else {
      throw new ArgumentTypeError({
        argName: msg.name,
        expectedType: "number",
        got: value,
      });
    }
    const rule: string = (() => {
      // TODO: Remove this fallback because it is nowadays widely supported.
      if (typeof Intl === "undefined" || !Intl.PluralRules) {
        (options.handleError ?? defaultErrorHandler)(
          new Error("Missing Intl.PluralRules"),
          "warn",
        );
        return "other";
      }
      // TODO: allow injecting polyfill
      const pluralRules = new Intl.PluralRules(options.locale);
      return pluralRules.select(Number(relativeValue));
    })();
    for (const branch of msg.branches) {
      if (branch.selector === Number(value) || branch.selector === rule) {
        return evaluateMessage(branch.message, options, relativeValue);
      }
    }
    return evaluateMessage(msg.fallback, options, relativeValue);
  } else if (msg.type === "Element") {
    const { wrap } = options;
    if (!wrap)
      throw new MessageEvaluationError(
        "Invalid message: unexpected elementArg",
      );
    const value = (options.params ?? {})[msg.name];
    if (value === undefined)
      throw new MissingArgumentError({
        argName: msg.name,
      });
    return wrap(
      value,
      msg.message !== undefined
        ? evaluateMessage(msg.message, options, numberValue)
        : undefined,
    );
  } else if (msg.type === "DeferredParseError") {
    // Try to reproduce the parse error to produce a more useful stack trace.
    parseMessage(msg.sourceText);
    // Fallback: re-throw the original error.
    throw msg.error;
  }
  throw new MessageEvaluationError("Invalid message");
}

function numberFormatFallback(
  value: number | bigint,
  options: Intl.NumberFormatOptions,
): string | undefined {
  const {
    style = "decimal",
    minimumIntegerDigits,
    minimumFractionDigits,
    maximumFractionDigits,
    minimumSignificantDigits,
    maximumSignificantDigits,
    roundingPriority,
    roundingIncrement,
    roundingMode,
    trailingZeroDisplay,
    notation,
    compactDisplay,
    useGrouping,
    signDisplay,
  } = options;

  if (
    style !== "decimal" ||
    minimumIntegerDigits != null ||
    minimumFractionDigits != null ||
    (maximumFractionDigits != null && maximumFractionDigits !== 0) ||
    minimumSignificantDigits != null ||
    maximumSignificantDigits != null ||
    roundingPriority != null ||
    roundingIncrement != null ||
    roundingMode != null ||
    trailingZeroDisplay != null ||
    notation != null ||
    compactDisplay != null ||
    useGrouping != null ||
    signDisplay != null
  ) {
    return undefined;
  }
  if (typeof value === "bigint") {
    return `${value}`;
  } else if (maximumFractionDigits === 0) {
    return `${Math.round(value)}`;
  } else {
    return `${value}`;
  }
}

function reduceSubmessages<T>(
  submessages: (T | string)[],
): string | (T | string)[] {
  if (submessages.every((x): x is string => typeof x === "string")) {
    return submessages.join("");
  }
  const reduced: (T | string)[] = [];
  for (const x of submessages) {
    if (x === "") continue;
    if (
      typeof x === "string" &&
      typeof reduced[reduced.length - 1] === "string"
    ) {
      reduced[reduced.length - 1] += x;
    } else {
      reduced.push(x);
    }
  }
  return reduced;
}

function isDateLike(obj: unknown): obj is Date {
  return (
    typeof obj === "object" &&
    typeof (obj as { getFullYear?: unknown }).getFullYear === "function"
  );
}
