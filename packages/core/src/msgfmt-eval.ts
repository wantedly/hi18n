import { CompiledMessage } from "./msgfmt";

export type EvalOption = {
  key?: string;
  locale: string;
  params?: Record<string, unknown>;
};

export function evaluateMessage(msg: CompiledMessage, options: EvalOption): string {
  if (typeof msg === "string") {
    return msg;
  } else if (Array.isArray(msg)) {
    return msg.map((part) => evaluateMessage(part, options)).join("");
  } else if (msg.type === "Var") {
    const value = (options.params ?? {})[msg.name];
    if (value === undefined) throw new MessageError(`Missing argument ${msg.name}`, options);
    switch (msg.argType ?? "string") {
      case "string":
        if (typeof value !== "string") throw new MessageError(`Invalid argument ${msg.name}: expected string, got ${value}`, options);
        return value;
      case "number":
        if (typeof value !== "number" && typeof value !== "bigint") throw new MessageError(`Invalid argument ${msg.name}: expected number, got ${value}`, options);
        // TODO: allow injecting polyfill
        return new Intl.NumberFormat(options.locale).format(value);
      default:
        throw new Error(`Unimplemented: argType=${msg.argType}`);
    }
  } else if (msg.type === "Plural") {
    const value = (options.params ?? {})[msg.name];
    if (value === undefined) throw new MessageError(`Missing argument ${msg.name}`, options);
    if (typeof value !== "number" && typeof value !== "bigint") throw new MessageError(`Invalid argument ${msg.name}: expected number, got ${value}`, options);
    // TODO: allow injecting polyfill
    const pluralRules = new Intl.PluralRules(options.locale);
    const rule: string = pluralRules.select(Number(value));
    for (const branch of msg.branches) {
      if (branch.selector === value || branch.selector === rule || branch.selector === "other") {
        // TODO: support #
        return evaluateMessage(branch.message, options);
      }
    }
    throw new MessageError(`Non-exhaustive plural branches for ${value}`, options);
  }
  throw new Error("Invalid message");
}

export class MessageError extends Error {
  constructor(message: string, options: EvalOption) {
    const info: string[] = [];
    info.push(`locale=${options.locale}`);
    if (options.key != null) info.push(`key=${options.key}`);

    super(`${message} (${info.join(", ")})`);

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, MessageError)
    }
    this.name = MessageError.name;
  }
}
