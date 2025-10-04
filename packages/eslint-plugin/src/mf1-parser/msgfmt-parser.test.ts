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
} from "./msgfmt.ts";
import type { Diagnostic } from "./diagnostics.ts";

describe("parseMF1Message", () => {
  describe("plain text parsing", () => {
    it("parses the empty message", () => {
      const src = "";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("", { range: [0, 0] }),
      );
    });

    it("parses unescaped ASCII texts", () => {
      const src = "Hello, world!";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("Hello, world!", { range: [0, 13] }),
      );
    });

    it("parses unescaped non-ASCII texts", () => {
      const src = "こんにちは世界!";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("こんにちは世界!", { range: [0, 8] }),
      );
    });

    it("parses unescaped ASCII texts with symbols", () => {
      const src = "1 + 1 = 2";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("1 + 1 = 2", { range: [0, 9] }),
      );
    });

    it("parses plain #", () => {
      const src = "#";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("#", { range: [0, 1] }),
      );
    });

    it("parses unescaped single quotes", () => {
      const src = "I'm not a fond of this syntax.";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("I'm not a fond of this syntax.", { range: [0, 30] }),
      );
    });

    it("parses a pair of unescaped single quotes", () => {
      const src = "a'b {name} c'd";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("a'b ", { range: [0, 4] }),
            MF1StringArgNode("name", { range: [4, 10] }),
            MF1TextNode(" c'd", { range: [10, 14] }),
          ],
          { range: [0, 14] },
        ),
      );
    });

    it("parses escaped single quotes", () => {
      const src = "I''m not a fond of this syntax.";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("I'm not a fond of this syntax.", { range: [0, 31] }),
      );
    });

    it("parses quoted texts starting with RBrace", () => {
      const src = "'{foo}'";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("{foo}", { range: [0, 7] }),
      );
    });

    it("parses quoted texts starting with various symbols", () => {
      const src = "foo, '{bar}', '{}#|', '{a''b}', ''''";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("foo, {bar}, {}#|, {a'b}, ''", { range: [0, 36] }),
      );
    });

    it("parses quoted texts starting with # or |", () => {
      // They are always quotable although conditional
      const src = "'# {}' '| {}'";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("# {} | {}", { range: [0, 13] }),
      );
    });

    it("parses quoted texts starting with <", () => {
      const src = "'< {}'";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1TextNode("< {}", { range: [0, 6] }),
      );
    });

    it("reports an error on unclosed quoted texts", () => {
      const src = "'{foo";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "UnclosedQuotedString", range: [5, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1TextNode("{foo", { range: [0, 5] }));
    });
  });

  it("reports an error on unclosed quoted strings", () => {
    const src = "'{foo";
    const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
    expect(diagnostics).toEqual<readonly Diagnostic[]>([
      { type: "UnclosedQuotedString", range: [5, 5] },
    ]);
    expect(msg).toEqual<MF1Node>(MF1TextNode("{foo", { range: [0, 5] }));
  });

  describe("tokenization", () => {
    it("skips spaces", () => {
      const src = "{ foo }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: [0, 7] }),
      );
    });

    it("skips newlines", () => {
      const src = "{\nfoo\n}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: [0, 7] }),
      );
    });

    it("reports errors on invalid controls", () => {
      const src = "{\x7Ffoo}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidCharacter", range: [1, 2] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode("foo", { range: [0, 6] }));
    });

    it("reports errors on invalid identifiers", () => {
      const src = "{foo🍺}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidIdentifier", range: [1, 6] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1StringArgNode("foo🍺", { range: [0, 7] }),
      );
    });

    it("reports errors on invalid numbers (leading zero)", () => {
      const src = "{0123}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode(123, { range: [0, 6] }));
    });
  });

  describe("string argument parsing", () => {
    it("parses simple string arguments", () => {
      const src = "{foo}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: [0, 5] }),
      );
    });

    it("parses string arguments with texts and whitespaces (1)", () => {
      const src = "foo { foo }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: [0, 4] }),
            MF1StringArgNode("foo", { range: [4, 11] }),
          ],
          { range: [0, 11] },
        ),
      );
    });

    it("parses string arguments with texts and whitespaces (2)", () => {
      const src = "foo { foo } bar { bar }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: [0, 4] }),
            MF1StringArgNode("foo", { range: [4, 11] }),
            MF1TextNode(" bar ", { range: [11, 16] }),
            MF1StringArgNode("bar", { range: [16, 23] }),
          ],
          { range: [0, 23] },
        ),
      );
    });

    it("parses string arguments with numbered parameter names", () => {
      const src = "{2}{ 0 }, {1}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1StringArgNode(2, { range: [0, 3] }),
            MF1StringArgNode(0, { range: [3, 8] }),
            MF1TextNode(", ", { range: [8, 10] }),
            MF1StringArgNode(1, { range: [10, 13] }),
          ],
          { range: [0, 13] },
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
          range: [1, 1],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode(undefined, { range: [0, 1] }),
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
          range: [1, 2],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode(undefined, { range: [0, 2] }),
      );
    });

    it("reports an error on invalid number (followed by alpha)", () => {
      const src = "{123foo}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 7] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode(123, { range: [0, 8] }));
    });

    it("reports an error on invalid number (leading zero)", () => {
      const src = "{0123}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode(123, { range: [0, 6] }));
    });

    it("reports an error on LBrace + ident + EOF", () => {
      const src = "{foo";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["}", ","],
          range: [4, 4],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1InvalidArgNode("foo", { range: [0, 4] }));
    });

    it("reports an error on LBrace + ident + unknown symbol", () => {
      const src = "{foo%";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "%",
          expected: ["}", ","],
          range: [4, 5],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1InvalidArgNode("foo", { range: [0, 5] }));
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
          range: [5, 6],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1InvalidArgNode("foo", { range: [0, 6] }));
    });

    it("reports an error on LBrace + ident + comma + unknown symbol", () => {
      const src = "{foo,$}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedToken",
          tokenDesc: "$",
          expected: ["identifier"],
          range: [5, 6],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1InvalidArgNode("foo", { range: [0, 7] }));
    });

    it("reports an error on unknown argType", () => {
      const src = "{foo,integer}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgType",
          argType: "integer",
          expected: ["number", "date", "time"],
          range: [5, 12],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 13] }),
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
          range: [11, 12],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 13] }),
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
          range: [11, 11],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 11] }),
      );
    });
  });

  describe("number argument parsing", () => {
    it("parses simple number arguments", () => {
      const src = "{foo,number}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1NumberArgNode("foo", {}, { range: [0, 12] }),
      );
    });

    it("parses number arguments with texts and whitespaces (1)", () => {
      const src = "foo { foo , number }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: [0, 4] }),
            MF1NumberArgNode("foo", {}, { range: [4, 20] }),
          ],
          { range: [0, 20] },
        ),
      );
    });

    it("parses number arguments with texts and whitespaces (2)", () => {
      const src = "foo { foo , date } bar { bar , time }";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("foo ", { range: [0, 4] }),
            MF1DateTimeArgNode(
              "foo",
              { dateStyle: "medium" },
              { range: [4, 18] },
            ),
            MF1TextNode(" bar ", { range: [18, 23] }),
            MF1DateTimeArgNode(
              "bar",
              { timeStyle: "medium" },
              { range: [23, 37] },
            ),
          ],
          { range: [0, 37] },
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
          range: [3, 11],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1InvalidArgNode(2, { range: [0, 12] }));
    });

    it("reports an error on spellout argType (2)", () => {
      const src = "{foo,spellout,integer}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "UnexpectedArgType",
          argType: "spellout",
          expected: ["number", "date", "time"],
          range: [5, 13],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 22] }),
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
          range: [6, 13],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1InvalidArgNode(0, { range: [0, 15] }));
    });

    it("parses integer style", () => {
      const src = "{foo,number,integer}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1NumberArgNode(
          "foo",
          { maximumFractionDigits: 0 },
          { range: [0, 20] },
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
          range: [12, 20],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 21] }),
      );
    });

    it("parses percent style", () => {
      const src = "{foo,number,percent}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1NumberArgNode("foo", { style: "percent" }, { range: [0, 20] }),
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
          range: [12, 13],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 14] }),
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
          range: [12, 18],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 19] }),
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
          range: [12, 16],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 17] }),
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
          range: [12, 14],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 27] }),
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
          range: [19, 20],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 21] }),
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
          range: [3, 11],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1InvalidArgNode(1, { range: [0, 12] }));
    });
  });

  describe("date/time argument parsing", () => {
    it("parses simple date arguments", () => {
      const src = "{foo,date}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "medium" }, { range: [0, 10] }),
      );
    });

    it("parses short date style", () => {
      const src = "{foo,date,short}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "short" }, { range: [0, 16] }),
      );
    });

    it("parses medium date style", () => {
      const src = "{foo,date,medium}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "medium" }, { range: [0, 17] }),
      );
    });

    it("parses long date style", () => {
      const src = "{foo,date,long}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "long" }, { range: [0, 15] }),
      );
    });

    it("parses full date style", () => {
      const src = "{foo,date,full}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "full" }, { range: [0, 15] }),
      );
    });

    it("parses simple time arguments", () => {
      const src = "{foo,time}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "medium" }, { range: [0, 10] }),
      );
    });

    it("parses short time style", () => {
      const src = "{foo,time,short}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "short" }, { range: [0, 16] }),
      );
    });

    it("parses medium time style", () => {
      const src = "{foo,time,medium}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "medium" }, { range: [0, 17] }),
      );
    });

    it("parses long time style", () => {
      const src = "{foo,time,long}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "long" }, { range: [0, 15] }),
      );
    });

    it("parses full time style", () => {
      const src = "{foo,time,full}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "full" }, { range: [0, 15] }),
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
          { range: [0, 21] },
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
          range: [10, 17],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 18] }),
      );
    });

    it("reports an error on invalid date skeleton (1)", () => {
      const src = "{foo,date,::YYYYwwEEEE}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "InvalidDateSkeleton",
          component: "YYYY",
          range: [12, 22],
        },
        { type: "InvalidDateSkeleton", component: "ww", range: [12, 22] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1DateTimeArgNode(
          "foo",
          {
            weekday: "long",
          },
          { range: [0, 23] },
        ),
      );
    });

    it("reports an error on invalid date skeleton (2)", () => {
      const src = "{foo,date,::G}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InsufficientFieldsInDateSkeleton", range: [12, 13] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { era: "short" }, { range: [0, 14] }),
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
        range: [5, 11],
      },
    ]);
    expect(msg).toEqual<MF1Node>(MF1InvalidArgNode("foo", { range: [0, 25] }));
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
              MF1TextNode("an apple", { range: [16, 24] }),
              { range: [12, 25] },
            ),
          ],
          MF1TextNode("apples", { range: [31, 37] }),
          { range: [0, 39] },
        ),
      );
    });

    it("parses plural branches with spaces", () => {
      const src = " { foo , plural , one { an apple } other { apples } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: [0, 1] }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1TextNode(" an apple ", { range: [23, 33] }),
                  { range: [18, 34] },
                ),
              ],
              MF1TextNode(" apples ", { range: [42, 50] }),
              { range: [1, 53] },
            ),
            MF1TextNode(" ", { range: [53, 54] }),
          ],
          { range: [0, 54] },
        ),
      );
    });

    it("parses plural branches with exact matchers", () => {
      const src = "{foo,plural,=1{bar}=2{barbar}other{barbarbar}}";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(1, MF1TextNode("bar", { range: [15, 18] }), {
              range: [12, 19],
            }),
            MF1PluralBranch(2, MF1TextNode("barbar", { range: [22, 28] }), {
              range: [19, 29],
            }),
          ],
          MF1TextNode("barbarbar", { range: [35, 44] }),
          { range: [0, 46] },
        ),
      );
    });

    it("parses plural branches with exact matchers and spaces", () => {
      const src =
        " { foo , plural , =1 { bar } =2 { barbar } other { barbarbar } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: [0, 1] }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(1, MF1TextNode(" bar ", { range: [22, 27] }), {
                  range: [18, 28],
                }),
                MF1PluralBranch(
                  2,
                  MF1TextNode(" barbar ", { range: [33, 41] }),
                  { range: [29, 42] },
                ),
              ],
              MF1TextNode(" barbarbar ", { range: [50, 61] }),
              { range: [1, 64] },
            ),
            MF1TextNode(" ", { range: [64, 65] }),
          ],
          { range: [0, 65] },
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
              MF1TextNode("an apple", { range: [25, 33] }),
              { range: [21, 34] },
            ),
          ],
          MF1TextNode("apples", { range: [40, 46] }),
          { subtract: 1, range: [0, 48] },
        ),
      );
    });

    it("parses plural branches with offset and spaces", () => {
      const src =
        " { foo , plural , offset:1 one { an apple } other { apples } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: [0, 1] }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1TextNode(" an apple ", { range: [32, 42] }),
                  { range: [27, 43] },
                ),
              ],
              MF1TextNode(" apples ", { range: [51, 59] }),
              { subtract: 1, range: [1, 62] },
            ),
            MF1TextNode(" ", { range: [62, 63] }),
          ],
          { range: [0, 63] },
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
                  MF1NumberArgNode("foo", {}, { range: [16, 17] }),
                  MF1TextNode(" apple", { range: [17, 23] }),
                ],
                { range: [16, 23] },
              ),
              { range: [12, 24] },
            ),
          ],
          MF1ConcatNode(
            [
              MF1NumberArgNode("foo", {}, { range: [30, 31] }),
              MF1TextNode(" apples", { range: [31, 38] }),
            ],
            { range: [30, 38] },
          ),
          { subtract: 0, range: [0, 40] },
        ),
      );
    });

    it("parses plural branches with # and spaces", () => {
      const src = " { foo , plural , one { # apple } other { # apples } } ";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: [0, 1] }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1ConcatNode(
                    [
                      MF1TextNode(" ", { range: [23, 24] }),
                      MF1NumberArgNode("foo", {}, { range: [24, 25] }),
                      MF1TextNode(" apple ", { range: [25, 32] }),
                    ],
                    { range: [23, 32] },
                  ),
                  { range: [18, 33] },
                ),
              ],
              MF1ConcatNode(
                [
                  MF1TextNode(" ", { range: [41, 42] }),
                  MF1NumberArgNode("foo", {}, { range: [42, 43] }),
                  MF1TextNode(" apples ", { range: [43, 51] }),
                ],
                { range: [41, 51] },
              ),
              { subtract: 0, range: [1, 54] },
            ),
            MF1TextNode(" ", { range: [54, 55] }),
          ],
          { range: [0, 55] },
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
          range: [11, 11],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 11] }),
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
          range: [11, 12],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 13] }),
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
          range: [11, 12],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 12] }),
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
          range: [12, 13],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 14] }),
      );
    });

    it("reports an error on plural + comma + RBrace", () => {
      const src = "{foo,plural,}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "PluralLastSelector",
          range: [0, 13],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidPluralArgNode("foo", { range: [0, 13] }),
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
          range: [13, 16],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 26] }),
      );
    });

    it("reports an error on = + spaces + number", () => {
      const src = "{foo,plural,= 42{}other{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "InvalidSpaces",
          range: [13, 14],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(42, MF1TextNode("", { range: [17, 17] }), {
              range: [12, 18],
            }),
          ],
          MF1TextNode("", { range: [24, 24] }),
          { range: [0, 26] },
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
          range: [15, 21],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 24] }),
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
          range: [15, 21],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 24] }),
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
          range: [15, 16],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 26] }),
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
          range: [12, 14],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 24] }),
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
          range: [17, 18],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 26] }),
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
          range: [23, 23],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 23] }),
      );
    });

    it("reports an error on an unterminated branch (2)", () => {
      const src = "{foo,plural,one{}other{'}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "UnclosedQuotedString", range: [26, 26] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 26] }),
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
          range: [24, 25],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 26] }),
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
          range: [22, 23],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 23] }),
      );
    });

    it("reports an error on missing catch-all branch", () => {
      const src = "{foo,plural,one{}}";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        {
          type: "PluralLastSelector",
          range: [12, 17],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidPluralArgNode("foo", { range: [0, 18] }),
      );
    });
  });

  describe("element parsing", () => {
    it("parses simple number-parameterized elements", () => {
      const src = "Click <0>here</0>!";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("Click ", { range: [0, 6] }),
            MF1ElementArgNode(0, MF1TextNode("here", { range: [9, 13] }), {
              range: [6, 17],
            }),
            MF1TextNode("!", { range: [17, 18] }),
          ],
          { range: [0, 18] },
        ),
      );
    });

    it("parses elements with spaces", () => {
      const src = "Click <0 > here </0 > !";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode("Click ", { range: [0, 6] }),
            MF1ElementArgNode(0, MF1TextNode(" here ", { range: [10, 16] }), {
              range: [6, 21],
            }),
            MF1TextNode(" !", { range: [21, 23] }),
          ],
          { range: [0, 23] },
        ),
      );
    });

    it("parses nested elements with both identifier and number parameters", () => {
      const src = "<foo><3></3></foo>";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1ElementArgNode(3, MF1TextNode("", { range: [8, 8] }), {
            range: [5, 12],
          }),
          { range: [0, 18] },
        ),
      );
    });

    it("parses self-closing elements", () => {
      const src = "<foo/> and <bar />";
      expect(parseMF1Message(src)).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1ElementArgNode("foo", undefined, { range: [0, 6] }),
            MF1TextNode(" and ", { range: [6, 11] }),
            MF1ElementArgNode("bar", undefined, { range: [11, 18] }),
          ],
          { range: [0, 18] },
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
          range: [1, 2],
        },
        {
          type: "UnexpectedToken",
          tokenDesc: "</",
          expected: ["EOF"],
          range: [6, 8],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1InvalidElementArgNode(undefined, { range: [0, 6] }),
            MF1TextNode("</foo>", { range: [6, 12] }),
          ],
          { range: [0, 12] },
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
          range: [4, 5],
        },
        {
          type: "UnexpectedToken",
          tokenDesc: "</",
          expected: ["EOF"],
          range: [6, 8],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1InvalidElementArgNode(undefined, { range: [0, 6] }),
            MF1TextNode("</foo>", { range: [6, 12] }),
          ],
          { range: [0, 12] },
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
          range: [7, 8],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", MF1TextNode("", { range: [5, 5] }), {
          range: [0, 12],
        }),
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
          range: [10, 11],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", MF1TextNode("", { range: [5, 5] }), {
          range: [0, 12],
        }),
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
          range: [5, 6],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidElementArgNode(undefined, { range: [0, 7] }),
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
          range: [5, 5],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", MF1TextNode("", { range: [5, 5] }), {
          range: [0, 5],
        }),
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
          range: [0, 2],
        },
      ]);
      expect(msg).toEqual<MF1Node>(MF1TextNode("</foo>", { range: [0, 6] }));
    });

    it("reports an error on < + space", () => {
      const src = "< foo></foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidSpaces", range: [1, 2] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", MF1TextNode("", { range: [6, 6] }), {
          range: [0, 12],
        }),
      );
    });

    it("reports an error on </ + space", () => {
      const src = "<foo></ foo>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidSpaces", range: [7, 8] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", MF1TextNode("", { range: [5, 5] }), {
          range: [0, 12],
        }),
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
          range: [6, 8],
        },
        {
          type: "UnexpectedToken",
          tokenDesc: "EOF",
          expected: ["<"],
          range: [12, 12],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1InvalidElementArgNode(undefined, { range: [5, 12] }),
          { range: [0, 12] },
        ),
      );
    });

    it("reports an error on tag name + / + space", () => {
      const src = "<foo/ >";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidSpaces", range: [5, 6] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", undefined, { range: [0, 7] }),
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
          range: [5, 11],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode("foo", MF1TextNode("", { range: [5, 5] }), {
          range: [0, 11],
        }),
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
          range: [10, 16],
        },
        {
          type: "MismatchedTag",
          openTagName: "foo",
          closeTagName: "bar",
          range: [16, 22],
        },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(
          "foo",
          MF1ElementArgNode("bar", MF1TextNode("", { range: [10, 10] }), {
            range: [5, 16],
          }),
          { range: [0, 22] },
        ),
      );
    });

    it("reports an error on invalid parameter name (leading zero)", () => {
      const src = "<0123/>";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(123, undefined, {
          range: [0, 7],
        }),
      );
    });

    it("reports an error on invalid parameter name (followed by alpha)", () => {
      const src = "<123foo />";
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(src);
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 7] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(123, undefined, {
          range: [0, 10],
        }),
      );
    });
  });
});
