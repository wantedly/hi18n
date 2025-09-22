import { describe, expect, it } from "vitest";
import { parse } from "@typescript-eslint/parser";

import {
  InvalidArgNode,
  MessageListNode,
  MFEscapePart,
  NumberArgNode,
  PlaintextNode,
  StringArgNode,
  type MessageNode,
} from "./ast.ts";
import { parseJSAsMessage } from "./jsdsl-parser.ts";
import { cleanseMessageNode as cleanse, loc } from "./test-util.ts";
import { JSEscapePart, JSVerbatimPart } from "./js-string.ts";
import type { Diagnostic } from "./diagnostic.ts";

function parseJSTextAsMessage(
  input: string,
  diagnostics: Diagnostic[],
): MessageNode {
  const jsAst = parse(input);
  if (jsAst.body.length !== 1) {
    throw new Error("Expected exactly one statement.");
  }
  const stmt = jsAst.body[0]!;
  if (stmt.type !== "ExpressionStatement") {
    throw new Error("Expected an expression statement.");
  }
  return parseJSAsMessage(stmt.expression, diagnostics);
}

describe("parseMF1", () => {
  it("parses simple verbatim message", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, world!")`, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode("mf1", [JSVerbatimPart("Hello, world!", loc(1, 5, 1, 18))]),
    );
  });

  it("parses simple verbatim message with JS escapes", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("He\\x6C\\x6Co")`, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode("mf1", [
        JSVerbatimPart("He", loc(1, 5, 1, 7)),
        JSEscapePart("l", loc(1, 7, 1, 11)),
        JSEscapePart("l", loc(1, 11, 1, 15)),
        JSVerbatimPart("o", loc(1, 15, 1, 16)),
      ]),
    );
  });

  it("parses message with plain quotes", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, I'm here.")`, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode("mf1", [
        JSVerbatimPart("Hello, I'm here.", loc(1, 5, 1, 21)),
      ]),
    );
  });

  it("parses message with escaped quotes", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, I''m here.")`, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode("mf1", [
        JSVerbatimPart("Hello, I", loc(1, 5, 1, 13)),
        MFEscapePart("'", [JSVerbatimPart("''", loc(1, 13, 1, 15))]),
        JSVerbatimPart("m here.", loc(1, 15, 1, 22)),
      ]),
    );
  });

  it("parses message with simple argument", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, {name}!")`, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("Hello, ", loc(1, 5, 1, 12))]),
        StringArgNode("name", [JSVerbatimPart("name", loc(1, 13, 1, 17))]),
        PlaintextNode("mf1", [JSVerbatimPart("!", loc(1, 18, 1, 19))]),
      ]),
    );
  });

  it("parses message with numeric-named argument", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, {0}!")`, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("Hello, ", loc(1, 5, 1, 12))]),
        StringArgNode(0, [JSVerbatimPart("0", loc(1, 13, 1, 14))]),
        PlaintextNode("mf1", [JSVerbatimPart("!", loc(1, 15, 1, 16))]),
      ]),
    );
  });

  it("parses message with whitespace", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(
      `msg("Hello, {  name \t }!")`,
      diagnostics,
    );
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("Hello, ", loc(1, 5, 1, 12))]),
        StringArgNode("name", [JSVerbatimPart("name", loc(1, 15, 1, 19))]),
        PlaintextNode("mf1", [JSVerbatimPart("!", loc(1, 23, 1, 24))]),
      ]),
    );
  });

  it("reports error for invalid argument `{`", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, {")`, diagnostics);
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "UnterminatedArgumentInMF1",
        loc: loc(1, 13, 1, 14),
      },
    ]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("Hello, ", loc(1, 5, 1, 12))]),
        InvalidArgNode(undefined, undefined),
      ]),
    );
  });

  it("reports error for invalid argument `{}`", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, {}")`, diagnostics);
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "InvalidArgumentInMF1",
        loc: loc(1, 13, 1, 14),
      },
    ]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("Hello, ", loc(1, 5, 1, 12))]),
        InvalidArgNode(undefined, undefined),
      ]),
    );
  });

  it("reports error for invalid argument `{foo`", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, {foo")`, diagnostics);
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "UnterminatedArgumentInMF1",
        loc: loc(1, 16, 1, 17),
      },
    ]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("Hello, ", loc(1, 5, 1, 12))]),
        InvalidArgNode("foo", [JSVerbatimPart("foo", loc(1, 13, 1, 16))]),
      ]),
    );
  });

  it("reports error for invalid argument `{foo+}`", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`msg("Hello, {foo+}")`, diagnostics);
    expect(diagnostics).toEqual<Diagnostic[]>([
      {
        type: "InvalidArgumentInMF1",
        loc: loc(1, 16, 1, 17),
      },
    ]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("Hello, ", loc(1, 5, 1, 12))]),
        InvalidArgNode("foo", [JSVerbatimPart("foo", loc(1, 13, 1, 16))]),
      ]),
    );
  });

  it("parses message with number-typed argument", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(
      `msg("You have {num, number} new messages.")`,
      diagnostics,
    );
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("mf1", [JSVerbatimPart("You have ", loc(1, 5, 1, 14))]),
        NumberArgNode("num", [JSVerbatimPart("num", loc(1, 15, 1, 18))]),
        PlaintextNode("mf1", [
          JSVerbatimPart(" new messages.", loc(1, 27, 1, 41)),
        ]),
      ]),
    );
  });
});
