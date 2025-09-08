import { defaultErrorHandler, type ErrorHandler } from "./error-handling.ts";
import {
  ArgumentTypeError,
  MessageEvaluationError,
  MissingArgumentError,
} from "./errors.ts";
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
      case undefined:
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
        const formatOptions: Intl.NumberFormatOptions = {};
        let modifiedValue = value;
        switch (msg.argStyle) {
          case "integer":
            // https://github.com/openjdk/jdk/blob/739769c8fc4b496f08a92225a12d07414537b6c0/src/java.base/share/classes/sun/util/locale/provider/NumberFormatProviderImpl.java#L196-L198
            formatOptions.maximumFractionDigits = 0;
            if (typeof value === "number") modifiedValue = Math.round(value);
            break;
          case "currency":
            // Need to provide an appropriate currency from somewhere
            throw new Error("Unimplemented: argStyle=currency");
          case "percent":
            formatOptions.style = msg.argStyle;
            break;
        }
        if (
          (typeof Intl === "undefined" || !Intl.NumberFormat) &&
          (msg.argStyle === undefined || msg.argStyle === "integer")
        ) {
          (options.handleError ?? defaultErrorHandler)(
            new Error("Missing Intl.NumberFormat"),
            "warn",
          );
          return `${modifiedValue}`;
        }
        // TODO: allow injecting polyfill
        return new Intl.NumberFormat(options.locale, formatOptions).format(
          modifiedValue,
        );
      }
      case "date":
      case "time": {
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
        };
        if (typeof msg.argStyle === "object") {
          // parsed object from the skeleton
          Object.assign(formatOptions, msg.argStyle);
        } else {
          if (msg.argType === "date") {
            formatOptions.dateStyle = msg.argStyle ?? "medium";
          } else {
            formatOptions.timeStyle = msg.argStyle ?? "medium";
          }
        }
        // TODO: allow injecting polyfill
        return new Intl.DateTimeFormat(options.locale, formatOptions).format(
          value,
        );
      }
      default:
        throw new Error(`Unimplemented: argType=${msg.argType ?? "string"}`);
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
      relativeValue = value - (msg.offset ?? 0);
    } else if (typeof value === "bigint") {
      relativeValue = value - BigInt(msg.offset ?? 0);
    } else {
      throw new ArgumentTypeError({
        argName: msg.name,
        expectedType: "number",
        got: value,
      });
    }
    const rule: string = (() => {
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
      if (
        branch.selector === Number(value) ||
        branch.selector === rule ||
        branch.selector === "other"
      ) {
        return evaluateMessage(branch.message, options, relativeValue);
      }
    }
    throw new MessageEvaluationError(
      `Non-exhaustive plural branches for ${value}`,
    );
  } else if (msg.type === "Number" && numberValue !== undefined) {
    // TODO: allow injecting polyfill
    return new Intl.NumberFormat(options.locale).format(numberValue);
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
  }
  throw new MessageEvaluationError("Invalid message");
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
