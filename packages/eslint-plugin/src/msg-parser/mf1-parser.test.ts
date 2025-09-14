import { describe, expect, it } from "vitest";
import { parse } from "@typescript-eslint/parser";

import { MFEscapePart, PlaintextNode, type MessageNode } from "./ast.ts";
import { parseJSAsMessage } from "./jsdsl-parser.ts";
import { cleanseMessageNode as cleanse, loc } from "./test-util.ts";
import { JSEscapePart, JSVerbatimPart } from "./js-string.ts";

function parseJSTextAsMessage(input: string): MessageNode {
  const jsAst = parse(input);
  if (jsAst.body.length !== 1) {
    throw new Error("Expected exactly one statement.");
  }
  const stmt = jsAst.body[0]!;
  if (stmt.type !== "ExpressionStatement") {
    throw new Error("Expected an expression statement.");
  }
  return parseJSAsMessage(stmt.expression, []);
}

describe("parseMF1", () => {
  it("parses simple verbatim message", () => {
    const msg = parseJSTextAsMessage(`msg("Hello, world!")`);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode([JSVerbatimPart("Hello, world!", loc(1, 5, 1, 18))]),
    );
  });

  it("parses simple verbatim message with JS escapes", () => {
    const msg = parseJSTextAsMessage(`msg("He\\x6C\\x6Co")`);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode([
        JSVerbatimPart("He", loc(1, 5, 1, 7)),
        JSEscapePart("l", loc(1, 7, 1, 11)),
        JSEscapePart("l", loc(1, 11, 1, 15)),
        JSVerbatimPart("o", loc(1, 15, 1, 16)),
      ]),
    );
  });

  it("parses message with plain quotes", () => {
    const msg = parseJSTextAsMessage(`msg("Hello, I'm here.")`);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode([JSVerbatimPart("Hello, I'm here.", loc(1, 5, 1, 21))]),
    );
  });

  it("parses message with escaped quotes", () => {
    const msg = parseJSTextAsMessage(`msg("Hello, I''m here.")`);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode([
        JSVerbatimPart("Hello, I", loc(1, 5, 1, 13)),
        MFEscapePart("'", [JSVerbatimPart("''", loc(1, 13, 1, 15))]),
        JSVerbatimPart("m here.", loc(1, 15, 1, 22)),
      ]),
    );
  });
});
