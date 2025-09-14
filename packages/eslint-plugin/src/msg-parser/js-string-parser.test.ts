import { describe, expect, it } from "vitest";
import { parse } from "@typescript-eslint/parser";

import {
  JSEmptyEscapePart,
  JSEscapePart,
  JSQuoteClosePart,
  JSQuoteOpenPart,
  JSVerbatimPart,
  UnknownJSStringPart,
  type JSString,
} from "./js-string.ts";
import { parseJSString, parseTaggedQuasis } from "./js-string-parser.ts";
import { loc, noNode, cleanseJSString as cleanse } from "./test-util.ts";
import type { Diagnostic } from "./diagnostic.ts";

function parseJSTextAsJSString(input: string): JSString {
  const jsAst = parse(input);
  if (jsAst.body.length !== 1) {
    throw new Error("Expected exactly one statement.");
  }
  const stmt = jsAst.body[0]!;
  if (stmt.type !== "ExpressionStatement") {
    throw new Error("Expected an expression statement.");
  }
  return parseJSString(stmt.expression);
}

function toText(jsString: JSString): string {
  let result = "";
  for (const part of jsString) {
    if (part.type === "UnknownJSStringPart") {
      result += "<unknown>";
    } else {
      result += part.value;
    }
  }
  return result;
}

describe("parseJSAsMessage", () => {
  it("parses a simple string literal", () => {
    const msg = parseJSTextAsJSString(`"Hello, world!"`);
    expect(toText(msg)).toBe("Hello, world!");
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSVerbatimPart("Hello, world!", loc(1, 1, 1, 14)),
      JSQuoteClosePart('"', loc(1, 14, 1, 15)),
    ]);
  });

  it("parses a string literal with double quotes", () => {
    const msg = parseJSTextAsJSString(`"Hello, world!"`);
    expect(toText(msg)).toBe("Hello, world!");
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSVerbatimPart("Hello, world!", loc(1, 1, 1, 14)),
      JSQuoteClosePart('"', loc(1, 14, 1, 15)),
    ]);
  });

  it("parses a string literal with single quotes", () => {
    const msg = parseJSTextAsJSString(`'Hello, world!'`);
    expect(toText(msg)).toBe("Hello, world!");
    expect(msg).toEqual([
      JSQuoteOpenPart("'", loc(1, 0, 1, 1)),
      JSVerbatimPart("Hello, world!", loc(1, 1, 1, 14)),
      JSQuoteClosePart("'", loc(1, 14, 1, 15)),
    ]);
  });

  it("parses escapes interleaved with verbatim texts", () => {
    const msg = parseJSTextAsJSString(`"Hello\\nworld!"`);
    expect(toText(msg)).toBe("Hello\nworld!");
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSVerbatimPart("Hello", loc(1, 1, 1, 6)),
      JSEscapePart("\n", loc(1, 6, 1, 8)),
      JSVerbatimPart("world!", loc(1, 8, 1, 14)),
      JSQuoteClosePart('"', loc(1, 14, 1, 15)),
    ]);
  });

  it("parses named escapes", () => {
    const msg = parseJSTextAsJSString(`"\\'\\"\\\`\\b\\f\\n\\r\\t\\v"`);
    expect(toText(msg)).toBe(`'"\`\b\f\n\r\t\v`);
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSEscapePart("'", loc(1, 1, 1, 3)),
      JSEscapePart('"', loc(1, 3, 1, 5)),
      JSEscapePart("`", loc(1, 5, 1, 7)),
      JSEscapePart("\b", loc(1, 7, 1, 9)),
      JSEscapePart("\f", loc(1, 9, 1, 11)),
      JSEscapePart("\n", loc(1, 11, 1, 13)),
      JSEscapePart("\r", loc(1, 13, 1, 15)),
      JSEscapePart("\t", loc(1, 15, 1, 17)),
      JSEscapePart("\v", loc(1, 17, 1, 19)),
      JSQuoteClosePart('"', loc(1, 19, 1, 20)),
    ]);
  });

  it("parses line continuations", () => {
    const msg = parseJSTextAsJSString(`"a\\\nb\\\rc\\\r\nd\\\u2028e\\\u2029f"`);
    expect(toText(msg)).toBe("abcdef");
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSVerbatimPart("a", loc(1, 1, 1, 2)),
      JSEmptyEscapePart(loc(1, 2, 2, 0)), // line continuation
      JSVerbatimPart("b", loc(2, 0, 2, 1)),
      JSEmptyEscapePart(loc(2, 1, 3, 0)), // line continuation
      JSVerbatimPart("c", loc(3, 0, 3, 1)),
      JSEmptyEscapePart(loc(3, 1, 4, 0)), // line continuation
      JSVerbatimPart("d", loc(4, 0, 4, 1)),
      JSEmptyEscapePart(loc(4, 1, 5, 0)), // line continuation
      JSVerbatimPart("e", loc(5, 0, 5, 1)),
      JSEmptyEscapePart(loc(5, 1, 6, 0)), // line continuation
      JSVerbatimPart("f", loc(6, 0, 6, 1)),
      JSQuoteClosePart('"', loc(6, 1, 6, 2)),
    ]);
  });

  it("parses hex escapes", () => {
    const msg = parseJSTextAsJSString(`"\\x41\\x42\\x43"`);
    expect(toText(msg)).toBe("ABC");
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSEscapePart("A", loc(1, 1, 1, 5)),
      JSEscapePart("B", loc(1, 5, 1, 9)),
      JSEscapePart("C", loc(1, 9, 1, 13)),
      JSQuoteClosePart('"', loc(1, 13, 1, 14)),
    ]);
  });

  it("parses unicode escapes", () => {
    const msg = parseJSTextAsJSString(`"\\u0041\\u0042\\u0043"`);
    expect(toText(msg)).toBe("ABC");
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSEscapePart("A", loc(1, 1, 1, 7)),
      JSEscapePart("B", loc(1, 7, 1, 13)),
      JSEscapePart("C", loc(1, 13, 1, 19)),
      JSQuoteClosePart('"', loc(1, 19, 1, 20)),
    ]);
  });

  it("parses unicode code point escapes", () => {
    const msg = parseJSTextAsJSString(`"\\u{41}\\u{42}\\u{43}"`);
    expect(toText(msg)).toBe("ABC");
    expect(msg).toEqual([
      JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
      JSEscapePart("A", loc(1, 1, 1, 7)),
      JSEscapePart("B", loc(1, 7, 1, 13)),
      JSEscapePart("C", loc(1, 13, 1, 19)),
      JSQuoteClosePart('"', loc(1, 19, 1, 20)),
    ]);
  });

  it("parses a simple template literal", () => {
    const msg = parseJSTextAsJSString(`\`Hello, world!\``);
    expect(toText(msg)).toBe("Hello, world!");
    expect(msg).toEqual([
      JSQuoteOpenPart("`", loc(1, 0, 1, 1)),
      JSVerbatimPart("Hello, world!", loc(1, 1, 1, 14)),
      JSQuoteClosePart("`", loc(1, 14, 1, 15)),
    ]);
  });

  it("parses a template literal with expressions", () => {
    const msg = parseJSTextAsJSString('`Hello, ${"world"}!`');
    expect(toText(msg)).toBe("Hello, world!");
    expect(msg).toEqual([
      JSQuoteOpenPart("`", loc(1, 0, 1, 1)),
      JSVerbatimPart("Hello, ", loc(1, 1, 1, 8)),
      JSQuoteClosePart("${", loc(1, 8, 1, 10)),
      JSQuoteOpenPart('"', loc(1, 10, 1, 11)),
      JSVerbatimPart("world", loc(1, 11, 1, 16)),
      JSQuoteClosePart('"', loc(1, 16, 1, 17)),
      JSQuoteOpenPart("}", loc(1, 17, 1, 18)),
      JSVerbatimPart("!", loc(1, 18, 1, 19)),
      JSQuoteClosePart("`", loc(1, 19, 1, 20)),
    ]);
  });

  it("parses a template literal with unknown expressions", () => {
    const msg = parseJSTextAsJSString("`Hello, ${name}!`");
    expect(toText(msg)).toBe("Hello, <unknown>!");
    expect(cleanse(msg)).toEqual([
      JSQuoteOpenPart("`", loc(1, 0, 1, 1)),
      JSVerbatimPart("Hello, ", loc(1, 1, 1, 8)),
      JSQuoteClosePart("${", loc(1, 8, 1, 10)),
      UnknownJSStringPart(noNode()),
      JSQuoteOpenPart("}", loc(1, 14, 1, 15)),
      JSVerbatimPart("!", loc(1, 15, 1, 16)),
      JSQuoteClosePart("`", loc(1, 16, 1, 17)),
    ]);
  });
});

function parseJSAsQuasis(input: string): [JSString[], Diagnostic[]] {
  const jsAst = parse(input);
  if (jsAst.body.length !== 1) {
    throw new Error("Expected exactly one statement.");
  }
  const stmt = jsAst.body[0]!;
  if (stmt.type !== "ExpressionStatement") {
    throw new Error("Expected an expression statement.");
  }
  const expr = stmt.expression;
  if (expr.type !== "TaggedTemplateExpression") {
    throw new Error("Expected a tagged template expression.");
  }
  const diagnostics: Diagnostic[] = [];
  const quasis = parseTaggedQuasis(expr.quasi.quasis, diagnostics);
  return [quasis, diagnostics];
}

describe("parseTaggedQuasis", () => {
  it("parses a simple tagged template literal", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`Hello, world!`");
    expect(diagnostics).toEqual([]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSVerbatimPart("Hello, world!", loc(1, 4, 1, 17)),
        JSQuoteClosePart("`", loc(1, 17, 1, 18)),
      ],
    ]);
  });

  it("reports octal escapes of value > 0", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\1`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "OctalEscapeInTemplateString",
        loc: loc(1, 4, 1, 6),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEscapePart("\x01", loc(1, 4, 1, 6)),
        JSQuoteClosePart("`", loc(1, 6, 1, 7)),
      ],
    ]);
  });

  it("reports octal null escapes of multiple digits", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\00`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "OctalEscapeInTemplateString",
        loc: loc(1, 4, 1, 7),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEscapePart("\0", loc(1, 4, 1, 7)),
        JSQuoteClosePart("`", loc(1, 7, 1, 8)),
      ],
    ]);
  });

  it("reports octal null escapes followed by non-octal digit", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\009`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "OctalEscapeInTemplateString",
        loc: loc(1, 4, 1, 7),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEscapePart("\0", loc(1, 4, 1, 7)),
        JSVerbatimPart("9", loc(1, 7, 1, 8)),
        JSQuoteClosePart("`", loc(1, 8, 1, 9)),
      ],
    ]);
  });

  it("reports non-octal escapes", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\8\\9`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "NonOctalEscapeInTemplateString",
        loc: loc(1, 4, 1, 6),
      },
      {
        type: "NonOctalEscapeInTemplateString",
        loc: loc(1, 6, 1, 8),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEmptyEscapePart(loc(1, 4, 1, 5)),
        JSVerbatimPart("8", loc(1, 5, 1, 6)),
        JSEmptyEscapePart(loc(1, 6, 1, 7)),
        JSVerbatimPart("9", loc(1, 7, 1, 8)),
        JSQuoteClosePart("`", loc(1, 8, 1, 9)),
      ],
    ]);
  });

  it("reports incomplete hex escapes", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\x\\xF`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "IncompleteHexEscapeInTemplateString",
        loc: loc(1, 6, 1, 6),
      },
      {
        type: "IncompleteHexEscapeInTemplateString",
        loc: loc(1, 9, 1, 9),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEscapePart("\x00", loc(1, 4, 1, 6)),
        JSEscapePart("\x0F", loc(1, 6, 1, 9)),
        JSQuoteClosePart("`", loc(1, 9, 1, 10)),
      ],
    ]);
  });

  it("reports incomplete 4-digit unicode escapes", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\u\\u123`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "IncompleteHexEscapeInTemplateString",
        loc: loc(1, 6, 1, 6),
      },
      {
        type: "IncompleteHexEscapeInTemplateString",
        loc: loc(1, 11, 1, 11),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEscapePart("\u0000", loc(1, 4, 1, 6)),
        JSEscapePart("\u0123", loc(1, 6, 1, 11)),
        JSQuoteClosePart("`", loc(1, 11, 1, 12)),
      ],
    ]);
  });

  it("reports incomplete braced unicode escapes", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\u{\\u{123`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "IncompleteHexEscapeInTemplateString",
        loc: loc(1, 7, 1, 7),
      },
      {
        type: "IncompleteUnicodeEscapeInTemplateString",
        loc: loc(1, 13, 1, 13),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEscapePart("\u0000", loc(1, 4, 1, 7)),
        JSEscapePart("\u0123", loc(1, 7, 1, 13)),
        JSQuoteClosePart("`", loc(1, 13, 1, 14)),
      ],
    ]);
  });

  it("reports code point out of range", () => {
    const [quasis, diagnostics] = parseJSAsQuasis("tag`\\u{110000}`");
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "CodePointOutOfRangeInTemplateString",
        loc: loc(1, 7, 1, 13),
      },
    ]);
    expect(quasis).toEqual<JSString[]>([
      [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSEscapePart("\uFFFD", loc(1, 4, 1, 14)), // Replacement character
        JSQuoteClosePart("`", loc(1, 14, 1, 15)),
      ],
    ]);
  });
});
