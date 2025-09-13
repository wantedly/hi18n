import type { ParseError } from "./errors.ts";

export type CompiledMessage =
  /* deferred parse error for backward compatibility */
  /* TODO: remove this in future major version */
  | DeferredParseError
  /* plain message. Quotations such as "It''s awsesome" are already unescaped. */
  | string
  /* concatenation */
  | CompiledMessage[]
  /* interpolation for noneArg or simpleArg ("{foo}") */
  | VarArg
  /* plural form selection */
  | PluralArg
  /* component interpolation (<0>foo</0>) */
  | ElementArg;

export type VarArg = StringArg | NumberArg | DateTimeArg;

export type StringArg = {
  type: "Var";
  name: string | number;
  argType: "string";
};
export function StringArg(name: string | number): StringArg {
  return { type: "Var", name, argType: "string" };
}

export type NumberArg = {
  type: "Var";
  name: string | number;
  argType: "number";
  argStyle: Intl.NumberFormatOptions;
  subtract: number;
};
export type NumberArgInternalOptions = {
  subtract?: number;
};
export function NumberArg(
  name: string | number,
  argStyle: Intl.NumberFormatOptions,
  options: NumberArgInternalOptions = {},
): NumberArg {
  const { subtract = 0 } = options;
  return { type: "Var", name, argType: "number", argStyle, subtract };
}

export type DateTimeArg = {
  type: "Var";
  name: string | number;
  argType: "datetime";
  argStyle: Intl.DateTimeFormatOptions;
};
export function DateTimeArg(
  name: string | number,
  argStyle: Intl.DateTimeFormatOptions,
): DateTimeArg {
  return { type: "Var", name, argType: "datetime", argStyle };
}

export type PluralArg = {
  type: "Plural";
  name: string | number;
  subtract: number;
  branches: PluralBranch[];
  fallback: CompiledMessage;
};
export type PluralArgInternalOptions = {
  subtract?: number;
};
export function PluralArg(
  name: string | number,
  branches: PluralBranch[],
  fallback: CompiledMessage,
  options: PluralArgInternalOptions = {},
): PluralArg {
  const { subtract = 0 } = options;
  return { type: "Plural", name, subtract, branches, fallback };
}

export type PluralBranch = {
  selector: number | string;
  message: CompiledMessage;
};
export function PluralBranch(
  selector: number | string,
  message: CompiledMessage,
): PluralBranch {
  return { selector, message };
}

export type ArgType = NonNullable<VarArg["argType"]>;

export type ElementArg = {
  type: "Element";
  name: string | number;
  message?: CompiledMessage | undefined;
};
export function ElementArg(
  name: string | number,
  message?: CompiledMessage,
): ElementArg {
  return { type: "Element", name, message };
}

export type DeferredParseError = {
  type: "DeferredParseError";
  sourceText: string;
  error: ParseError;
};
export function DeferredParseError(
  sourceText: string,
  error: ParseError,
): DeferredParseError {
  return { type: "DeferredParseError", sourceText, error };
}

// TODO: remove this in future major version
/**
 * In @hi18n/core v0.2.x, the Catalog constructor rejects bare string messages
 * to prevent accidental usage of unparsed messages.
 *
 * This function is here to allow use of msg(), mf1(), or msg`` messages
 * even when the message is a plain string.
 * @param msg
 * @returns
 */
export function destringify(msg: CompiledMessage): CompiledMessage {
  if (typeof msg === "string") {
    return [msg];
  }
  return msg;
}
