import { describe, expect, it } from "vitest";
import { parse } from "@typescript-eslint/parser";

import {
  MessageListNode,
  PlaintextNode,
  UnknownJSNode,
  type MessageNode,
} from "./ast.ts";
import { parseJSAsMessage } from "./jsdsl-parser.ts";
import {
  JSQuoteClosePart,
  JSQuoteOpenPart,
  JSVerbatimPart,
} from "./js-string.ts";
import { loc, noNode, cleanseMessageNode as cleanse } from "./test-util.ts";
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

describe("parseJSAsMessage", () => {
  it("Interprets string literal as Plaintext", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage(`"Hello, world!"`, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode("js", [
        JSQuoteOpenPart('"', loc(1, 0, 1, 1)),
        JSVerbatimPart("Hello, world!", loc(1, 1, 1, 14)),
        JSQuoteClosePart('"', loc(1, 14, 1, 15)),
      ]),
    );
  });

  it("Interprets simple msg tagged template", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage("msg`Hello, world!`", diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      PlaintextNode("js", [
        JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
        JSVerbatimPart("Hello, world!", loc(1, 4, 1, 17)),
        JSQuoteClosePart("`", loc(1, 17, 1, 18)),
      ]),
    );
  });

  it("Interprets msg tagged template with unknown expressions", () => {
    const diagnostics: Diagnostic[] = [];
    const msg = parseJSTextAsMessage("msg`Hello, ${name}!`", diagnostics);
    expect(diagnostics).toEqual([]);
    expect(cleanse(msg)).toEqual<MessageNode>(
      MessageListNode([
        PlaintextNode("js", [
          JSQuoteOpenPart("`", loc(1, 3, 1, 4)),
          JSVerbatimPart("Hello, ", loc(1, 4, 1, 11)),
          JSQuoteClosePart("${", loc(1, 11, 1, 13)),
        ]),
        UnknownJSNode(noNode()),
        PlaintextNode("js", [
          JSQuoteOpenPart("}", loc(1, 17, 1, 18)),
          JSVerbatimPart("!", loc(1, 18, 1, 19)),
          JSQuoteClosePart("`", loc(1, 19, 1, 20)),
        ]),
      ]),
    );
  });
});
