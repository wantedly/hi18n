import type { TSESTree } from "@typescript-eslint/utils";

/**
 * Result of extracting a string value from a JS expression.
 */
export type JSString = readonly JSStringPart[];

export type JSStringPart = KnownJSStringPart | UnknownJSStringPart;

export function isStringType(parts: JSString): boolean {
  if (parts.length !== 1) {
    // Known to be a certain concatenation
    return true;
  }
  const thePart = parts[0]!;
  if (thePart.type !== "UnknownJSStringPart") {
    return true;
  }
  return thePart.isStringType;
}

/**
 * A JS string part that contains unknown parts (e.g. interpolations).
 */
export type UnknownJSStringPart = {
  type: "UnknownJSStringPart";
  node: TSESTree.Expression;
  isStringType: boolean;
};
export function UnknownJSStringPart(
  node: TSESTree.Expression,
): UnknownJSStringPart {
  return { type: "UnknownJSStringPart", node, isStringType: false };
}

export type KnownJSStringPart =
  | ExternalStringPart
  | JSVerbatimPart
  | JSEscapePart
  | JSEmptyEscapePart
  | JSQuoteOpenPart
  | JSQuoteClosePart
  | JSConcatPart;

/**
 * A string that does not originate from a JavaScript code.
 */
export type ExternalStringPart = {
  type: "ExternalString";
  value: string;
  loc: undefined;
};
export function ExternalStringPart(value: string): ExternalStringPart {
  return { type: "ExternalString", value, loc: undefined };
}

/**
 * A non-escaped part in a JS string literal or template literal.
 */
export type JSVerbatimPart = {
  type: "JSVerbatim";
  value: string;
  loc: TSESTree.SourceLocation;
};
export function JSVerbatimPart(
  value: string,
  loc: TSESTree.SourceLocation,
): JSVerbatimPart {
  return { type: "JSVerbatim", value, loc };
}

/**
 * An escape sequence in a JS string literal or template literal.
 */
export type JSEscapePart = {
  type: "JSEscape";
  value: string;
  loc: TSESTree.SourceLocation;
};
export function JSEscapePart(
  value: string,
  loc: TSESTree.SourceLocation,
): JSEscapePart {
  return { type: "JSEscape", value, loc };
}

/**
 * - A meaningless `\` as part of a certain non-escape sequence like `\z`.
 * - A line continuation.
 */
export type JSEmptyEscapePart = {
  type: "JSEmptyEscape";
  value: "";
  loc: TSESTree.SourceLocation;
};
export function JSEmptyEscapePart(
  loc: TSESTree.SourceLocation,
): JSEmptyEscapePart {
  return { type: "JSEmptyEscape", value: "", loc };
}

/**
 * The opening quote of a JS string literal or template literal.
 */
export type JSQuoteOpenPart = {
  type: "JSQuoteOpen";
  value: "";
  delimiter: "'" | '"' | "`" | "}";
  loc: TSESTree.SourceLocation;
};
export function JSQuoteOpenPart(
  delimiter: "'" | '"' | "`" | "}",
  loc: TSESTree.SourceLocation,
): JSQuoteOpenPart {
  return { type: "JSQuoteOpen", value: "", delimiter, loc };
}

/**
 * The closing quote of a JS string literal or template literal.
 */
export type JSQuoteClosePart = {
  type: "JSQuoteClose";
  value: "";
  delimiter: "'" | '"' | "`" | "${";
  loc: TSESTree.SourceLocation;
};
export function JSQuoteClosePart(
  delimiter: "'" | '"' | "`" | "${",
  loc: TSESTree.SourceLocation,
): JSQuoteClosePart {
  return { type: "JSQuoteClose", value: "", delimiter, loc };
}

/**
 * The concatenation operator `+`.
 */
export type JSConcatPart = {
  type: "JSConcat";
  value: "";
  loc: TSESTree.SourceLocation;
};
export function JSConcatPart(loc: TSESTree.SourceLocation): JSConcatPart {
  return { type: "JSConcat", value: "", loc };
}

export function jsStringLoc(s: JSString): TSESTree.SourceLocation | undefined {
  let start: TSESTree.Position | null = null;
  let end: TSESTree.Position | null = null;
  for (const part of s) {
    if (part.type === "UnknownJSStringPart" || part.type == "ExternalString") {
      continue;
    }
    start ??= part.loc.start;
    end = part.loc.end;
  }
  return start && end ? { start, end } : undefined;
}
