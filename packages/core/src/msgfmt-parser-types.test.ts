import { describe, it } from "@jest/globals";
import type { Message } from "./index";
import type { InferredMessageType, ParseError } from "./msgfmt-parser-types";

describe("InferredMessageType", () => {
  it("infers no arguments", () => {
    expectType<InferredMessageType<"foo">>().to(beTypeEqual<Message>());
  });

  // TypeScript >= 4.6
  it("infers long messages", () => {
    expectType<InferredMessageType<"abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz">>().to(beTypeEqual<Message>());
    expectType<InferredMessageType<"{abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz}">>().to(beTypeEqual<Message<{ abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz: string }>>());
  });

  it("infers simple arguments", () => {
    expectType<InferredMessageType<"{name}">>().to(beTypeEqual<Message<{ name: string }>>());
    expectType<InferredMessageType<"{name} {value}">>().to(beTypeEqual<Message<{ name: string, value: string }>>());
  });

  it("infers unknown on too general strings", () => {
    expectType<InferredMessageType<string>>().to(beTypeEqual<unknown>());
  });

  it("infers unknown on parse error", () => {
    expectType<InferredMessageType<"{}">>().to(beTypeEqual<ParseError<"Unexpected token after {">>());
    expectType<InferredMessageType<"{nam">>().to(beTypeEqual<ParseError<"Unclosed argument">>());
    expectType<InferredMessageType<"{2nd}">>().to(beTypeEqual<ParseError<"Invalid character in a number">>());
    expectType<InferredMessageType<"{name foo}">>().to(beTypeEqual<ParseError<"Invalid character after argument name">>());
  });

  describe("Compatibility with parseMessage", () => {
    it("parses plain texts", () => {
      expectType<InferredMessageType<"">>().to(beTypeEqual<Message>());
      expectType<InferredMessageType<"Hello, world!">>().to(beTypeEqual<Message>());
      expectType<InferredMessageType<"こんにちは世界!">>().to(beTypeEqual<Message>());
      expectType<InferredMessageType<"1 + 1 = 2">>().to(beTypeEqual<Message>());
      expectType<InferredMessageType<"#">>().to(beTypeEqual<Message>());
    });

    it("parses texts with double quotes", () => {
      expectType<InferredMessageType<"I''m not a fond of this syntax.">>().to(beTypeEqual<Message>());
    });

    it("parses quoted texts", () => {
      expectType<InferredMessageType<"'{foo}'">>().to(beTypeEqual<Message>());
      expectType<InferredMessageType<"foo, '{bar}', '{}#|', '{a''b}', ''''">>().to(beTypeEqual<Message>());
    });

    it("errors on unclosed quoted strings", () => {
      expectType<InferredMessageType<"'{foo}">>().to(beTypeEqual<ParseError<"Unclosed quoted string">>());
    });

    it("parses noneArg", () => {
      expectType<InferredMessageType<"{foo}">>().to(beTypeEqual<Message<{ foo: string }>>());
      expectType<InferredMessageType<"foo { foo }">>().to(beTypeEqual<Message<{ foo: string }>>());
      expectType<InferredMessageType<"foo { foo } bar { bar }">>().to(beTypeEqual<Message<{ foo: string, bar: string }>>());
      expectType<InferredMessageType<"{2}{ 0 }, {1}">>().to(beTypeEqual<Message<{ 0: string, 1: string, 2: string }>>());
    });

    it("errors on invalid noneArg", () => {
      expectType<InferredMessageType<"{">>().to(beTypeEqual<ParseError<"Unexpected token after {">>());
      expectType<InferredMessageType<"{$">>().to(beTypeEqual<ParseError<"Unexpected token after {">>());
      expectType<InferredMessageType<"{123foo}">>().to(beTypeEqual<ParseError<"Invalid character in a number">>());
      expectType<InferredMessageType<"{0123}">>().to(beTypeEqual<ParseError<"Numbers cannot start with 0">>());
      expectType<InferredMessageType<"{foo">>().to(beTypeEqual<ParseError<"Unclosed argument">>());
      expectType<InferredMessageType<"{foo%">>().to(beTypeEqual<ParseError<"Invalid character after argument name">>());
    });
  });
});

type Predicate<T> = {
  co?: (() => T) | undefined;
  contra?: ((x: T) => void) | undefined;
};

function expectType<T>() {
  return {
    to(_pred: Predicate<T>): void {}
  };
}

type AssignableToPredicate<T> = {
  co?: undefined;
  contra(x: T): void;
};
function beAssignableTo<T>(): AssignableToPredicate<T> {
  return { contra(_x: T) {} }
}

type AssignableFromPredicate<T> = {
  co(): T;
  contra?: undefined;
};
function beAssignableFrom<T>(): AssignableFromPredicate<T> {
  return { co() { return null as any; } };
}

type TypeEqualPredicate<T> = {
  co(): T;
  contra(x: T): void;
};
function beTypeEqual<T>(): TypeEqualPredicate<T> {
  return { co() { return null as any; }, contra(_x: T) {} }
}

// Type predicate self check

expectType<number>().to(beAssignableTo<number>());
// @ts-expect-error
expectType<number>().to(beAssignableTo<string>());
expectType<number>().to(beAssignableTo<number | string>());
// @ts-expect-error
expectType<number>().to(beAssignableTo<never>());

expectType<number>().to(beAssignableFrom<number>());
// @ts-expect-error
expectType<number>().to(beAssignableFrom<string>());
// @ts-expect-error
expectType<number>().to(beAssignableFrom<number | string>());
expectType<number>().to(beAssignableFrom<never>());

expectType<number>().to(beTypeEqual<number>());
// @ts-expect-error
expectType<number>().to(beTypeEqual<string>());
// @ts-expect-error
expectType<number>().to(beTypeEqual<number | string>());
// @ts-expect-error
expectType<number>().to(beTypeEqual<never>());
