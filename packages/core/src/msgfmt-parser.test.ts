import { describe, expect, it } from "vitest";
import { parseMessage } from "./msgfmt-parser.ts";
import {
  DateTimeArg,
  NumberArg,
  PluralArg,
  StringArg,
  type CompiledMessage,
} from "./msgfmt.ts";

describe("parseMessage", () => {
  it("parses plain texts", () => {
    expect(parseMessage("")).toEqual<CompiledMessage>("");
    expect(parseMessage("Hello, world!")).toEqual<CompiledMessage>(
      "Hello, world!",
    );
    expect(parseMessage("こんにちは世界!")).toEqual<CompiledMessage>(
      "こんにちは世界!",
    );
    expect(parseMessage("1 + 1 = 2")).toEqual<CompiledMessage>("1 + 1 = 2");
    expect(parseMessage("#")).toEqual<CompiledMessage>("#");
  });

  it("parses texts with single quotes", () => {
    expect(
      parseMessage("I'm not a fond of this syntax."),
    ).toEqual<CompiledMessage>("I'm not a fond of this syntax.");
    expect(parseMessage("a'b {name} c'd")).toEqual<CompiledMessage>([
      "a'b ",
      StringArg("name"),
      " c'd",
    ]);
  });

  it("parses texts with double quotes", () => {
    expect(
      parseMessage("I''m not a fond of this syntax."),
    ).toEqual<CompiledMessage>("I'm not a fond of this syntax.");
  });

  it("parses quoted texts", () => {
    expect(parseMessage("'{foo}'")).toEqual<CompiledMessage>("{foo}");
    expect(
      parseMessage("foo, '{bar}', '{}#|', '{a''b}', ''''"),
    ).toEqual<CompiledMessage>("foo, {bar}, {}#|, {a'b}, ''");
    // They are always quotable although conditional
    expect(parseMessage("'# {}' '| {}'")).toEqual<CompiledMessage>("# {} | {}");
    expect(parseMessage("'< {}'")).toEqual<CompiledMessage>("< {}");
  });

  it("errors on unclosed quoted strings", () => {
    expect(() => parseMessage("'{foo}")).toThrow(/Unclosed quoted string/);
  });

  it("parses noneArg", () => {
    expect(parseMessage("{foo}")).toEqual<CompiledMessage>(StringArg("foo"));
    expect(parseMessage("foo { foo }")).toEqual<CompiledMessage>([
      "foo ",
      StringArg("foo"),
    ]);
    expect(parseMessage("foo { foo } bar { bar }")).toEqual<CompiledMessage>([
      "foo ",
      StringArg("foo"),
      " bar ",
      StringArg("bar"),
    ]);
    expect(parseMessage("{2}{ 0 }, {1}")).toEqual<CompiledMessage>([
      StringArg(2),
      StringArg(0),
      ", ",
      StringArg(1),
    ]);
  });

  it("parses simpleArg", () => {
    expect(parseMessage("{foo,number}")).toEqual<CompiledMessage>(
      NumberArg("foo", {}),
    );
    expect(parseMessage("foo { foo , number }")).toEqual<CompiledMessage>([
      "foo ",
      NumberArg("foo", {}),
    ]);
    expect(
      parseMessage("foo { foo , date } bar { bar , time }"),
    ).toEqual<CompiledMessage>([
      "foo ",
      DateTimeArg("foo", { dateStyle: "medium" }),
      " bar ",
      DateTimeArg("bar", { timeStyle: "medium" }),
    ]);
    expect(() => parseMessage("{2,spellout}")).toThrow(
      "Invalid argType: spellout",
    );
    expect(() => parseMessage("{ 0 , ordinal }")).toThrow(
      "Invalid argType: ordinal",
    );
    expect(() => parseMessage("{1,duration}")).toThrow(
      "Invalid argType: duration",
    );
  });

  it("errors on invalid noneArg", () => {
    expect(() => parseMessage("{")).toThrow(
      "Unexpected token EOF (expected number, identifier)",
    );
    expect(() => parseMessage("{$")).toThrow(
      "Unexpected token $ (expected number, identifier)",
    );
    expect(() => parseMessage("{123foo}")).toThrow("Invalid number: 123foo");
    expect(() => parseMessage("{0123}")).toThrow("Invalid number: 0123");
    expect(() => parseMessage("{foo")).toThrow(
      "Unexpected token EOF (expected }, ,)",
    );
    expect(() => parseMessage("{foo%")).toThrow(
      "Unexpected token % (expected }, ,)",
    );
  });

  it("errors on invalid argType", () => {
    expect(() => parseMessage("{foo,}")).toThrow(
      "Unexpected token } (expected identifier)",
    );
    expect(() => parseMessage("{foo,$}")).toThrow(
      "Unexpected token $ (expected identifier)",
    );
    expect(() => parseMessage("{foo,integer}")).toThrow(
      /Invalid argType: integer/,
    );
    expect(() => parseMessage("{foo,number$}")).toThrow(
      "Unexpected token $ (expected }, ,)",
    );
    expect(() => parseMessage("{foo,number")).toThrow(
      "Unexpected token EOF (expected }, ,)",
    );
  });

  it("parses styles in simpleArg", () => {
    expect(parseMessage("{foo,number,integer}")).toEqual<CompiledMessage>(
      NumberArg("foo", { maximumFractionDigits: 0 }),
    );
    expect(() => parseMessage("{foo,number,currency}")).toThrow(
      "Invalid argStyle for number: currency",
    );
    expect(parseMessage("{foo,number,percent}")).toEqual<CompiledMessage>(
      NumberArg("foo", { style: "percent" }),
    );
    expect(parseMessage("{foo,date,short}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { dateStyle: "short" }),
    );
    expect(parseMessage("{foo,date,medium}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { dateStyle: "medium" }),
    );
    expect(parseMessage("{foo,date,long}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { dateStyle: "long" }),
    );
    expect(parseMessage("{foo,date,full}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { dateStyle: "full" }),
    );
    expect(parseMessage("{foo,date,::MMMMdjmm}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", {
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        month: "long",
      }),
    );
    expect(parseMessage("{foo,time,short}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { timeStyle: "short" }),
    );
    expect(parseMessage("{foo,time,medium}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { timeStyle: "medium" }),
    );
    expect(parseMessage("{foo,time,long}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { timeStyle: "long" }),
    );
    expect(parseMessage("{foo,time,full}")).toEqual<CompiledMessage>(
      DateTimeArg("foo", { timeStyle: "full" }),
    );
  });

  it("errors on invalid styles", () => {
    expect(() => parseMessage("{foo,number,$}")).toThrow(
      "Unexpected token $ (expected identifier, ::)",
    );
    expect(() => parseMessage("{foo,number,foobar}")).toThrow(
      "Invalid argStyle for number: foobar",
    );
    expect(() => parseMessage("{foo,number,integer$}")).toThrow(
      "Unexpected token $ (expected })",
    );
    expect(() => parseMessage("{foo,date,integer}")).toThrow(
      "Invalid argStyle for date: integer",
    );
    expect(() => parseMessage("{foo,number,full}")).toThrow(
      "Invalid argStyle for number: full",
    );
    expect(() => parseMessage("{foo,spellout,integer}")).toThrow(
      "Invalid argType: spellout",
    );
    expect(() => parseMessage("{foo,date,::YYYYwwEEEE}")).toThrow(
      "Invalid date skeleton: YYYY",
    );
  });

  it("errors on choiceArg", () => {
    expect(() => parseMessage("{foo,choice,0#zero|1#one}")).toThrow(
      /choice is not supported/,
    );
  });

  it("parses pluralArg", () => {
    expect(
      parseMessage("{foo,plural,one{an apple}other{apples}}"),
    ).toEqual<CompiledMessage>(
      PluralArg(
        "foo",
        [
          {
            selector: "one",
            message: "an apple",
          },
        ],
        "apples",
      ),
    );
    expect(
      parseMessage(" { foo , plural , one { an apple } other { apples } } "),
    ).toEqual<CompiledMessage>([
      " ",
      PluralArg(
        "foo",
        [
          {
            selector: "one",
            message: " an apple ",
          },
        ],
        " apples ",
      ),
      " ",
    ]);
    expect(
      parseMessage("{foo,plural,=1{bar}=2{barbar}other{barbarbar}}"),
    ).toEqual<CompiledMessage>(
      PluralArg(
        "foo",
        [
          {
            selector: 1,
            message: "bar",
          },
          {
            selector: 2,
            message: "barbar",
          },
        ],
        "barbarbar",
      ),
    );
    expect(
      parseMessage(
        " { foo , plural , =1 { bar } =2 { barbar } other { barbarbar } } ",
      ),
    ).toEqual<CompiledMessage>([
      " ",
      PluralArg(
        "foo",
        [
          {
            selector: 1,
            message: " bar ",
          },
          {
            selector: 2,
            message: " barbar ",
          },
        ],
        " barbarbar ",
      ),
      " ",
    ]);
    expect(
      parseMessage("{foo,plural,offset:1 one{an apple}other{apples}}"),
    ).toEqual<CompiledMessage>(
      PluralArg(
        "foo",
        [
          {
            selector: "one",
            message: "an apple",
          },
        ],
        "apples",
        { subtract: 1 },
      ),
    );
    expect(
      parseMessage(
        " { foo , plural , offset:1 one { an apple } other { apples } } ",
      ),
    ).toEqual<CompiledMessage>([
      " ",
      PluralArg(
        "foo",
        [
          {
            selector: "one",
            message: " an apple ",
          },
        ],
        " apples ",
        { subtract: 1 },
      ),
      " ",
    ]);
    expect(
      parseMessage("{foo,plural,one{# apple}other{# apples}}"),
    ).toEqual<CompiledMessage>(
      PluralArg(
        "foo",
        [
          {
            selector: "one",
            message: [NumberArg("foo", {}), " apple"],
          },
        ],
        [NumberArg("foo", {}), " apples"],
        { subtract: 0 },
      ),
    );
    expect(
      parseMessage(" { foo , plural , one { # apple } other { # apples } } "),
    ).toEqual<CompiledMessage>([
      " ",
      PluralArg(
        "foo",
        [
          {
            selector: "one",
            message: [" ", NumberArg("foo", {}), " apple "],
          },
        ],
        [" ", NumberArg("foo", {}), " apples "],
        { subtract: 0 },
      ),
      " ",
    ]);
  });

  it("errors on invalid pluralArg", () => {
    expect(() => parseMessage("{foo,plural")).toThrow(
      "Unexpected token EOF (expected ,)",
    );
    expect(() => parseMessage("{foo,plural%")).toThrow(
      "Unexpected token % (expected ,)",
    );
    expect(() => parseMessage("{foo,plural}")).toThrow(
      "Unexpected token } (expected ,)",
    );
    expect(() => parseMessage("{foo,plural,$}")).toThrow(
      "Unexpected token $ (expected offset:, identifier, =, })",
    );
    expect(() => parseMessage("{foo,plural,}")).toThrow("No branch found");
    expect(() => parseMessage("{foo,plural,=foo{}other{}}")).toThrow(
      "Unexpected token identifier (expected number)",
    );
    expect(() => parseMessage("{foo,plural,= 42{}other{}}")).toThrow(
      "No space allowed here",
    );
    expect(() => parseMessage("{foo,plural,one other{}}")).toThrow(
      "Unexpected token identifier (expected {)",
    );
    expect(() => parseMessage("{foo,plural,=42 other{}")).toThrow(
      "Unexpected token identifier (expected {)",
    );
    expect(() => parseMessage("{foo,plural,one?{}other{}}")).toThrow(
      "Unexpected token ? (expected {)",
    );
    expect(() => parseMessage("{foo,plural,42{}other{}}")).toThrow(
      "Unexpected token number (expected offset:, identifier, =, })",
    );
    expect(() => parseMessage("{foo,plural,one{},other{}}")).toThrow(
      "Unexpected token , (expected identifier, =, })",
    );
    expect(() => parseMessage("{foo,plural,one{}other{")).toThrow(
      "Unexpected token EOF (expected })",
    );
    expect(() => parseMessage("{foo,plural,one{}other{'}}")).toThrow(
      /Unclosed quoted string/,
    );
    expect(() => parseMessage("{foo,plural,one{}other{},}")).toThrow(
      "Unexpected token , (expected identifier, =, })",
    );
    expect(() => parseMessage("{foo,plural,one{}other}")).toThrow(
      "Unexpected token } (expected {)",
    );
    expect(() => parseMessage("{foo,plural,one{}}")).toThrow(
      /Last selector should be other/,
    );
  });

  it("parses elementArg", () => {
    expect(parseMessage("Click <0>here</0>!")).toEqual<CompiledMessage>([
      "Click ",
      { type: "Element", name: 0, message: "here" },
      "!",
    ]);
    expect(parseMessage("Click <0 > here </0 > !")).toEqual<CompiledMessage>([
      "Click ",
      { type: "Element", name: 0, message: " here " },
      " !",
    ]);
    expect(parseMessage("<foo><3></3></foo>")).toEqual<CompiledMessage>({
      type: "Element",
      name: "foo",
      message: {
        type: "Element",
        name: 3,
        message: "",
      },
    });
    expect(parseMessage("<foo/> and <bar />")).toEqual<CompiledMessage>([
      {
        type: "Element",
        name: "foo",
        message: undefined,
      },
      " and ",
      {
        type: "Element",
        name: "bar",
        message: undefined,
      },
    ]);
  });

  it("errors on invalid elementArg", () => {
    expect(() => parseMessage("<$foo></foo>")).toThrow(
      "Unexpected token $ (expected number, identifier)",
    );
    expect(() => parseMessage("<foo$></foo>")).toThrow(
      "Unexpected token $ (expected /, >)",
    );
    expect(() => parseMessage("<foo></$foo>")).toThrow(
      "Unexpected token $ (expected number, identifier)",
    );
    expect(() => parseMessage("<foo></foo$>")).toThrow(
      "Unexpected token $ (expected >)",
    );
    expect(() => parseMessage("<foo/$>")).toThrow(
      "Unexpected token $ (expected >)",
    );
    expect(() => parseMessage("<foo>")).toThrow(
      "Unexpected token EOF (expected <)",
    );
    expect(() => parseMessage("</foo>")).toThrow("Found an unmatching <");
    expect(() => parseMessage("< foo></foo>")).toThrow("No space allowed here");
    expect(() => parseMessage("<foo></ foo>")).toThrow("No space allowed here");
    expect(() => parseMessage("<foo>< /foo>")).toThrow(
      "Unexpected token / (expected number, identifier)",
    );
    expect(() => parseMessage("<foo/ >")).toThrow("No space allowed here");
    expect(() => parseMessage("<foo></bar>")).toThrow(
      "Tag foo closed with a different name: bar",
    );
    expect(() => parseMessage("<0123/>")).toThrow("Invalid number: 0123");
    expect(() => parseMessage("<123foo/>")).toThrow("Invalid number: 123foo");
  });
});
