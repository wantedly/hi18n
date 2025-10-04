import { describe, expect, it } from "vitest";
import {
  parseMF1Message,
  parseMF1MessageWithDiagnostics,
} from "./msgfmt-parser.ts";
import {
  MF1DateTimeArgNode,
  MF1ConcatNode,
  MF1NumberArgNode,
  MF1TextNode,
  MF1PluralArgNode,
  MF1StringArgNode,
  type MF1Node,
  MF1PluralBranch,
  MF1ElementArgNode,
  MF1InvalidArgNode,
  MF1InvalidElementArgNode,
  MF1InvalidPluralArgNode,
  type Range,
} from "./msgfmt.ts";
import type { Diagnostic } from "./diagnostics.ts";

describe("parseMF1Message", () => {
  describe("plain text parsing", () => {
    it("parses the empty message", () => {
      const src = "";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("", { range: pos(src, "") }),
      );
    });

    it("parses unescaped ASCII texts", () => {
      const src = "Hello, world!";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("Hello, world!", { range: pos(src, "Hello, world!") }),
      );
    });

    it("parses unescaped non-ASCII texts", () => {
      const src = "こんにちは世界!";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("こんにちは世界!", { range: pos(src, "こんにちは世界!") }),
      );
    });

    it("parses unescaped ASCII texts with symbols", () => {
      const src = "1 + 1 = 2";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("1 + 1 = 2", { range: pos(src, "1 + 1 = 2") }),
      );
    });

    it("parses plain #", () => {
      const src = "#";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("#", { range: pos(src, "#") }),
      );
    });

    it("parses unescaped single quotes", () => {
      const src = "I'm not a fond of this syntax.";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("I'm not a fond of this syntax.", {
          range: pos(src, "I'm not a fond of this syntax."),
        }),
      );
    });

    it("parses a pair of unescaped single quotes", () => {
      const src = "a'b {name} c'd";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("a'b ", { range: pos(src, "a'b ") }),
            MF1StringArgNode("name", { range: pos(src, "{name}") }),
            MF1TextNode(" c'd", { range: pos(src, " c'd") }),
          ],
          { range: pos(src, "a'b {name} c'd") },
        ),
      );
    });

    it("parses escaped single quotes", () => {
      const src = "I''m not a fond of this syntax.";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("I'm not a fond of this syntax.", {
          range: pos(src, "I''m not a fond of this syntax."),
        }),
      );
    });

    it("parses quoted texts starting with RBrace", () => {
      const src = "'{foo}'";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("{foo}", { range: pos(src, "'{foo}'") }),
      );
    });

    it("parses quoted texts starting with various symbols", () => {
      const src = "foo, '{bar}', '{}#|', '{a''b}', ''''";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("foo, {bar}, {}#|, {a'b}, ''", {
          range: pos(src, "foo, '{bar}', '{}#|', '{a''b}', ''''"),
        }),
      );
    });

    it("parses quoted texts starting with # or |", () => {
      // They are always quotable although conditional
      const src = "'# {}' '| {}'";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("# {} | {}", { range: pos(src, "'# {}' '| {}'") }),
      );
    });

    it("parses quoted texts starting with <", () => {
      const src = "'< {}'";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("< {}", { range: pos(src, "'< {}'") }),
      );
    });

    it("reports an error on unclosed quoted texts", () => {
      const src = "'{foo";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "UnclosedQuotedString", range: pos(src, "", { pre: "foo" }) },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1TextNode("{foo", { range: pos(src, "'{foo") }),
      );
    });
  });

  it("reports an error on unclosed quoted strings", () => {
    const src = "'{foo";
    const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
    expect(diagnostics).toEqual<readonly Diagnostic[]>([
      { type: "UnclosedQuotedString", range: pos(src, "", { pre: "foo" }) },
    ]);
    expect(msg).toEqual<MF1Node>(
      MF1TextNode("{foo", { range: pos(src, "'{foo") }),
    );
  });

  describe("tokenization", () => {
    it("skips spaces", () => {
      const src = "{ foo }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: pos(src, "{ foo }") }),
      );
    });

    it("skips newlines", () => {
      const src = "{\nfoo\n}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: pos(src, "{\nfoo\n}") }),
      );
    });

    it("reports errors on invalid controls", () => {
      const src = "{\x7Ffoo}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidCharacter", range: pos(src, "\x7F") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: pos(src, "{\x7Ffoo}") }),
      );
    });

    it("reports errors on invalid identifiers", () => {
      const src = "{foo🍺}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidIdentifier", range: pos(src, "foo🍺") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1StringArgNode("foo🍺", { range: pos(src, "{foo🍺}") }),
      );
    });

    it("reports errors on invalid numbers (leading zero)", () => {
      const src = "{0123}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: pos(src, "0123") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1StringArgNode(123, { range: pos(src, "{0123}") }),
      );
    });
  });

  describe("string argument parsing", () => {
    it("parses simple string arguments", () => {
      const src = "{foo}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: pos(src, "{foo}") }),
      );
    });

    it("parses string arguments with texts and whitespaces (1)", () => {
      const src = "foo { foo }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: pos(src, "foo ") }),
            MF1StringArgNode("foo", { range: pos(src, "{ foo }") }),
          ],
          { range: pos(src, "foo { foo }") },
        ),
      );
    });

    it("parses string arguments with texts and whitespaces (2)", () => {
      const src = "foo { foo } bar { bar }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: pos(src, "foo ") }),
            MF1StringArgNode("foo", { range: pos(src, "{ foo }") }),
            MF1TextNode(" bar ", { range: pos(src, " bar ") }),
            MF1StringArgNode("bar", { range: pos(src, "{ bar }") }),
          ],
          { range: pos(src, "foo { foo } bar { bar }") },
        ),
      );
    });

    it("parses string arguments with numbered parameter names", () => {
      const src = "{2}{ 0 }, {1}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1StringArgNode(2, { range: pos(src, "{2}") }),
            MF1StringArgNode(0, { range: pos(src, "{ 0 }") }),
            MF1TextNode(", ", { range: pos(src, ", ") }),
            MF1StringArgNode(1, { range: pos(src, "{1}") }),
          ],
          { range: pos(src, "{2}{ 0 }, {1}") },
        ),
      );
    });

    it("reports an error on LBrace + EOF", () => {
      const src = "{";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["number", "identifier"],
          range: [src.length, src.length],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode(undefined, { range: pos(src, "{") }),
      );
    });

    it("reports an error on LBrace + unknown symbol", () => {
      const src = "{$";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["number", "identifier"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode(undefined, { range: pos(src, "{$") }),
      );
    });

    it("reports an error on invalid number (followed by alpha)", () => {
      const src = "{123foo}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: pos(src, "123foo") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1StringArgNode(123, { range: pos(src, "{123foo}") }),
      );
    });

    it("reports an error on invalid number (leading zero)", () => {
      const src = "{0123}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: pos(src, "0123") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1StringArgNode(123, { range: pos(src, "{0123}") }),
      );
    });

    it("reports an error on LBrace + ident + EOF", () => {
      const src = "{foo";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["}", ","],
          range: [src.length, src.length],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo") }),
      );
    });

    it("reports an error on LBrace + ident + unknown symbol", () => {
      const src = "{foo%";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "%",
          expected: ["}", ","],
          range: pos(src, "%"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo%") }),
      );
    });
  });

  describe("type-specific argument parsing", () => {
    it("reports an error on LBrace + ident + comma + RBrace", () => {
      const src = "{foo,}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "}",
          expected: ["identifier"],
          range: pos(src, "}"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,}") }),
      );
    });

    it("reports an error on LBrace + ident + comma + unknown symbol", () => {
      const src = "{foo,$}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["identifier"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,$}") }),
      );
    });

    it("reports an error on unknown argType", () => {
      const src = "{foo,integer}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgType",
          argType: "integer",
          expected: ["number", "date", "time"],
          range: pos(src, "integer"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,integer}") }),
      );
    });

    it("reports an error on argType + unknown symbol", () => {
      const src = "{foo,number$}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["}", ","],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,number$}") }),
      );
    });

    it("reports an error on argType + EOF", () => {
      const src = "{foo,number";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["}", ","],
          range: [src.length, src.length],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,number") }),
      );
    });
  });

  describe("number argument parsing", () => {
    it("parses simple number arguments", () => {
      const src = "{foo,number}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1NumberArgNode("foo", {}, { range: pos(src, "{foo,number}") }),
      );
    });

    it("parses number arguments with texts and whitespaces (1)", () => {
      const src = "foo { foo , number }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: pos(src, "foo ") }),
            MF1NumberArgNode(
              "foo",
              {},
              { range: pos(src, "{ foo , number }") },
            ),
          ],
          { range: pos(src, "foo { foo , number }") },
        ),
      );
    });

    it("parses number arguments with texts and whitespaces (2)", () => {
      const src = "foo { foo , date } bar { bar , time }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: pos(src, "foo ") }),
            MF1DateTimeArgNode(
              "foo",
              { dateStyle: "medium" },
              { range: pos(src, "{ foo , date }") },
            ),
            MF1TextNode(" bar ", { range: pos(src, " bar ") }),
            MF1DateTimeArgNode(
              "bar",
              { timeStyle: "medium" },
              { range: pos(src, "{ bar , time }") },
            ),
          ],
          { range: pos(src, "foo { foo , date } bar { bar , time }") },
        ),
      );
    });

    it("reports an error on spellout argType (1)", () => {
      const src = "{2,spellout}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgType",
          argType: "spellout",
          expected: ["number", "date", "time"],
          range: pos(src, "spellout"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode(2, { range: pos(src, "{2,spellout}") }),
      );
    });

    it("reports an error on spellout argType (2)", () => {
      const src = "{foo,spellout,integer}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgType",
          argType: "spellout",
          expected: ["number", "date", "time"],
          range: pos(src, "spellout"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,spellout,integer}") }),
      );
    });

    it("reports an error on ordinal argType", () => {
      const src = "{ 0 , ordinal }";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgType",
          argType: "ordinal",
          expected: ["number", "date", "time"],
          range: pos(src, "ordinal"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode(0, { range: pos(src, "{ 0 , ordinal }") }),
      );
    });

    it("parses integer style", () => {
      const src = "{foo,number,integer}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1NumberArgNode(
          "foo",
          { maximumFractionDigits: 0 },
          { range: pos(src, "{foo,number,integer}") },
        ),
      );
    });

    it("reports an error on currency style", () => {
      const src = "{foo,number,currency}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgStyle",
          argType: "number",
          argStyle: "currency",
          expected: ["integer", "percent"],
          range: pos(src, "currency"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,number,currency}") }),
      );
    });

    it("parses percent style", () => {
      const src = "{foo,number,percent}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1NumberArgNode(
          "foo",
          { style: "percent" },
          { range: pos(src, "{foo,number,percent}") },
        ),
      );
    });

    it("reports an error on unknown symbol style", () => {
      const src = "{foo,number,$}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["identifier", "::"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,number,$}") }),
      );
    });

    it("reports an error on unknown style name (1)", () => {
      const src = "{foo,number,foobar}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgStyle",
          argType: "number",
          argStyle: "foobar",
          expected: ["integer", "percent"],
          range: pos(src, "foobar"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,number,foobar}") }),
      );
    });

    it("reports an error on unknown style name (2)", () => {
      const src = "{foo,number,full}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgStyle",
          argType: "number",
          argStyle: "full",
          expected: ["integer", "percent"],
          range: pos(src, "full"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,number,full}") }),
      );
    });

    it("reports an error on skeleton style", () => {
      const src = "{foo,number,::currency/USD}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgStyle",
          argType: "number",
          argStyle: "::skeleton",
          expected: ["integer", "percent"],
          range: pos(src, "::"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,number,::currency/USD}"),
        }),
      );
    });

    it("reports an error on unknown symbol after style name", () => {
      const src = "{foo,number,integer$}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["}"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,number,integer$}") }),
      );
    });
  });

  describe("duration argument parsing", () => {
    it("reports an error on duration argType", () => {
      const src = "{1,duration}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgType",
          argType: "duration",
          expected: ["number", "date", "time"],
          range: pos(src, "duration"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode(1, { range: pos(src, "{1,duration}") }),
      );
    });
  });

  describe("date/time argument parsing", () => {
    it("parses simple date arguments", () => {
      const src = "{foo,date}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { dateStyle: "medium" },
          { range: pos(src, "{foo,date}") },
        ),
      );
    });

    it("parses short date style", () => {
      const src = "{foo,date,short}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { dateStyle: "short" },
          { range: pos(src, "{foo,date,short}") },
        ),
      );
    });

    it("parses medium date style", () => {
      const src = "{foo,date,medium}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { dateStyle: "medium" },
          { range: pos(src, "{foo,date,medium}") },
        ),
      );
    });

    it("parses long date style", () => {
      const src = "{foo,date,long}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { dateStyle: "long" },
          { range: pos(src, "{foo,date,long}") },
        ),
      );
    });

    it("parses full date style", () => {
      const src = "{foo,date,full}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { dateStyle: "full" },
          { range: pos(src, "{foo,date,full}") },
        ),
      );
    });

    it("parses simple time arguments", () => {
      const src = "{foo,time}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { timeStyle: "medium" },
          { range: pos(src, "{foo,time}") },
        ),
      );
    });

    it("parses short time style", () => {
      const src = "{foo,time,short}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { timeStyle: "short" },
          { range: pos(src, "{foo,time,short}") },
        ),
      );
    });

    it("parses medium time style", () => {
      const src = "{foo,time,medium}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { timeStyle: "medium" },
          { range: pos(src, "{foo,time,medium}") },
        ),
      );
    });

    it("parses long time style", () => {
      const src = "{foo,time,long}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { timeStyle: "long" },
          { range: pos(src, "{foo,time,long}") },
        ),
      );
    });

    it("parses full time style", () => {
      const src = "{foo,time,full}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { timeStyle: "full" },
          { range: pos(src, "{foo,time,full}") },
        ),
      );
    });

    it("parses date skeleton style", () => {
      const src = "{foo,date,::MMMMdjmm}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          {
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            month: "long",
          },
          { range: pos(src, "{foo,date,::MMMMdjmm}") },
        ),
      );
    });

    it("reports an error on unknown style name", () => {
      const src = "{foo,date,integer}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgStyle",
          argType: "date",
          argStyle: "integer",
          expected: ["short", "medium", "long", "full", "::skeleton"],
          range: pos(src, "integer"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,date,integer}") }),
      );
    });

    it("reports an error on invalid date skeleton (1)", () => {
      const src = "{foo,date,::YYYYwwEEEE}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "InvalidDateSkeleton",
          component: "YYYY",
          range: pos(src, "YYYYwwEEEE"),
        },
        {
          type: "InvalidDateSkeleton",
          component: "ww",
          range: pos(src, "YYYYwwEEEE"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          {
            weekday: "long",
          },
          { range: pos(src, "{foo,date,::YYYYwwEEEE}") },
        ),
      );
    });

    it("reports an error on invalid date skeleton (2)", () => {
      const src = "{foo,date,::G}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InsufficientFieldsInDateSkeleton", range: pos(src, "G") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          { era: "short" },
          { range: pos(src, "{foo,date,::G}") },
        ),
      );
    });
  });

  it("reports an error on choiceArg", () => {
    const src = "{foo,choice,0#zero|1#one}";
    const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
    expect(diagnostics).toEqual<readonly Diagnostic[]>([
      {
        type: "UnexpectedArgType",
        argType: "choice",
        expected: ["number", "date", "time"],
        range: pos(src, "choice"),
      },
    ]);
    expect(msg).toEqual<MF1Node>(
      MF1InvalidArgNode("foo", {
        range: pos(src, "{foo,choice,0#zero|1#one}"),
      }),
    );
  });

  describe("plural branch parsing", () => {
    it("parses simple plural branches", () => {
      const src = "{foo,plural,one{an apple}other{apples}}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(
              "one",
              MF1TextNode("an apple", { range: pos(src, "an apple") }),
              { range: pos(src, "one{an apple}") },
            ),
          ],
          MF1TextNode("apples", { range: pos(src, "apples") }),
          { range: pos(src, "{foo,plural,one{an apple}other{apples}}") },
        ),
      );
    });

    it("parses plural branches with spaces", () => {
      const src = " { foo , plural , one { an apple } other { apples } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: pos(src, " ") }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1TextNode(" an apple ", { range: pos(src, " an apple ") }),
                  { range: pos(src, "one { an apple }") },
                ),
              ],
              MF1TextNode(" apples ", { range: pos(src, " apples ") }),
              {
                range: pos(
                  src,
                  "{ foo , plural , one { an apple } other { apples } }",
                ),
              },
            ),
            MF1TextNode(" ", { range: pos(src, " ", { pre: "} }" }) }),
          ],
          {
            range: pos(
              src,
              " { foo , plural , one { an apple } other { apples } } ",
            ),
          },
        ),
      );
    });

    it("parses plural branches with exact matchers", () => {
      const src = "{foo,plural,=1{bar}=2{barbar}other{barbarbar}}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(1, MF1TextNode("bar", { range: pos(src, "bar") }), {
              range: pos(src, "=1{bar}"),
            }),
            MF1PluralBranch(
              2,
              MF1TextNode("barbar", { range: pos(src, "barbar") }),
              {
                range: pos(src, "=2{barbar}"),
              },
            ),
          ],
          MF1TextNode("barbarbar", { range: pos(src, "barbarbar") }),
          { range: pos(src, "{foo,plural,=1{bar}=2{barbar}other{barbarbar}}") },
        ),
      );
    });

    it("parses plural branches with exact matchers and spaces", () => {
      const src =
        " { foo , plural , =1 { bar } =2 { barbar } other { barbarbar } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: pos(src, " ") }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  1,
                  MF1TextNode(" bar ", { range: pos(src, " bar ") }),
                  {
                    range: pos(src, "=1 { bar }"),
                  },
                ),
                MF1PluralBranch(
                  2,
                  MF1TextNode(" barbar ", { range: pos(src, " barbar ") }),
                  { range: pos(src, "=2 { barbar }") },
                ),
              ],
              MF1TextNode(" barbarbar ", { range: pos(src, " barbarbar ") }),
              {
                range: pos(
                  src,
                  "{ foo , plural , =1 { bar } =2 { barbar } other { barbarbar } }",
                ),
              },
            ),
            MF1TextNode(" ", { range: pos(src, " ", { pre: "} }" }) }),
          ],
          {
            range: pos(
              src,
              " { foo , plural , =1 { bar } =2 { barbar } other { barbarbar } } ",
            ),
          },
        ),
      );
    });

    it("parses plural branches with offset", () => {
      const src = "{foo,plural,offset:1 one{an apple}other{apples}}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(
              "one",
              MF1TextNode("an apple", { range: pos(src, "an apple") }),
              { range: pos(src, "one{an apple}") },
            ),
          ],
          MF1TextNode("apples", { range: pos(src, "apples") }),
          {
            subtract: 1,
            range: pos(src, "{foo,plural,offset:1 one{an apple}other{apples}}"),
          },
        ),
      );
    });

    it("parses plural branches with offset and spaces", () => {
      const src =
        " { foo , plural , offset:1 one { an apple } other { apples } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: pos(src, " ") }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1TextNode(" an apple ", { range: pos(src, " an apple ") }),
                  { range: pos(src, "one { an apple }") },
                ),
              ],
              MF1TextNode(" apples ", { range: pos(src, " apples ") }),
              {
                subtract: 1,
                range: pos(
                  src,
                  "{ foo , plural , offset:1 one { an apple } other { apples } }",
                ),
              },
            ),
            MF1TextNode(" ", { range: pos(src, " ", { pre: "} }" }) }),
          ],
          {
            range: pos(
              src,
              " { foo , plural , offset:1 one { an apple } other { apples } } ",
            ),
          },
        ),
      );
    });

    it("parses plural branches with #", () => {
      const src = "{foo,plural,one{# apple}other{# apples}}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(
              "one",
              MF1ConcatNode(
                [
                  MF1NumberArgNode("foo", {}, { range: pos(src, "#") }),
                  MF1TextNode(" apple", { range: pos(src, " apple") }),
                ],
                { range: pos(src, "# apple") },
              ),
              { range: pos(src, "one{# apple}") },
            ),
          ],
          MF1ConcatNode(
            [
              MF1NumberArgNode(
                "foo",
                {},
                { range: pos(src, "#", { index: 1 }) },
              ),
              MF1TextNode(" apples", { range: pos(src, " apples") }),
            ],
            { range: pos(src, "# apples") },
          ),
          {
            subtract: 0,
            range: pos(src, "{foo,plural,one{# apple}other{# apples}}"),
          },
        ),
      );
    });

    it("parses plural branches with # and spaces", () => {
      const src = " { foo , plural , one { # apple } other { # apples } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: pos(src, " ") }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1ConcatNode(
                    [
                      MF1TextNode(" ", {
                        range: pos(src, " ", { pre: "one {" }),
                      }),
                      MF1NumberArgNode("foo", {}, { range: pos(src, "#") }),
                      MF1TextNode(" apple ", { range: pos(src, " apple ") }),
                    ],
                    { range: pos(src, " # apple ") },
                  ),
                  { range: pos(src, "one { # apple }") },
                ),
              ],
              MF1ConcatNode(
                [
                  MF1TextNode(" ", {
                    range: pos(src, " ", { pre: "other {" }),
                  }),
                  MF1NumberArgNode(
                    "foo",
                    {},
                    { range: pos(src, "#", { index: 1 }) },
                  ),
                  MF1TextNode(" apples ", { range: pos(src, " apples ") }),
                ],
                { range: pos(src, " # apples ") },
              ),
              {
                subtract: 0,
                range: pos(
                  src,
                  "{ foo , plural , one { # apple } other { # apples } }",
                ),
              },
            ),
            MF1TextNode(" ", { range: pos(src, " ", { pre: "} }" }) }),
          ],
          {
            range: pos(
              src,
              " { foo , plural , one { # apple } other { # apples } } ",
            ),
          },
        ),
      );
    });

    it("reports an error on plural + EOF", () => {
      const src = "{foo,plural";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: [","],
          range: [src.length, src.length],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,plural") }),
      );
    });

    it("reports an error on plural + unknown symbol", () => {
      const src = "{foo,plural%}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "%",
          expected: [","],
          range: pos(src, "%"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,plural%}") }),
      );
    });

    it("reports an error on plural + RBrace", () => {
      const src = "{foo,plural}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "}",
          expected: [","],
          range: pos(src, "}"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,plural}") }),
      );
    });

    it("reports an error on plural + comma + unknown symbol", () => {
      const src = "{foo,plural,$}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["offset:", "identifier", "=", "}"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: pos(src, "{foo,plural,$}") }),
      );
    });

    it("reports an error on plural + comma + RBrace", () => {
      const src = "{foo,plural,}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "PluralLastSelector",
          range: pos(src, "{foo,plural,}"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidPluralArgNode("foo", { range: pos(src, "{foo,plural,}") }),
      );
    });

    it("reports an error on = + identifier", () => {
      const src = "{foo,plural,=foo{}other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "identifier",
          expected: ["number"],
          range: pos(src, "foo", { index: 1 }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,=foo{}other{}}"),
        }),
      );
    });

    it("reports an error on = + spaces + number", () => {
      const src = "{foo,plural,= 42{}other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "InvalidSpaces",
          range: pos(src, " ", { pre: "=" }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(
              42,
              MF1TextNode("", {
                range: pos(src, "", { pre: "= 42{" }),
              }),
              {
                range: pos(src, "= 42{}"),
              },
            ),
          ],
          MF1TextNode("", {
            range: pos(src, "", { pre: "other{" }),
          }),
          { range: pos(src, "{foo,plural,= 42{}other{}}") },
        ),
      );
    });

    it("reports an error on identifier + identifier", () => {
      const src = "{foo,plural,one other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "identifier",
          expected: ["{"],
          range: pos(src, " other"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,one other{}}"),
        }),
      );
    });

    it("reports an error on = + number + identifier", () => {
      const src = "{foo,plural,=42 other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "identifier",
          expected: ["{"],
          range: pos(src, " other"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,=42 other{}}"),
        }),
      );
    });

    it("reports an error on identifier + unknown symbol", () => {
      const src = "{foo,plural,one?{}other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "?",
          expected: ["{"],
          range: pos(src, "?"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,one?{}other{}}"),
        }),
      );
    });

    it("reports an error on number without =", () => {
      const src = "{foo,plural,42{}other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "number",
          expected: ["offset:", "identifier", "=", "}"],
          range: pos(src, "42"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,42{}other{}}"),
        }),
      );
    });

    it("reports an error on extra commas between branches", () => {
      const src = "{foo,plural,one{},other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: ",",
          expected: ["identifier", "=", "}"],
          range: pos(src, ",", { index: 2 }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,one{},other{}}"),
        }),
      );
    });

    it("reports an error on an unterminated branch (1)", () => {
      const src = "{foo,plural,one{}other{";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["}"],
          range: [src.length, src.length],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,one{}other{"),
        }),
      );
    });

    it("reports an error on an unterminated branch (2)", () => {
      const src = "{foo,plural,one{}other{'}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "UnclosedQuotedString", range: [src.length, src.length] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,one{}other{'}}"),
        }),
      );
    });

    it("reports an error on an extra comma at the end of the branches", () => {
      const src = "{foo,plural,one{}other{},}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: ",",
          expected: ["identifier", "=", "}"],
          range: pos(src, ",", { index: 2 }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,one{}other{},}"),
        }),
      );
    });

    it("reports an error on missing branch body", () => {
      const src = "{foo,plural,one{}other}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "}",
          expected: ["{"],
          range: pos(src, "}", { index: 1 }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", {
          range: pos(src, "{foo,plural,one{}other}"),
        }),
      );
    });

    it("reports an error on missing catch-all branch", () => {
      const src = "{foo,plural,one{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "PluralLastSelector",
          range: pos(src, "one{}"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidPluralArgNode("foo", {
          range: pos(src, "{foo,plural,one{}}"),
        }),
      );
    });
  });

  describe("element parsing", () => {
    it("parses simple number-parameterized elements", () => {
      const src = "Click <0>here</0>!";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("Click ", { range: pos(src, "Click ") }),
            MF1ElementArgNode(
              0,
              MF1TextNode("here", { range: pos(src, "here") }),
              {
                range: pos(src, "<0>here</0>"),
              },
            ),
            MF1TextNode("!", { range: pos(src, "!") }),
          ],
          { range: pos(src, "Click <0>here</0>!") },
        ),
      );
    });

    it("parses elements with spaces", () => {
      const src = "Click <0 > here </0 > !";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("Click ", { range: pos(src, "Click ") }),
            MF1ElementArgNode(
              0,
              MF1TextNode(" here ", { range: pos(src, " here ") }),
              {
                range: pos(src, "<0 > here </0 >"),
              },
            ),
            MF1TextNode(" !", { range: pos(src, " !") }),
          ],
          { range: pos(src, "Click <0 > here </0 > !") },
        ),
      );
    });

    it("parses nested elements with both identifier and number parameters", () => {
      const src = "<foo><3></3></foo>";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1ElementArgNode(
            3,
            MF1TextNode("", {
              range: pos(src, "", { pre: "<3>" }),
            }),
            {
              range: pos(src, "<3></3>"),
            },
          ),
          { range: pos(src, "<foo><3></3></foo>") },
        ),
      );
    });

    it("parses self-closing elements", () => {
      const src = "<foo/> and <bar />";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1ElementArgNode("foo", undefined, { range: pos(src, "<foo/>") }),
            MF1TextNode(" and ", { range: pos(src, " and ") }),
            MF1ElementArgNode("bar", undefined, { range: pos(src, "<bar />") }),
          ],
          { range: pos(src, "<foo/> and <bar />") },
        ),
      );
    });

    it("reports an error on < + unknown symbol", () => {
      const src = "<$foo></foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["number", "identifier"],
          range: pos(src, "$"),
        },
        {
          type: "UnexpectedToken",
          tokenDesc: "</",
          expected: ["EOF"],
          range: pos(src, "</"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1InvalidElementArgNode(undefined, { range: pos(src, "<$foo>") }),
            MF1TextNode("</foo>", { range: pos(src, "</foo>") }),
          ],
          { range: pos(src, "<$foo></foo>") },
        ),
      );
    });

    it("reports an error on tag name + unknown symbol", () => {
      const src = "<foo$></foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["/", ">"],
          range: pos(src, "$"),
        },
        {
          type: "UnexpectedToken",
          tokenDesc: "</",
          expected: ["EOF"],
          range: pos(src, "</"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1InvalidElementArgNode(undefined, { range: pos(src, "<foo$>") }),
            MF1TextNode("</foo>", { range: pos(src, "</foo>") }),
          ],
          { range: pos(src, "<foo$></foo>") },
        ),
      );
    });

    it("reports an error on </ + unknown symbol", () => {
      const src = "<foo></$foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["number", "identifier"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1TextNode("", {
            range: pos(src, "", { pre: "<foo>" }),
          }),
          {
            range: pos(src, "<foo></$foo>"),
          },
        ),
      );
    });

    it("reports an error on </ + tag name + unknown symbol", () => {
      const src = "<foo></foo$>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: [">"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1TextNode("", {
            range: pos(src, "", { pre: "<foo>" }),
          }),
          {
            range: pos(src, "<foo></foo$>"),
          },
        ),
      );
    });

    it("reports an error on tag name + / + unknown symbol", () => {
      const src = "<foo/$>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: [">"],
          range: pos(src, "$"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidElementArgNode(undefined, { range: pos(src, "<foo/$>") }),
      );
    });

    it("reports an error on unclosed tag", () => {
      const src = "<foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["<"],
          range: [src.length, src.length],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1TextNode("", { range: [src.length, src.length] }),
          {
            range: pos(src, "<foo>"),
          },
        ),
      );
    });

    it("reports an error on unopened closing tag", () => {
      const src = "</foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "</",
          expected: ["EOF"],
          range: pos(src, "</"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1TextNode("</foo>", { range: pos(src, "</foo>") }),
      );
    });

    it("reports an error on < + space", () => {
      const src = "< foo></foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "InvalidSpaces",
          range: pos(src, " ", { pre: "<" }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1TextNode("", {
            range: pos(src, "", { pre: "< foo>" }),
          }),
          {
            range: pos(src, "< foo></foo>"),
          },
        ),
      );
    });

    it("reports an error on </ + space", () => {
      const src = "<foo></ foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "InvalidSpaces",
          range: pos(src, " ", { pre: "</" }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1TextNode("", {
            range: pos(src, "", { pre: "<foo>" }),
          }),
          {
            range: pos(src, "<foo></ foo>"),
          },
        ),
      );
    });

    it("reports an error on < + space + /", () => {
      const src = "<foo>< /foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "/",
          expected: ["number", "identifier"],
          range: pos(src, " /"),
        },
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["<"],
          range: [src.length, src.length],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1InvalidElementArgNode(undefined, { range: pos(src, "< /foo>") }),
          { range: pos(src, "<foo>< /foo>") },
        ),
      );
    });

    it("reports an error on tag name + / + space", () => {
      const src = "<foo/ >";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "InvalidSpaces",
          range: pos(src, " ", { pre: "/" }),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", undefined, { range: pos(src, "<foo/ >") }),
      );
    });

    it("reports an error on unmatched closing tag name", () => {
      const src = "<foo></bar>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "MismatchedTag",
          openTagName: "foo",
          closeTagName: "bar",
          range: pos(src, "</bar>"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1TextNode("", {
            range: pos(src, "", { pre: "<foo>" }),
          }),
          {
            range: pos(src, "<foo></bar>"),
          },
        ),
      );
    });

    it("reports an error on unopened closing tag in nested elements", () => {
      const src = "<foo><bar></foo></bar>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "MismatchedTag",
          openTagName: "bar",
          closeTagName: "foo",
          range: pos(src, "</foo>"),
        },
        {
          type: "MismatchedTag",
          openTagName: "foo",
          closeTagName: "bar",
          range: pos(src, "</bar>"),
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1ElementArgNode(
            "bar",
            MF1TextNode("", {
              range: pos(src, "", { pre: "<bar>" }),
            }),
            {
              range: pos(src, "<bar></foo>"),
            },
          ),
          { range: pos(src, "<foo><bar></foo></bar>") },
        ),
      );
    });

    it("reports an error on invalid parameter name (leading zero)", () => {
      const src = "<0123/>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: pos(src, "0123") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(123, undefined, {
          range: pos(src, "<0123/>"),
        }),
      );
    });

    it("reports an error on invalid parameter name (followed by alpha)", () => {
      const src = "<123foo />";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: pos(src, "123foo") },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(123, undefined, {
          range: pos(src, "<123foo />"),
        }),
      );
    });
  });
});

type PosOptions = {
  index?: number | undefined;
  pre?: string | undefined;
  post?: string | undefined;
};

const failRange: Range = [-1, -1];

function pos(src: string, needle: string, options: PosOptions = {}): Range {
  const { index = 0, pre = "", post = "" } = options;
  const fullNeedle = `${pre}${needle}${post}`;
  let start = 0;
  for (let i = 0; i < index; i++) {
    const found = src.indexOf(fullNeedle, start);
    if (found === -1) {
      return failRange;
    }
    // Not moving the position to the end of the found needle
    // so that we can match "ab(abab)ab" as in "abababab".
    start = found + 1;
  }
  const found = src.indexOf(fullNeedle, start);
  if (found === -1) {
    return failRange;
  }
  return [found + pre.length, found + fullNeedle.length - post.length];
}
