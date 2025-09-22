import type { TSESTree } from "@typescript-eslint/utils";
import {
  ExternalStringPart,
  isStringType,
  JSEmptyEscapePart,
  JSEscapePart,
  JSQuoteClosePart,
  JSQuoteOpenPart,
  JSVerbatimPart,
  UnknownJSStringPart,
  type JSString,
  type JSStringPart,
} from "./js-string.ts";
import type { Diagnostic } from "./diagnostic.ts";

export function parseJSString(node: TSESTree.Expression): JSString {
  const parts: JSStringPart[] = [];
  parseJSStringInto(node, parts);
  return parts;
}
export function parseJSStringInto(
  node: TSESTree.Expression,
  parts: JSStringPart[],
): void {
  switch (node.type) {
    case "Literal": {
      if (typeof node.value === "string") {
        return parseLiteralInto(node, parts);
      }
      break;
    }
    case "TemplateLiteral": {
      return parseTemplateInto(node, parts);
    }
    case "BinaryExpression": {
      if (node.operator === "+") {
        if (node.left.type === "PrivateIdentifier") {
          throw new TypeError("Unreachable: PrivateIdentifier in addition");
        }
        const lhs = parseJSString(node.left);
        const rhs = parseJSString(node.right);
        if (isStringType(lhs) || isStringType(rhs)) {
          parts.push(...lhs);
          parts.push(...rhs);
        } else {
          parts.push(UnknownJSStringPart(node));
        }
        return;
      }
    }
  }
  parts.push(UnknownJSStringPart(node));
}

function parseLiteralInto(
  node: TSESTree.StringLiteral,
  parts: JSStringPart[],
): void {
  if (node.loc == null) {
    // No need to parse escapes without location info
    parts.push(ExternalStringPart(node.value));
    return;
  }

  const raw = node.raw ?? JSON.stringify(`${node.value}`);
  const quoteMark = raw[0] === "'" ? "'" : '"';
  const escaped = raw.slice(1, raw.length - 1);
  let { line, column } = node.loc.start;

  parts.push(
    JSQuoteOpenPart(quoteMark, {
      start: { line, column },
      end: { line, column: column + 1 },
    }),
  );
  column += 1;

  const contentEndPos = parseEscapedInto(
    quoteMark,
    escaped,
    { line, column },
    parts,
  );
  ({ line, column } = contentEndPos);

  parts.push(
    JSQuoteClosePart(quoteMark, {
      start: { line, column },
      end: { line, column: column + 1 },
    }),
  );
}

function parseTemplateInto(
  node: TSESTree.TemplateLiteral,
  parts: JSStringPart[],
): void {
  for (let i = 0; i < node.quasis.length; i++) {
    const quasi = node.quasis[i]!;
    const escaped = quasi.value.raw;
    let { line, column } = quasi.loc.start;

    const openQuote = i === 0 ? "`" : "}";
    parts.push(
      JSQuoteOpenPart(openQuote, {
        start: { line, column },
        end: { line, column: column + 1 },
      }),
    );
    column += 1;

    const contentEndPos = parseEscapedInto(
      "`",
      escaped,
      { line, column },
      parts,
    );
    ({ line, column } = contentEndPos);

    const closeQuote = i === node.quasis.length - 1 ? "`" : "${";
    parts.push(
      JSQuoteClosePart(closeQuote, {
        start: { line, column },
        end: { line, column: column + closeQuote.length },
      }),
    );
    column += closeQuote.length;

    if (i < node.expressions.length) {
      const expr = node.expressions[i]!;
      parseJSStringInto(expr, parts);
    }
  }
}

export function parseTaggedQuasis(
  quasis: TSESTree.TemplateElement[],
  diagnostics: Diagnostic[],
): JSString[] {
  return quasis.map((quasi, i) => {
    const parts: JSStringPart[] = [];
    const escaped = quasi.value.raw;
    let { line, column } = quasi.loc.start;

    const openQuote = i === 0 ? "`" : "}";
    parts.push(
      JSQuoteOpenPart(openQuote, {
        start: { line, column },
        end: { line, column: column + 1 },
      }),
    );
    column += 1;

    const contentEndPos = parseEscapedIntoCommon(
      "`",
      escaped,
      { line, column },
      parts,
      true,
      diagnostics,
    );
    ({ line, column } = contentEndPos);

    const closeQuote = i === quasis.length - 1 ? "`" : "${";
    parts.push(
      JSQuoteClosePart(closeQuote, {
        start: { line, column },
        end: { line, column: column + closeQuote.length },
      }),
    );
    column += closeQuote.length;

    return parts;
  });
}

function parseEscapedInto(
  quoteMark: "'" | '"' | "`",
  escaped: string,
  escapedStart: TSESTree.Position,
  parts: JSStringPart[],
): TSESTree.Position {
  return parseEscapedIntoCommon(
    quoteMark,
    escaped,
    escapedStart,
    parts,
    false,
    [], // Ignore diagnostics for now
  );
}

function parseEscapedIntoCommon(
  quoteMark: "'" | '"' | "`",
  escaped: string,
  escapedStart: TSESTree.Position,
  parts: JSStringPart[],
  isTaggedTemplate: boolean,
  diagnostics: Diagnostic[],
): TSESTree.Position {
  let { line, column } = escapedStart;

  let pos = 0;
  const advance = (n: number) => {
    column += n;
    pos += n;
  };
  while (pos < escaped.length) {
    let start: TSESTree.Position = { line, column };
    let nextEscape = escaped.indexOf("\\", pos);
    if (nextEscape === -1) {
      nextEscape = escaped.length;
    }
    if (pos < nextEscape) {
      const verbatimStart = pos;
      advance(nextEscape - pos);
      parts.push(
        JSVerbatimPart(escaped.slice(verbatimStart, pos), {
          start,
          end: { line, column },
        }),
      );
    }
    if (pos >= escaped.length) {
      continue;
    }
    start = { line, column };
    advance(1);
    const escType = escaped[pos];
    if (escType == null) {
      // Fallback (highly unlikely)
      parts.push(
        JSEscapePart("\\", {
          start,
          end: { line, column },
        }),
      );
      continue;
    }
    const escMapChar = ESCAPE_MAP[escType];
    if (escMapChar != null) {
      // "\n" etc. (incl. line continuations except CRLF)
      advance(1);
      parts.push(
        JSEscapePart(escMapChar, {
          start,
          end: { line, column },
        }),
      );
      continue;
    } else if (LINE_TERMINATORS.has(escType)) {
      const count = escType === "\r" && escaped[pos + 1] === "\n" ? 2 : 1;
      // CRLF line continuation
      advance(count);
      line += 1;
      column = 0;
      parts.push(
        JSEmptyEscapePart({
          start,
          end: { line, column },
        }),
      );
      continue;
    } else if (escType === "x") {
      // Hex escape \xFF
      advance(1);
      const hexStart = pos;
      const maxPos = pos + 2;
      while (pos < maxPos && /^[0-9a-fA-F]$/.test(escaped[pos] ?? "\0")) {
        advance(1);
      }
      if (pos < maxPos && isTaggedTemplate) {
        // Incomplete hex escape, like `\x` or `\xF`
        diagnostics.push({
          type: "IncompleteHexEscapeInTemplateString",
          // At the end of the escape
          loc: {
            start: { line, column },
            end: { line, column },
          },
        });
      }
      const charCode = parseInt(escaped.slice(hexStart, pos), 16) || 0;
      parts.push(
        JSEscapePart(String.fromCharCode(charCode), {
          start,
          end: { line, column },
        }),
      );
      continue;
    } else if (escType === "u" && escaped[pos + 1] === "{") {
      // Extended Unicode escape \u{10FFFF}
      advance(2);
      const hexStartLC = { line, column };
      const hexStart = pos;
      while (/^[0-9a-fA-F]$/.test(escaped[pos] ?? "\0")) {
        advance(1);
      }
      const hexEndLC = { line, column };
      const hexEnd = pos;
      if (hexStart === hexEnd && isTaggedTemplate) {
        // No digit found, like `\u{ ` or `\u{}`
        diagnostics.push({
          type: "IncompleteHexEscapeInTemplateString",
          // At the end of the escape
          loc: {
            start: { line, column },
            end: { line, column },
          },
        });
      }
      if (escaped[pos] === "}") {
        advance(1);
      } else if (hexStart < hexEnd && isTaggedTemplate) {
        // No closing brace found, like `\u{41`
        diagnostics.push({
          type: "IncompleteUnicodeEscapeInTemplateString",
          // At the end of the escape
          loc: {
            start: { line, column },
            end: { line, column },
          },
        });
      }
      const charCode = parseInt(escaped.slice(hexStart, hexEnd), 16) || 0;
      if (charCode > 0x10ffff && isTaggedTemplate) {
        // Code point out of range, like `\u{12345678}`
        diagnostics.push({
          type: "CodePointOutOfRangeInTemplateString",
          // Pointing the code point digits
          loc: {
            start: hexStartLC,
            end: hexEndLC,
          },
        });
      }
      const c = charCode > 0x10ffff ? "\uFFFD" : String.fromCodePoint(charCode);
      parts.push(
        JSEscapePart(c, {
          start,
          end: { line, column },
        }),
      );
      continue;
    } else if (escType === "u") {
      // Unicode escape \uFFFF
      advance(1);
      const hexStart = pos;
      const maxPos = pos + 4;
      while (pos < maxPos && /^[0-9a-fA-F]$/.test(escaped[pos] ?? "\0")) {
        advance(1);
      }
      if (pos < maxPos && isTaggedTemplate) {
        // Incomplete hex escape, like `\u` or `\uFFF`
        diagnostics.push({
          type: "IncompleteHexEscapeInTemplateString",
          // At the end of the escape
          loc: {
            start: { line, column },
            end: { line, column },
          },
        });
      }
      const charCode = parseInt(escaped.slice(hexStart, pos), 16) || 0;
      parts.push(
        JSEscapePart(String.fromCharCode(charCode), {
          start,
          end: { line, column },
        }),
      );
      continue;
    } else if (/^[0-7]$/.test(escType)) {
      // Legacy octal escape or \0
      const octStart = pos;
      const maxLen = /^[0-3]$/.test(escType) ? 3 : 2;
      const maxPos = pos + maxLen;
      advance(1);
      while (pos < maxPos && /^[0-7]$/.test(escaped[pos] ?? "\0")) {
        advance(1);
      }
      const charCode = parseInt(escaped.slice(octStart, pos), 8) || 0;
      if (
        (charCode > 0 ||
          pos - octStart > 1 ||
          /^[0-9]$/.test(escaped[pos] ?? "\0")) &&
        isTaggedTemplate
      ) {
        // Legacy octal escape, that is one of:
        //
        // - representing a non-null character (e.g. `\1`, `\12`, `\123`)
        // - representing a null character with multiple digits (e.g. `\00`, `\000`)
        // - followed by a decimal digit (e.g. `\09`)
        diagnostics.push({
          type: "OctalEscapeInTemplateString",
          // The whole escape sequence
          loc: {
            start,
            end: { line, column },
          },
        });
      }
      parts.push(
        JSEscapePart(String.fromCharCode(charCode), {
          start,
          end: { line, column },
        }),
      );
      continue;
    } else if (escType === quoteMark || escType === "\\") {
      // Meaningful non-escape
      advance(1);
      parts.push(
        JSEscapePart(escType, {
          start,
          end: { line, column },
        }),
      );
      continue;
    }
    if (/^[89]$/.test(escType) && isTaggedTemplate) {
      // Non-octal decimal escape like `\8` or `\9`
      diagnostics.push({
        type: "NonOctalEscapeInTemplateString",
        // The whole escape sequence
        loc: {
          start,
          end: { line, column: column + 1 },
        },
      });
    }
    // Meaningless non-escapes, including "\8" and "\9"
    // Separate "\" and the following character.
    parts.push(
      JSEmptyEscapePart({
        start,
        end: { line, column },
      }),
    );
  }

  return { line, column };
}

const ESCAPE_MAP: Record<string, string> = {
  // Named escapes
  "'": "'",
  '"': '"',
  "`": "`",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  v: "\v",
};

const LINE_TERMINATORS = new Set(["\n", "\r", "\u2028", "\u2029"]);
