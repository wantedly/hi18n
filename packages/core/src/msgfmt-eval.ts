import { CompiledMessage } from "./msgfmt.js";
import type {} from "./errors";

export type EvalOption<T> = {
  id?: string;
  locale: string;
  params?: Record<string, unknown>;
  collect?: ((submessages: (T | string)[]) => T | string) | undefined;
  wrap?:
    | ((component: unknown, message: T | string | undefined) => T | string)
    | undefined;
};

export function evaluateMessage<T = string>(
  msg: CompiledMessage,
  options: EvalOption<T>,
  numberValue?: number | bigint
): T | string {
  if (typeof msg === "string") {
    return msg;
  } else if (Array.isArray(msg)) {
    const reduced = reduceSubmessages(
      msg.map((part) => evaluateMessage(part, options, numberValue))
    );
    if (typeof reduced === "string") {
      return reduced;
    }
    const { collect } = options;
    if (!collect)
      throw new MessageError(
        "Invalid message: not a default-collectable message",
        options
      );
    return collect(reduced);
  } else if (msg.type === "Var") {
    const value = (options.params ?? {})[msg.name];
    if (value === undefined)
      throw new MessageError(`Missing argument ${msg.name}`, options);
    switch (msg.argType) {
      case undefined:
        if (typeof value !== "string")
          throw new MessageError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Invalid argument ${msg.name}: expected string, got ${value}`,
            options
          );
        return value;
      case "number": {
        if (typeof value !== "number" && typeof value !== "bigint") {
          throw new MessageError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Invalid argument ${msg.name}: expected number, got ${value}`,
            options
          );
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
        // TODO: allow injecting polyfill
        return new Intl.NumberFormat(options.locale, formatOptions).format(
          modifiedValue
        );
      }
      default:
        throw new Error(`Unimplemented: argType=${msg.argType ?? "string"}`);
    }
  } else if (msg.type === "Plural") {
    const value = (options.params ?? {})[msg.name];
    if (value === undefined)
      throw new MessageError(`Missing argument ${msg.name}`, options);
    if (typeof value !== "number" && typeof value !== "bigint")
      throw new MessageError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Invalid argument ${msg.name}: expected number, got ${value}`,
        options
      );
    // TODO: allow injecting polyfill
    const pluralRules = new Intl.PluralRules(options.locale);
    const rule: string = pluralRules.select(Number(value));
    for (const branch of msg.branches) {
      if (
        branch.selector === value ||
        branch.selector === rule ||
        branch.selector === "other"
      ) {
        return evaluateMessage(branch.message, options, value);
      }
    }
    throw new MessageError(
      `Non-exhaustive plural branches for ${value}`,
      options
    );
  } else if (msg.type === "Number" && numberValue !== undefined) {
    // TODO: allow injecting polyfill
    return new Intl.NumberFormat(options.locale).format(numberValue);
  } else if (msg.type === "Element") {
    const { wrap } = options;
    if (!wrap)
      throw new MessageError("Invalid message: unexpected elementArg", options);
    const value = (options.params ?? {})[msg.name];
    if (value === undefined)
      throw new MessageError(`Missing argument ${msg.name}`, options);
    return wrap(
      value,
      msg.message !== undefined
        ? evaluateMessage(msg.message, options, numberValue)
        : undefined
    );
  }
  throw new Error("Invalid message");
}

function reduceSubmessages<T>(
  submessages: (T | string)[]
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

export class MessageError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, options: EvalOption<any>) {
    const info: string[] = [];
    info.push(`locale=${options.locale}`);
    if (options.id != null) info.push(`id=${options.id}`);

    super(`${message} (${info.join(", ")})`);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MessageError);
    }
    this.name = MessageError.name;
  }
}
