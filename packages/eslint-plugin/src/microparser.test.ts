import { describe, expect, it } from "vitest";
import {
  isProperty,
  isTSSignature,
  ParseError,
  tokenize,
} from "./microparser.ts";

describe("isProperty", () => {
  it("parses a property", () => {
    expect(isProperty('"example/greeting": "Hello"')).toBe(true);
    expect(isProperty('"example/greeting": "Hello" // here')).toBe(true);
    expect(isProperty('"example/greeting": // "Hello"')).toBe(false);
    expect(isProperty('"example/greeting": /* ok */ "Hello"')).toBe(true);
    expect(isProperty('"example/greeting":')).toBe(false);
    expect(isProperty('foo: "Hello"')).toBe(true);
    expect(isProperty("foo: bar")).toBe(true);
    expect(isProperty("foo: bar.baz")).toBe(true);
    expect(isProperty("foo: bar.baz()")).toBe(true);
    expect(isProperty('foo: bar.baz("")')).toBe(true);
    expect(isProperty('foo: bar.baz("",)')).toBe(true);
    expect(isProperty('foo: bar.baz("", "")')).toBe(true);
  });
});

describe("isTSSignature", () => {
  it("parses a signature", () => {
    expect(isTSSignature('"example/greeting": Message')).toBe(true);
    expect(isTSSignature('"example/greeting": Message // here')).toBe(true);
    expect(isTSSignature('"example/greeting": // Message')).toBe(false);
    expect(isTSSignature('"example/greeting": /* ok */ Message')).toBe(true);
    expect(isTSSignature('"example/greeting":')).toBe(false);
    expect(isTSSignature("foo: Message")).toBe(true);
    expect(isTSSignature("foo: Message<T>")).toBe(true);
    expect(isTSSignature("foo: Message<{}>")).toBe(true);
    expect(isTSSignature("foo: Message<{ foo: number }>")).toBe(true);
    expect(isTSSignature("foo: Message<{ foo: number, bar: number }>")).toBe(
      true,
    );
    expect(isTSSignature("foo: Message<{ foo: number, bar: number, }>")).toBe(
      true,
    );
    expect(isTSSignature("foo: Message<{ foo: number; bar: number }>")).toBe(
      true,
    );
    expect(isTSSignature("foo: Message<{ foo: number; bar: number; }>")).toBe(
      true,
    );
    expect(isTSSignature("foo: Message<{ foo: number\nbar: number }>")).toBe(
      true,
    );
    expect(isTSSignature("foo: Message<{ foo: number\nbar: number\n }>")).toBe(
      true,
    );
  });
});

describe("tokenize", () => {
  it("tokenizes whitespaces", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(" ")).toEqual([]);
    expect(tokenize("\t \n")).toEqual([]);
    expect(tokenize(" /* foo */ ")).toEqual([]);
    expect(tokenize(" /* * foo ** * / */ ")).toEqual([]);
    expect(tokenize(" /* foo */ */ ")).toEqual([
      {
        type: "Punctuator",
        value: "*",
        loc: loc(1, 11, 1, 12),
        range: [11, 12],
      },
      {
        type: "Punctuator",
        value: "/",
        loc: loc(1, 12, 1, 13),
        range: [12, 13],
      },
    ]);
    expect(tokenize(" // foo")).toEqual([]);
    expect(tokenize(" // foo\n")).toEqual([]);
  });

  it("tokenizes string", () => {
    expect(tokenize(' "foo" "a\\" b"')).toEqual([
      { type: "String", value: '"foo"', loc: loc(1, 1, 1, 6), range: [1, 6] },
      {
        type: "String",
        value: '"a\\" b"',
        loc: loc(1, 7, 1, 14),
        range: [7, 14],
      },
    ]);
    expect(tokenize(" 'foo' 'a\\' b'")).toEqual([
      { type: "String", value: "'foo'", loc: loc(1, 1, 1, 6), range: [1, 6] },
      {
        type: "String",
        value: "'a\\' b'",
        loc: loc(1, 7, 1, 14),
        range: [7, 14],
      },
    ]);
    expect(tokenize('"\\n"')).toEqual([
      { type: "String", value: '"\\n"', loc: loc(1, 0, 1, 4), range: [0, 4] },
    ]);
    expect(tokenize('"\\\\"')).toEqual([
      { type: "String", value: '"\\\\"', loc: loc(1, 0, 1, 4), range: [0, 4] },
    ]);
    expect(tokenize('"\\\n"')).toEqual([
      { type: "String", value: '"\\\n"', loc: loc(1, 0, 2, 1), range: [0, 4] },
    ]);
    expect(tokenize('"\\\r\n"')).toEqual([
      {
        type: "String",
        value: '"\\\r\n"',
        loc: loc(1, 0, 2, 1),
        range: [0, 5],
      },
    ]);
    expect(tokenize('"\\0"')).toEqual([
      { type: "String", value: '"\\0"', loc: loc(1, 0, 1, 4), range: [0, 4] },
    ]);
    expect(tokenize('"\\xFF"')).toEqual([
      { type: "String", value: '"\\xFF"', loc: loc(1, 0, 1, 6), range: [0, 6] },
    ]);
    expect(tokenize('"\\uFFFF"')).toEqual([
      {
        type: "String",
        value: '"\\uFFFF"',
        loc: loc(1, 0, 1, 8),
        range: [0, 8],
      },
    ]);
    expect(tokenize('"\\u{10FFFF}"')).toEqual([
      {
        type: "String",
        value: '"\\u{10FFFF}"',
        loc: loc(1, 0, 1, 12),
        range: [0, 12],
      },
    ]);
    expect(() => tokenize(' "foo')).toThrow(ParseError);
    expect(() => tokenize(' "foo\nbar"')).toThrow(ParseError);
    expect(() => tokenize('"\r"')).toThrow(ParseError);
    expect(() => tokenize('"\r\n"')).toThrow(ParseError);
    expect(() => tokenize('"\\"')).toThrow(ParseError);
    expect(() => tokenize('"\\07"')).toThrow(ParseError);
    expect(() => tokenize('"\\09"')).toThrow(ParseError);
    expect(() => tokenize('"\\7"')).toThrow(ParseError);
    expect(() => tokenize('"\\9"')).toThrow(ParseError);
    expect(() => tokenize('"\\x"')).toThrow(ParseError);
    expect(() => tokenize('"\\xF"')).toThrow(ParseError);
    expect(() => tokenize('"\\xG"')).toThrow(ParseError);
    expect(() => tokenize('"\\xFG"')).toThrow(ParseError);
    expect(() => tokenize('"\\u"')).toThrow(ParseError);
    expect(() => tokenize('"\\uF"')).toThrow(ParseError);
    expect(() => tokenize('"\\uG"')).toThrow(ParseError);
    expect(() => tokenize('"\\uFFF"')).toThrow(ParseError);
    expect(() => tokenize('"\\uFFFG"')).toThrow(ParseError);
    expect(() => tokenize('"\\u{"')).toThrow(ParseError);
    expect(() => tokenize('"\\u{}"')).toThrow(ParseError);
    expect(() => tokenize('"\\u{ 1}"')).toThrow(ParseError);
    expect(() => tokenize('"\\u{1 }"')).toThrow(ParseError);
    expect(() => tokenize('"\\u{110000}"')).toThrow(ParseError);
  });
});

function loc(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
) {
  return {
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn },
  };
}
