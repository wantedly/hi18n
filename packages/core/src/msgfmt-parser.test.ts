import { describe, expect, it } from "@jest/globals";
import { parseMessage } from "./msgfmt-parser";

describe("parseMessage", () => {
  it("parses plain texts", () => {
    expect(parseMessage("")).toBe("");
    expect(parseMessage("Hello, world!")).toBe("Hello, world!");
    expect(parseMessage("こんにちは世界!")).toBe("こんにちは世界!");
    expect(parseMessage("1 + 1 = 2")).toBe("1 + 1 = 2");
    expect(parseMessage("#")).toBe("#");
  });

  it("parses texts with double quotes", () => {
    expect(parseMessage("I''m not a fond of this syntax.")).toBe("I'm not a fond of this syntax.");
  });

  it("parses quoted texts", () => {
    expect(parseMessage("'{foo}'")).toBe("{foo}");
    expect(parseMessage("foo, '{bar}', '{}#|', '{a''b}', ''''")).toBe("foo, {bar}, {}#|, {a'b}, ''");
  });

  it("errors on unclosed quoted strings", () => {
    expect(() => parseMessage("'{foo}")).toThrow(/Unclosed quoted string/);
  });

  it("parses noneArg", () => {
    expect(parseMessage("{foo}")).toEqual({ type: "Var", name: "foo" });
    expect(parseMessage("foo { foo }")).toEqual(["foo ", { type: "Var", name: "foo" }]);
    expect(parseMessage("foo { foo } bar { bar }")).toEqual(["foo ", { type: "Var", name: "foo" }, " bar ", { type: "Var", name: "bar" }]);
    expect(parseMessage("{2}{ 0 }, {1}")).toEqual([{ type: "Var", name: 2 }, { type: "Var", name: 0 }, ", ", { type: "Var", name: 1 }]);
  });

  it("parses simpleArg", () => {
    expect(parseMessage("{foo,number}")).toEqual({ type: "Var", name: "foo", argType: "number" });
    expect(parseMessage("foo { foo , number }")).toEqual(["foo ", { type: "Var", name: "foo", argType: "number" }]);
    expect(parseMessage("foo { foo , date } bar { bar , time }")).toEqual(["foo ", { type: "Var", name: "foo", argType: "date" }, " bar ", { type: "Var", name: "bar", argType: "time" }]);
    expect(parseMessage("{2,spellout}{ 0 , ordinal }, {1,duration}")).toEqual([{ type: "Var", name: 2, argType: "spellout" }, { type: "Var", name: 0, argType: "ordinal" }, ", ", { type: "Var", name: 1, argType: "duration" }]);
  });

  it("errors on invalid noneArg", () => {
    expect(() => parseMessage("{")).toThrow("Unexpected token EOF (expected number, identifier)");
    expect(() => parseMessage("{$")).toThrow("Unexpected token $ (expected number, identifier)");
    expect(() => parseMessage("{123foo}")).toThrow("Invalid number: 123foo");
    expect(() => parseMessage("{0123}")).toThrow("Invalid number: 0123");
    expect(() => parseMessage("{foo")).toThrow("Unexpected token EOF (expected }, ,)");
    expect(() => parseMessage("{foo%")).toThrow("Unexpected token % (expected }, ,)");
  });

  it("errors on invalid argType", () => {
    expect(() => parseMessage("{foo,}")).toThrow("Unexpected token } (expected identifier)");
    expect(() => parseMessage("{foo,$}")).toThrow("Unexpected token $ (expected identifier)");
    expect(() => parseMessage("{foo,integer}")).toThrow(/Invalid argType: integer/);
    expect(() => parseMessage("{foo,number$}")).toThrow("Unexpected token $ (expected }, ,)");
    expect(() => parseMessage("{foo,number")).toThrow("Unexpected token EOF (expected }, ,)");
  });

  it("errors on choiceArg", () => {
    expect(() => parseMessage("{foo,choice,0#zero|1#one}")).toThrow(/choice is not supported/);
  });

  it("parses pluralArg", () => {
    expect(parseMessage("{foo,plural,one{an apple}other{apples}}")).toEqual(
      {
        type: "Plural",
        name: "foo",
        offset: undefined,
        branches: [
          {
            selector: "one",
            message: "an apple",
          },
          {
            selector: "other",
            message: "apples",
          },
        ],
      }
    );
    expect(parseMessage(" { foo , plural , one { an apple } other { apples } } ")).toEqual(
      [
        " ",
        {
          type: "Plural",
          name: "foo",
          offset: undefined,
          branches: [
            {
              selector: "one",
              message: " an apple ",
            },
            {
              selector: "other",
              message: " apples ",
            },
          ],
        },
        " ",
      ]
    );
    expect(parseMessage("{foo,plural,=1{bar}=2{barbar}other{barbarbar}}")).toEqual(
      {
        type: "Plural",
        name: "foo",
        offset: undefined,
        branches: [
          {
            selector: 1,
            message: "bar",
          },
          {
            selector: 2,
            message: "barbar",
          },
          {
            selector: "other",
            message: "barbarbar",
          },
        ],
      }
    );
    expect(parseMessage(" { foo , plural , =1 { bar } =2 { barbar } other { barbarbar } } ")).toEqual(
      [
        " ",
        {
          type: "Plural",
          name: "foo",
          offset: undefined,
          branches: [
            {
              selector: 1,
              message: " bar ",
            },
            {
              selector: 2,
              message: " barbar ",
            },
            {
              selector: "other",
              message: " barbarbar ",
            },
          ],
        },
        " ",
      ]
    );
    expect(parseMessage("{foo,plural,offset:1 one{an apple}other{apples}}")).toEqual(
      {
        type: "Plural",
        name: "foo",
        offset: 1,
        branches: [
          {
            selector: "one",
            message: "an apple",
          },
          {
            selector: "other",
            message: "apples",
          },
        ],
      }
    );
    expect(parseMessage(" { foo , plural , offset:1 one { an apple } other { apples } } ")).toEqual(
      [
        " ",
        {
          type: "Plural",
          name: "foo",
          offset: 1,
          branches: [
            {
              selector: "one",
              message: " an apple ",
            },
            {
              selector: "other",
              message: " apples ",
            },
          ],
        },
        " ",
      ]
    );
  });

  it("errors on invalid pluralArg", () => {
    expect(() => parseMessage("{foo,plural")).toThrow("Unexpected token EOF (expected ,)");
    expect(() => parseMessage("{foo,plural%")).toThrow("Unexpected token % (expected ,)");
    expect(() => parseMessage("{foo,plural}")).toThrow("Unexpected token } (expected ,)");
    expect(() => parseMessage("{foo,plural,$}")).toThrow("Unexpected token $ (expected offset:, identifier, =number, })");
    expect(() => parseMessage("{foo,plural,}")).toThrow("No branch found");
    expect(() => parseMessage("{foo,plural,=foo{}other{}}")).toThrow("Invalid number: foo");
    expect(() => parseMessage("{foo,plural,= 42{}other{}}")).toThrow("Unexpected token = (expected offset:, identifier, =number, })");
    expect(() => parseMessage("{foo,plural,one other{}}")).toThrow("Unexpected token identifier (expected {)");
    expect(() => parseMessage("{foo,plural,=42 other{}")).toThrow("Unexpected token identifier (expected {)");
    expect(() => parseMessage("{foo,plural,one?{}other{}}")).toThrow("Unexpected token ? (expected {)");
    expect(() => parseMessage("{foo,plural,42{}other{}}")).toThrow("Unexpected token number (expected offset:, identifier, =number, })");
    expect(() => parseMessage("{foo,plural,one{},other{}}")).toThrow("Unexpected token , (expected identifier, =number, })");
    expect(() => parseMessage("{foo,plural,one{}other{")).toThrow("Unexpected token EOF (expected })");
    expect(() => parseMessage("{foo,plural,one{}other{'}}")).toThrow(/Unclosed quoted string/);
    expect(() => parseMessage("{foo,plural,one{}other{},}")).toThrow("Unexpected token , (expected identifier, =number, })");
    expect(() => parseMessage("{foo,plural,one{}other}")).toThrow("Unexpected token } (expected {)");
    expect(() => parseMessage("{foo,plural,one{}}")).toThrow(/Last selector should be other/);
  });
});
