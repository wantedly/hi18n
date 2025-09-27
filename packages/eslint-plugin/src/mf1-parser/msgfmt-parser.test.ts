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
} from "./msgfmt.ts";
import type { Diagnostic } from "./diagnostics.ts";

describe("parseMF1Message", () => {
  describe("plain text parsing", () => {
    it("parses the empty message", () => {
      expect(parseMF1Message("")).toEqual<MF1Node>(
        MF1TextNode("", { range: [0, 0] }),
      );
    });

    it("parses unescaped ASCII texts", () => {
      expect(parseMF1Message("Hello, world!")).toEqual<MF1Node>(
        MF1TextNode("Hello, world!", { range: [0, 13] }),
      );
    });

    it("parses unescaped non-ASCII texts", () => {
      expect(parseMF1Message("こんにちは世界!")).toEqual<MF1Node>(
        MF1TextNode("こんにちは世界!", { range: [0, 8] }),
      );
    });

    it("parses unescaped ASCII texts with symbols", () => {
      expect(parseMF1Message("1 + 1 = 2")).toEqual<MF1Node>(
        MF1TextNode("1 + 1 = 2", { range: [0, 9] }),
      );
    });

    it("parses plain #", () => {
      expect(parseMF1Message("#")).toEqual<MF1Node>(
        MF1TextNode("#", { range: [0, 1] }),
      );
    });

    it("parses unescaped single quotes", () => {
      expect(
        parseMF1Message("I'm not a fond of this syntax."),
      ).toEqual<MF1Node>(
        MF1TextNode("I'm not a fond of this syntax.", { range: [0, 30] }),
      );
    });

    it("parses a pair of unescapes single quotes", () => {
      expect(parseMF1Message("a'b {name} c'd")).toEqual<MF1Node>(
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
      expect(
        parseMF1Message("I''m not a fond of this syntax."),
      ).toEqual<MF1Node>(
        MF1TextNode("I'm not a fond of this syntax.", { range: [0, 31] }),
      );
    });

    it("parses quoted texts starting with RBrace", () => {
      expect(parseMF1Message("'{foo}'")).toEqual<MF1Node>(
        MF1TextNode("{foo}", { range: [0, 7] }),
      );
    });

    it("parses quoted texts starting with various symbols", () => {
      expect(
        parseMF1Message("foo, '{bar}', '{}#|', '{a''b}', ''''"),
      ).toEqual<MF1Node>(
        MF1TextNode("foo, {bar}, {}#|, {a'b}, ''", { range: [0, 36] }),
      );
    });

    it("parses quoted texts starting with # or |", () => {
      // They are always quotable although conditional
      expect(parseMF1Message("'# {}' '| {}'")).toEqual<MF1Node>(
        MF1TextNode("# {} | {}", { range: [0, 13] }),
      );
    });

    it("parses quoted texts starting with <", () => {
      expect(parseMF1Message("'< {}'")).toEqual<MF1Node>(
        MF1TextNode("< {}", { range: [0, 6] }),
      );
    });

    it("reports an error on unclosed quoted texts", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("'{foo");
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "UnclosedQuotedString", range: [5, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1TextNode("{foo", { range: [0, 5] }));
    });
  });

  it("throws an error on unclosed quoted strings", () => {
    expect(() => parseMF1Message("'{foo}")).toThrow(/Unclosed quoted string/);
  });

  describe("tokenization", () => {
    it("skips spaces", () => {
      expect(parseMF1Message("{ foo }")).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: [0, 7] }),
      );
    });

    it("skips newlines", () => {
      expect(parseMF1Message("{\nfoo\n}")).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: [0, 7] }),
      );
    });

    it("reports errors on invalid controls", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{\x7Ffoo}");
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidCharacter", range: [1, 2] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode("foo", { range: [0, 6] }));
    });

    it("reports errors on invalid identifiers", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo🍺}");
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidIdentifier", range: [1, 6] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1StringArgNode("foo🍺", { range: [0, 7] }),
      );
    });

    it("reports errors on invalid numbers (leading zero)", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{0123}");
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode(123, { range: [0, 6] }));
    });
  });

  describe("string argument parsing", () => {
    it("parses simple string arguments", () => {
      expect(parseMF1Message("{foo}")).toEqual<MF1Node>(
        MF1StringArgNode("foo", { range: [0, 5] }),
      );
    });

    it("parses string arguments with texts and whitespaces (1)", () => {
      expect(parseMF1Message("foo { foo }")).toEqual<MF1Node>(
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
      expect(parseMF1Message("foo { foo } bar { bar }")).toEqual<MF1Node>(
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
      expect(parseMF1Message("{2}{ 0 }, {1}")).toEqual<MF1Node>(
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{$");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{123foo}");
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 7] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode(123, { range: [0, 8] }));
    });

    it("reports an error on invalid number (leading zero)", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{0123}");
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(MF1StringArgNode(123, { range: [0, 6] }));
    });

    it("reports an error on LBrace + ident + EOF", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo%");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo,}");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo,$}");
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
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{foo,integer}");
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
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{foo,number$}");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo,number");
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
      expect(parseMF1Message("{foo,number}")).toEqual<MF1Node>(
        MF1NumberArgNode("foo", {}, { range: [0, 12] }),
      );
    });

    it("parses number arguments with texts and whitespaces (1)", () => {
      expect(parseMF1Message("foo { foo , number }")).toEqual<MF1Node>(
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
      expect(
        parseMF1Message("foo { foo , date } bar { bar , time }"),
      ).toEqual<MF1Node>(
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{2,spellout}");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,spellout,integer}",
      );
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
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{ 0 , ordinal }");
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
      expect(parseMF1Message("{foo,number,integer}")).toEqual<MF1Node>(
        MF1NumberArgNode(
          "foo",
          { maximumFractionDigits: 0 },
          { range: [0, 20] },
        ),
      );
    });

    it("reports an error on currency style", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,number,currency}",
      );
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
      expect(parseMF1Message("{foo,number,percent}")).toEqual<MF1Node>(
        MF1NumberArgNode("foo", { style: "percent" }, { range: [0, 20] }),
      );
    });

    it("reports an error on unknown symbol style", () => {
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{foo,number,$}");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,number,foobar}",
      );
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
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{foo,number,full}");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,number,::currency/USD}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,number,integer$}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{1,duration}");
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
      expect(parseMF1Message("{foo,date}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "medium" }, { range: [0, 10] }),
      );
    });

    it("parses short date style", () => {
      expect(parseMF1Message("{foo,date,short}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "short" }, { range: [0, 16] }),
      );
    });

    it("parses medium date style", () => {
      expect(parseMF1Message("{foo,date,medium}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "medium" }, { range: [0, 17] }),
      );
    });

    it("parses long date style", () => {
      expect(parseMF1Message("{foo,date,long}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "long" }, { range: [0, 15] }),
      );
    });

    it("parses full date style", () => {
      expect(parseMF1Message("{foo,date,full}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { dateStyle: "full" }, { range: [0, 15] }),
      );
    });

    it("parses simple time arguments", () => {
      expect(parseMF1Message("{foo,time}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "medium" }, { range: [0, 10] }),
      );
    });

    it("parses short time style", () => {
      expect(parseMF1Message("{foo,time,short}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "short" }, { range: [0, 16] }),
      );
    });

    it("parses medium time style", () => {
      expect(parseMF1Message("{foo,time,medium}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "medium" }, { range: [0, 17] }),
      );
    });

    it("parses long time style", () => {
      expect(parseMF1Message("{foo,time,long}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "long" }, { range: [0, 15] }),
      );
    });

    it("parses full time style", () => {
      expect(parseMF1Message("{foo,time,full}")).toEqual<MF1Node>(
        MF1DateTimeArgNode("foo", { timeStyle: "full" }, { range: [0, 15] }),
      );
    });

    it("parses date skeleton style", () => {
      expect(parseMF1Message("{foo,date,::MMMMdjmm}")).toEqual<MF1Node>(
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
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{foo,date,integer}");
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

    it("throws an error on invalid date skeleton", () => {
      expect(() => parseMF1Message("{foo,date,::YYYYwwEEEE}")).toThrow(
        "Invalid date skeleton: YYYY",
      );
    });
  });

  it("throws an error on choiceArg", () => {
    expect(() => parseMF1Message("{foo,choice,0#zero|1#one}")).toThrow(
      /choice is not supported/,
    );
  });

  describe("plural branch parsing", () => {
    it("parses simple plural branches", () => {
      expect(
        parseMF1Message("{foo,plural,one{an apple}other{apples}}"),
      ).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(
              "one",
              MF1TextNode("an apple", { range: [16, 24] }),
            ),
          ],
          MF1TextNode("apples", { range: [31, 37] }),
          { range: [0, 39] },
        ),
      );
    });

    it("parses plural branches with spaces", () => {
      expect(
        parseMF1Message(
          " { foo , plural , one { an apple } other { apples } } ",
        ),
      ).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: [0, 1] }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1TextNode(" an apple ", { range: [23, 33] }),
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
      expect(
        parseMF1Message("{foo,plural,=1{bar}=2{barbar}other{barbarbar}}"),
      ).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(1, MF1TextNode("bar", { range: [15, 18] })),
            MF1PluralBranch(2, MF1TextNode("barbar", { range: [22, 28] })),
          ],
          MF1TextNode("barbarbar", { range: [35, 44] }),
          { range: [0, 46] },
        ),
      );
    });

    it("parses plural branches with exact matchers and spaces", () => {
      expect(
        parseMF1Message(
          " { foo , plural , =1 { bar } =2 { barbar } other { barbarbar } } ",
        ),
      ).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: [0, 1] }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(1, MF1TextNode(" bar ", { range: [22, 27] })),
                MF1PluralBranch(
                  2,
                  MF1TextNode(" barbar ", { range: [33, 41] }),
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
      expect(
        parseMF1Message("{foo,plural,offset:1 one{an apple}other{apples}}"),
      ).toEqual<MF1Node>(
        MF1PluralArgNode(
          "foo",
          [
            MF1PluralBranch(
              "one",
              MF1TextNode("an apple", { range: [25, 33] }),
            ),
          ],
          MF1TextNode("apples", { range: [40, 46] }),
          { subtract: 1, range: [0, 48] },
        ),
      );
    });

    it("parses plural branches with offset and spaces", () => {
      expect(
        parseMF1Message(
          " { foo , plural , offset:1 one { an apple } other { apples } } ",
        ),
      ).toEqual<MF1Node>(
        MF1ConcatNode(
          [
            MF1TextNode(" ", { range: [0, 1] }),
            MF1PluralArgNode(
              "foo",
              [
                MF1PluralBranch(
                  "one",
                  MF1TextNode(" an apple ", { range: [32, 42] }),
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
      expect(
        parseMF1Message("{foo,plural,one{# apple}other{# apples}}"),
      ).toEqual<MF1Node>(
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
      expect(
        parseMF1Message(
          " { foo , plural , one { # apple } other { # apples } } ",
        ),
      ).toEqual<MF1Node>(
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo,plural");
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
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{foo,plural%}");
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("{foo,plural}");
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
      const [msg, diagnostics] =
        parseMF1MessageWithDiagnostics("{foo,plural,$}");
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

    it("throws an error on plural + comma + RBrace", () => {
      expect(() => parseMF1Message("{foo,plural,}")).toThrow("No branch found");
    });

    it("reports an error on = + identifier", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,=foo{}other{}}",
      );
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

    it("throws an error on = + spaces + number", () => {
      expect(() => parseMF1Message("{foo,plural,= 42{}other{}}")).toThrow(
        "No space allowed here",
      );
    });

    it("reports an error on identifier + identifier", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,one other{}}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,=42 other{}}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,one?{}other{}}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,42{}other{}}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,one{},other{}}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,one{}other{",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,one{}other{'}}",
      );
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "UnclosedQuotedString", range: [26, 26] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1InvalidArgNode("foo", { range: [0, 26] }),
      );
    });

    it("reports an error on an extra comma at the end of the branches", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,one{}other{},}",
      );
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
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics(
        "{foo,plural,one{}other}",
      );
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

    it("throws an error on missing catch-all branch", () => {
      expect(() => parseMF1Message("{foo,plural,one{}}")).toThrow(
        /Last selector should be other/,
      );
    });
  });

  describe("element parsing", () => {
    it("parses simple number-parameterized elements", () => {
      expect(parseMF1Message("Click <0>here</0>!")).toEqual<MF1Node>(
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
      expect(parseMF1Message("Click <0 > here </0 > !")).toEqual<MF1Node>(
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
      expect(parseMF1Message("<foo><3></3></foo>")).toEqual<MF1Node>(
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
      expect(parseMF1Message("<foo/> and <bar />")).toEqual<MF1Node>(
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

    it("throws an error on < + unknown symbol", () => {
      expect(() => parseMF1Message("<$foo></foo>")).toThrow(
        "Unexpected token $ (expected number, identifier)",
      );
    });

    it("throws an error on tag name + unknown symbol", () => {
      expect(() => parseMF1Message("<foo$></foo>")).toThrow(
        "Unexpected token $ (expected /, >)",
      );
    });

    it("throws an error on </ + unknown symbol", () => {
      expect(() => parseMF1Message("<foo></$foo>")).toThrow(
        "Unexpected token $ (expected number, identifier)",
      );
    });

    it("throws an error on </ + tag name + unknown symbol", () => {
      expect(() => parseMF1Message("<foo></foo$>")).toThrow(
        "Unexpected token $ (expected >)",
      );
    });

    it("throws an error on tag name + / + unknown symbol", () => {
      expect(() => parseMF1Message("<foo/$>")).toThrow(
        "Unexpected token $ (expected >)",
      );
    });

    it("throws an error on unclosed tag", () => {
      expect(() => parseMF1Message("<foo>")).toThrow(
        "Unexpected token EOF (expected <)",
      );
    });

    it("throws an error on unopened closing tag", () => {
      expect(() => parseMF1Message("</foo>")).toThrow("Found an unmatching <");
    });

    it("throws an error on < + space", () => {
      expect(() => parseMF1Message("< foo></foo>")).toThrow(
        "No space allowed here",
      );
    });

    it("throws an error on </ + space", () => {
      expect(() => parseMF1Message("<foo></ foo>")).toThrow(
        "No space allowed here",
      );
    });

    it("throws an error on < + space + /", () => {
      expect(() => parseMF1Message("<foo>< /foo>")).toThrow(
        "Unexpected token / (expected number, identifier)",
      );
    });

    it("throws an error on tag name + / + space", () => {
      expect(() => parseMF1Message("<foo/ >")).toThrow("No space allowed here");
    });

    it("throws an error on unmatched closing tag name", () => {
      expect(() => parseMF1Message("<foo></bar>")).toThrow(
        "Tag foo closed with a different name: bar",
      );
    });

    it("throws an error on unopened closing tag in nested elements", () => {
      expect(() => parseMF1Message("<foo><bar></foo></bar>")).toThrow(
        "Tag bar closed with a different name: foo",
      );
    });

    it("reports an error on invalid parameter name (leading zero)", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("<0123/>");
      expect(diagnostics).toEqual<readonly Diagnostic[]>([
        { type: "InvalidNumber", range: [1, 5] },
      ]);
      expect(msg).toEqual<MF1Node>(
        MF1ElementArgNode(123, undefined, {
          range: [0, 7],
        }),
      );
    });

    it("throws an error on invalid parameter name (followed by alpha)", () => {
      const [msg, diagnostics] = parseMF1MessageWithDiagnostics("<123foo />");
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
