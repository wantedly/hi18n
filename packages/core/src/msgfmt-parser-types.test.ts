/* eslint-disable @typescript-eslint/ban-ts-comment */

import { describe, it } from "vitest";
import type { ComponentPlaceholder, Message } from "./opaque.ts";
import type { InferredMessageType, ParseError } from "./msgfmt-parser-types.ts";

describe("InferredMessageType", () => {
  it("infers no arguments", () => {
    expectType<InferredMessageType<"foo">>().to(beTypeEqual<Message>());
  });

  // Just in case. This is not a recommended usage because it disrupts usage detection.
  it("distributes union", () => {
    expectType<InferredMessageType<"{foo}" | "{bar}">>().to(
      beTypeEqual<Message<{ foo: string; bar: string }>>(),
    );
  });

  // TypeScript >= 4.6
  it("infers long messages", () => {
    expectType<
      InferredMessageType<"abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz">
    >().to(beTypeEqual<Message>());
    expectType<
      InferredMessageType<"{abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz}">
    >().to(
      beTypeEqual<
        Message<{
          abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz: string;
        }>
      >(),
    );
  });

  it("infers simple arguments", () => {
    expectType<InferredMessageType<"{name}">>().to(
      beTypeEqual<Message<{ name: string }>>(),
    );
    expectType<InferredMessageType<"{name} {value}">>().to(
      beTypeEqual<Message<{ name: string; value: string }>>(),
    );
  });

  it("infers unknown on too general strings", () => {
    expectType<InferredMessageType<string>>().to(beTypeEqual<unknown>());
  });

  it("infers unknown on parse error", () => {
    expectType<InferredMessageType<"{}">>().to(
      beTypeEqual<
        ParseError<"Unexpected token } (expected number, identifier)">
      >(),
    );
    expectType<InferredMessageType<"{nam">>().to(
      beTypeEqual<ParseError<"Unexpected token EOF (expected }, ,)">>(),
    );
    expectType<InferredMessageType<"{2nd}">>().to(
      beTypeEqual<ParseError<"Invalid number: 2nd">>(),
    );
    expectType<InferredMessageType<"{name foo}">>().to(
      beTypeEqual<ParseError<"Unexpected token identifier (expected }, ,)">>(),
    );
  });

  describe("Compatibility with parseMessage", () => {
    it("parses plain texts", () => {
      expectType<InferredMessageType<"">>().to(beTypeEqual<Message>());
      expectType<InferredMessageType<"Hello, world!">>().to(
        beTypeEqual<Message>(),
      );
      expectType<InferredMessageType<"こんにちは世界!">>().to(
        beTypeEqual<Message>(),
      );
      expectType<InferredMessageType<"1 + 1 = 2">>().to(beTypeEqual<Message>());
      expectType<InferredMessageType<"#">>().to(beTypeEqual<Message>());
    });

    it("parses texts with single quotes", () => {
      expectType<InferredMessageType<"I'm not a fond of this syntax.">>().to(
        beTypeEqual<Message>(),
      );
      expectType<InferredMessageType<"a'b {name} c'd">>().to(
        beTypeEqual<Message<{ name: string }>>(),
      );
    });

    it("parses texts with double quotes", () => {
      expectType<InferredMessageType<"I''m not a fond of this syntax.">>().to(
        beTypeEqual<Message>(),
      );
    });

    it("parses quoted texts", () => {
      expectType<InferredMessageType<"'{foo}'">>().to(beTypeEqual<Message>());
      expectType<
        InferredMessageType<"foo, '{bar}', '{}#|', '{a''b}', ''''">
      >().to(beTypeEqual<Message>());
      // They are always quotable although conditional
      expectType<InferredMessageType<"'# {}' '| {}'">>().to(
        beTypeEqual<Message>(),
      );
      expectType<InferredMessageType<"'< {}'">>().to(beTypeEqual<Message>());
    });

    it("errors on unclosed quoted strings", () => {
      expectType<InferredMessageType<"'{foo}">>().to(
        beTypeEqual<ParseError<"Unclosed quoted string">>(),
      );
    });

    it("parses noneArg", () => {
      expectType<InferredMessageType<"{foo}">>().to(
        beTypeEqual<Message<{ foo: string }>>(),
      );
      expectType<InferredMessageType<"foo { foo }">>().to(
        beTypeEqual<Message<{ foo: string }>>(),
      );
      expectType<InferredMessageType<"foo { foo } bar { bar }">>().to(
        beTypeEqual<Message<{ foo: string; bar: string }>>(),
      );
      expectType<InferredMessageType<"{2}{ 0 }, {1}">>().to(
        beTypeEqual<Message<{ 0: string; 1: string; 2: string }>>(),
      );
    });

    it("parses simpleArg", () => {
      expectType<InferredMessageType<"{foo,number}">>().to(
        beTypeEqual<Message<{ foo: number }>>(),
      );
      expectType<InferredMessageType<"foo { foo , number }">>().to(
        beTypeEqual<Message<{ foo: number }>>(),
      );
      expectType<
        InferredMessageType<"foo { foo , date } bar { bar , time }">
      >().to(beTypeEqual<Message<{ foo: Date; bar: Date }>>());
      expectType<
        InferredMessageType<"{2,spellout}{ 0 , ordinal }, {1,duration}">
      >().to(beTypeEqual<Message<{ 0: number; 1: number; 2: number }>>());
    });

    it("errors on invalid noneArg", () => {
      expectType<InferredMessageType<"{">>().to(
        beTypeEqual<
          ParseError<"Unexpected token EOF (expected number, identifier)">
        >(),
      );
      expectType<InferredMessageType<"{$">>().to(
        beTypeEqual<
          ParseError<"Unexpected token $ (expected number, identifier)">
        >(),
      );
      expectType<InferredMessageType<"{123foo}">>().to(
        beTypeEqual<ParseError<"Invalid number: 123foo">>(),
      );
      expectType<InferredMessageType<"{0123}">>().to(
        beTypeEqual<ParseError<"Invalid number: 0123">>(),
      );
      expectType<InferredMessageType<"{foo">>().to(
        beTypeEqual<ParseError<"Unexpected token EOF (expected }, ,)">>(),
      );
      expectType<InferredMessageType<"{foo%">>().to(
        beTypeEqual<ParseError<"Unexpected token % (expected }, ,)">>(),
      );
    });

    it("errors on invalid argType", () => {
      expectType<InferredMessageType<"{foo,}">>().to(
        beTypeEqual<ParseError<"Unexpected token } (expected identifier)">>(),
      );
      expectType<InferredMessageType<"{foo,$}">>().to(
        beTypeEqual<ParseError<"Unexpected token $ (expected identifier)">>(),
      );
      expectType<InferredMessageType<"{foo,integer}">>().to(
        beTypeEqual<ParseError<"Invalid argType: integer">>(),
      );
      expectType<InferredMessageType<"{foo,number$}">>().to(
        beTypeEqual<ParseError<"Unexpected token $ (expected }, ,)">>(),
      );
      expectType<InferredMessageType<"{foo,number">>().to(
        beTypeEqual<ParseError<"Unexpected token EOF (expected }, ,)">>(),
      );
    });

    it("parses styles in simpleArg", () => {
      expectType<InferredMessageType<"{foo,number,integer}">>().to(
        beTypeEqual<Message<{ foo: number }>>(),
      );
      expectType<InferredMessageType<"{foo,number,currency}">>().to(
        beTypeEqual<Message<{ foo: number }>>(),
      );
      expectType<InferredMessageType<"{foo,number,percent}">>().to(
        beTypeEqual<Message<{ foo: number }>>(),
      );
      expectType<InferredMessageType<"{foo,date,short}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,date,medium}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,date,long}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,date,full}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,date,::MMMMdjmm}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,time,short}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,time,medium}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,time,long}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
      expectType<InferredMessageType<"{foo,time,full}">>().to(
        beTypeEqual<Message<{ foo: Date }>>(),
      );
    });

    it("errors on invalid styles", () => {
      expectType<InferredMessageType<"{foo,number,$}">>().to(
        beTypeEqual<
          ParseError<"Unexpected token $ (expected identifier, ::)">
        >(),
      );
      expectType<InferredMessageType<"{foo,number,foobar}">>().to(
        beTypeEqual<ParseError<"Invalid argStyle for number: foobar">>(),
      );
      expectType<InferredMessageType<"{foo,number,integer$}">>().to(
        beTypeEqual<ParseError<"Unexpected token $ (expected })">>(),
      );
      expectType<InferredMessageType<"{foo,date,integer}">>().to(
        beTypeEqual<ParseError<"Invalid argStyle for date: integer">>(),
      );
      expectType<InferredMessageType<"{foo,number,full}">>().to(
        beTypeEqual<ParseError<"Invalid argStyle for number: full">>(),
      );
      expectType<InferredMessageType<"{foo,spellout,integer}">>().to(
        beTypeEqual<ParseError<"Invalid argStyle for spellout: integer">>(),
      );
      // TODO
      // expectType<InferredMessageType<"{foo,date,::YYYYwwEEEE}">>().to(
      //   beTypeEqual<ParseError<"Invalid date skeleton: YYYY">>()
      // );
    });

    it("errors on choiceArg", () => {
      expectType<InferredMessageType<"{foo,choice,0#zero|1#one}">>().to(
        beTypeEqual<ParseError<"choice is not supported">>(),
      );
    });

    it("parses pluralArg", () => {
      expectType<
        InferredMessageType<"{foo,plural,one{an apple}other{apples}}">
      >().to(beTypeEqual<Message<{ foo: number }>>());
      expectType<
        InferredMessageType<" { foo , plural , one { an apple } other { apples } } ">
      >().to(beTypeEqual<Message<{ foo: number }>>());
      expectType<
        InferredMessageType<"{foo,plural,=1{bar}=2{barbar}other{barbarbar}}">
      >().to(beTypeEqual<Message<{ foo: number }>>());
      expectType<
        InferredMessageType<" { foo , plural , =1 { bar } =2 { barbar } other { barbarbar } } ">
      >().to(beTypeEqual<Message<{ foo: number }>>());
      expectType<
        InferredMessageType<"{foo,plural,offset:1 one{an apple}other{apples}}">
      >().to(beTypeEqual<Message<{ foo: number }>>());
      expectType<
        InferredMessageType<" { foo , plural , offset:1 one { an apple } other { apples } } ">
      >().to(beTypeEqual<Message<{ foo: number }>>());
      expectType<
        InferredMessageType<"{foo,plural,one{# apple}other{# apples}}">
      >().to(beTypeEqual<Message<{ foo: number }>>());
      expectType<
        InferredMessageType<" { foo , plural , one { # apple } other { # apples } } ">
      >().to(beTypeEqual<Message<{ foo: number }>>());
    });

    it("errors on invalid pluralArg", () => {
      expectType<InferredMessageType<"{foo,plural">>().to(
        beTypeEqual<ParseError<"Unexpected token EOF (expected ,)">>(),
      );
      expectType<InferredMessageType<"{foo,plural%">>().to(
        beTypeEqual<ParseError<"Unexpected token % (expected ,)">>(),
      );
      expectType<InferredMessageType<"{foo,plural}">>().to(
        beTypeEqual<ParseError<"Unexpected token } (expected ,)">>(),
      );
      expectType<InferredMessageType<"{foo,plural,$}">>().to(
        beTypeEqual<
          ParseError<"Unexpected token $ (expected offset:, identifier, =, })">
        >(),
      );
      expectType<InferredMessageType<"{foo,plural,}">>().to(
        beTypeEqual<ParseError<"No branch found">>(),
      );
      expectType<InferredMessageType<"{foo,plural,=foo{}other{}}">>().to(
        beTypeEqual<
          ParseError<"Unexpected token identifier (expected number)">
        >(),
      );
      expectType<InferredMessageType<"{foo,plural,= 42{}other{}}">>().to(
        beTypeEqual<ParseError<"No space allowed here">>(),
      );
      expectType<InferredMessageType<"{foo,plural,one other{}}">>().to(
        beTypeEqual<ParseError<"Unexpected token identifier (expected {)">>(),
      );
      expectType<InferredMessageType<"{foo,plural,=42 other{}">>().to(
        beTypeEqual<ParseError<"Unexpected token identifier (expected {)">>(),
      );
      expectType<InferredMessageType<"{foo,plural,one?{}other{}}">>().to(
        beTypeEqual<ParseError<"Unexpected token ? (expected {)">>(),
      );
      expectType<InferredMessageType<"{foo,plural,42{}other{}}">>().to(
        beTypeEqual<
          ParseError<"Unexpected token number (expected offset:, identifier, =, })">
        >(),
      );
      expectType<InferredMessageType<"{foo,plural,one{},other{}}">>().to(
        beTypeEqual<
          ParseError<"Unexpected token , (expected identifier, =, })">
        >(),
      );
      expectType<InferredMessageType<"{foo,plural,one{}other{">>().to(
        beTypeEqual<ParseError<"Unexpected token EOF (expected })">>(),
      );
      expectType<InferredMessageType<"{foo,plural,one{}other{'}}">>().to(
        beTypeEqual<ParseError<"Unclosed quoted string">>(),
      );
      expectType<InferredMessageType<"{foo,plural,one{}other{},}">>().to(
        beTypeEqual<
          ParseError<"Unexpected token , (expected identifier, =, })">
        >(),
      );
      expectType<InferredMessageType<"{foo,plural,one{}other}">>().to(
        beTypeEqual<ParseError<"Unexpected token } (expected {)">>(),
      );
      expectType<InferredMessageType<"{foo,plural,one{}}">>().to(
        beTypeEqual<ParseError<"Last selector should be other">>(),
      );
    });

    it("parses elementArg", () => {
      expectType<InferredMessageType<"Click <0>here</0>!">>().to(
        beTypeEqual<Message<{ 0: ComponentPlaceholder }>>(),
      );
      expectType<InferredMessageType<"Click <0 > here </0 > !">>().to(
        beTypeEqual<Message<{ 0: ComponentPlaceholder }>>(),
      );
      expectType<InferredMessageType<"<foo><3></3></foo>">>().to(
        beTypeEqual<
          Message<{ 3: ComponentPlaceholder; foo: ComponentPlaceholder }>
        >(),
      );
      expectType<InferredMessageType<"<foo/> and <bar />">>().to(
        beTypeEqual<
          Message<{ foo: ComponentPlaceholder; bar: ComponentPlaceholder }>
        >(),
      );
    });

    it("errors on invalid elementArg", () => {
      expectType<InferredMessageType<"<$foo></foo>">>().to(
        beTypeEqual<
          ParseError<"Unexpected token $ (expected number, identifier)">
        >(),
      );
      expectType<InferredMessageType<"<foo$></foo>">>().to(
        beTypeEqual<ParseError<"Unexpected token $ (expected /, >)">>(),
      );
      expectType<InferredMessageType<"<foo></$foo>">>().to(
        beTypeEqual<
          ParseError<"Unexpected token $ (expected number, identifier)">
        >(),
      );
      expectType<InferredMessageType<"<foo></foo$>">>().to(
        beTypeEqual<ParseError<"Unexpected token $ (expected >)">>(),
      );
      expectType<InferredMessageType<"<foo/$>">>().to(
        beTypeEqual<ParseError<"Unexpected token $ (expected >)">>(),
      );
      expectType<InferredMessageType<"<foo>">>().to(
        beTypeEqual<ParseError<"Unexpected token EOF (expected <)">>(),
      );
      expectType<InferredMessageType<"</foo>">>().to(
        beTypeEqual<ParseError<"Found an unmatching <">>(),
      );
      expectType<InferredMessageType<"< foo></foo>">>().to(
        beTypeEqual<ParseError<"No space allowed here">>(),
      );
      expectType<InferredMessageType<"<foo></ foo>">>().to(
        beTypeEqual<ParseError<"No space allowed here">>(),
      );
      expectType<InferredMessageType<"<foo>< /foo>">>().to(
        beTypeEqual<
          ParseError<"Unexpected token / (expected number, identifier)">
        >(),
      );
      expectType<InferredMessageType<"<foo/ >">>().to(
        beTypeEqual<ParseError<"No space allowed here">>(),
      );
      expectType<InferredMessageType<"<foo></bar>">>().to(
        beTypeEqual<ParseError<"Tag foo closed with a different name: bar">>(),
      );
      expectType<InferredMessageType<"<0123/>">>().to(
        beTypeEqual<ParseError<"Invalid number: 0123">>(),
      );
      expectType<InferredMessageType<"<123foo/>">>().to(
        beTypeEqual<ParseError<"Invalid number: 123foo">>(),
      );
    });
  });
});

type Predicate<T> = {
  co?: (() => T) | undefined;
  contra?: ((x: T) => void) | undefined;
};

function expectType<T>() {
  return {
    to(_pred: Predicate<T>): void {},
  };
}

type AssignableToPredicate<T> = {
  co?: undefined;
  contra(x: T): void;
};
function beAssignableTo<T>(): AssignableToPredicate<T> {
  return { contra(_x: T) {} };
}

type AssignableFromPredicate<T> = {
  co(): T;
  contra?: undefined;
};
function beAssignableFrom<T>(): AssignableFromPredicate<T> {
  return {
    co() {
      return null as unknown as T;
    },
  };
}

type TypeEqualPredicate<T> = {
  co(): T;
  contra(x: T): void;
};
function beTypeEqual<T>(): TypeEqualPredicate<T> {
  return {
    co() {
      return null as unknown as T;
    },
    contra(_x: T) {},
  };
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
