/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */

// The parser algorithm is written to vastly match what is implemented in ./msgfmt-parser.ts, but with a few differences.

import type { Message } from "./index.js";

declare const componentPlaceholderSymbol: unique symbol;
export type ComponentPlaceholder = typeof componentPlaceholderSymbol;

export type ParseResult<
  Accum,
  Rem extends string,
  Error extends string | undefined
> = {
  AccumRev: (x: Accum) => void;
  Rem: Rem;
  Error: Error;
};

export type ParseError<Error extends string> = { error: Error };

export type InferredMessageType<S extends string> = ParseMessageEOF<
  S,
  {}
> extends ParseResult<infer Accum, any, infer Error>
  ? Error extends string
    ? ParseError<Error>
    : Accum[] extends never[]
    ? unknown
    : Message<Accum>
  : unknown;

type ValidArgType =
  | "number"
  | "date"
  | "time"
  | "spellout"
  | "ordinal"
  | "duration";

type ValidArgStyle = {
  number: "integer" | "currency" | "percent";
  date: "short" | "medium" | "long" | "full";
  time: "short" | "medium" | "long" | "full";
  spellout: never;
  ordinal: never;
  duration: never;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ParseMessageEOF<S extends string, Accum> = ParseMessage<
  S,
  Accum
> extends ParseResult<infer Accum, infer Rem, infer Error>
  ? Error extends string
    ? ParseResult<Accum, Rem, Error>
    : Rem extends `${infer RemH}${infer _Rem}`
    ? ParseResult<Accum, Rem, `Found an unmatching ${RemH}`>
    : Rem extends ""
    ? ParseResult<Accum, Rem, Error>
    : ParseResult<never, Rem, Error>
  : never;

type ParseMessage<S extends string, Accum> = S extends
  | `}${string}`
  | `</${string}`
  | ""
  ? ParseResult<Accum, S, undefined>
  : S extends `{${infer ST}`
  ? ParseArgument<ST, Accum>
  : S extends `''${infer STT}`
  ? ParseMessage<STT, Accum>
  : S extends `'${infer ST}`
  ? ST extends `${"{" | "}" | "#" | "|" | "<"}${string}`
    ? ParseQuoted<ST, Accum>
    : ParseMessage<ST, Accum>
  : S extends `<${infer ST}`
  ? ParseElement<ST, Accum>
  : S extends `${string}${infer ST}`
  ? ParseMessage<ST, Accum>
  : ParseResult<never, S, undefined>;

// After "'"
type ParseQuoted<S extends string, Accum> = S extends `''${infer ST}`
  ? ParseQuoted<ST, Accum>
  : S extends `'${infer ST}`
  ? ParseMessage<ST, Accum>
  : S extends ""
  ? ParseResult<Accum, S, "Unclosed quoted string">
  : S extends `${string}${infer ST}`
  ? ParseQuoted<ST, Accum>
  : ParseResult<never, S, undefined>;

type ParseArgument<S extends string, Accum> = NextToken<S> extends Token<
  "identifier" | "number",
  infer Name,
  infer ST
>
  ? CheckName<Name> extends ParseError<infer Error>
    ? ParseResult<Accum, S, Error>
    : NextToken<ST> extends Token<"}", any, infer STT>
    ? ParseMessage<STT, Accum & Record<CheckName<Name>, string>>
    : NextToken<ST> extends Token<",", any, infer STT>
    ? NextToken<STT> extends Token<"identifier", "choice", any>
      ? ParseResult<Accum, S, "choice is not supported">
      : NextToken<STT> extends Token<"identifier", "plural", infer STTT>
      ? ParsePluralArgument<STTT, CheckName<Name>, Accum>
      : NextToken<STT> extends Token<
          "identifier",
          "select" | "selectordinal",
          any
        >
      ? ParseResult<Accum, S, "Unimplemented: selectArg">
      : NextToken<STT> extends Token<"identifier", ValidArgType, infer STTT>
      ? NextToken<STTT> extends Token<"}", any, infer STTTT>
        ? ParseMessage<
            STTTT,
            Accum & Record<CheckName<Name>, ArgTypeMap[NextToken<STT>[1]]>
          >
        : NextToken<STTT> extends Token<",", any, infer STTTT>
        ? NextToken<STTTT> extends Token<
            "identifier",
            ValidArgStyle[NextToken<STT>[1]],
            infer STTTTT
          >
          ? NextToken<STTTTT> extends Token<"}", any, infer STTTTTT>
            ? ParseMessage<
                STTTTTT,
                Accum & Record<CheckName<Name>, ArgTypeMap[NextToken<STT>[1]]>
              >
            : ParseResult<
                Accum,
                S,
                `Unexpected token ${NextToken<STTTTT>[0]} (expected })`
              >
          : NextToken<STTTT> extends Token<"identifier", any, any>
          ? ParseResult<
              Accum,
              S,
              `Invalid argStyle for ${NextToken<STT>[1]}: ${NextToken<STTTT>[1]}`
            >
          : NextToken<STTTT> extends Token<"::", any, infer STTTTT>
          ? NextToken<STTTTT> extends Token<"identifier", any, infer STTTTTT>
            ? // TODO: parse skeletons
              NextToken<STTTTTT> extends Token<"}", any, infer STTTTTTT>
              ? ParseMessage<
                  STTTTTTT,
                  Accum & Record<CheckName<Name>, ArgTypeMap[NextToken<STT>[1]]>
                >
              : ParseResult<
                  Accum,
                  S,
                  `Unexpected token ${NextToken<STTTTT>[0]} (expected })`
                >
            : ParseResult<
                Accum,
                S,
                `Unexpected token ${NextToken<STTTTT>[0]} (expected identifier)`
              >
          : ParseResult<
              Accum,
              S,
              `Unexpected token ${NextToken<STTTT>[0]} (expected identifier, ::)`
            >
        : ParseResult<
            Accum,
            S,
            `Unexpected token ${NextToken<STTT>[0]} (expected }, ,)`
          >
      : NextToken<STT> extends Token<"identifier", any, any>
      ? ParseResult<Accum, S, `Invalid argType: ${NextToken<STT>[1]}`>
      : ParseResult<
          Accum,
          S,
          `Unexpected token ${NextToken<STT>[0]} (expected identifier)`
        >
    : ParseResult<
        Accum,
        S,
        `Unexpected token ${NextToken<ST>[0]} (expected }, ,)`
      >
  : ParseResult<
      Accum,
      S,
      `Unexpected token ${NextToken<S>[0]} (expected number, identifier)`
    >;

type ParsePluralArgument<
  S extends string,
  Name extends string | number,
  Accum
> = NextToken<S> extends Token<",", any, infer ST>
  ? NextToken<ST> extends Token<"offset:", any, infer STT>
    ? NextToken<STT> extends Token<"number", infer Offset, infer STTT>
      ? CheckNumber<Offset> extends ParseError<infer Error>
        ? ParseResult<Accum, S, Error>
        : ParsePluralArgument2<STTT, Name, undefined, Accum>
      : ParseResult<
          Accum,
          S,
          `Unexpected token ${NextToken<STT>[0]} (expected number)`
        >
    : NextToken<ST> extends Token<"identifier" | "=" | "}", any, any>
    ? ParsePluralArgument2<ST, Name, undefined, Accum>
    : ParseResult<
        Accum,
        S,
        `Unexpected token ${NextToken<ST>[0]} (expected offset:, identifier, =, })`
      >
  : ParseResult<Accum, S, `Unexpected token ${NextToken<S>[0]} (expected ,)`>;

type ParsePluralArgument2<
  S extends string,
  Name extends string | number,
  LastSelector extends string | undefined,
  Accum
> = NextToken<S> extends Token<"=", any, infer ST>
  ? NextToken<ST> extends Token<"number", infer Selector, infer STT>
    ? ST extends HasWhitespace
      ? ParseResult<Accum, S, "No space allowed here">
      : CheckNumber<Selector> extends ParseError<infer Error>
      ? ParseResult<Accum, S, Error>
      : ParsePluralArgument3<STT, Name, Selector, Accum>
    : ParseResult<
        Accum,
        S,
        `Unexpected token ${NextToken<ST>[0]} (expected number)`
      >
  : NextToken<S> extends Token<"identifier", infer Selector, infer ST>
  ? ParsePluralArgument3<ST, Name, Selector, Accum>
  : NextToken<S> extends Token<"}", any, infer ST>
  ? LastSelector extends "other"
    ? ParseMessage<ST, Accum & Record<Name, number>>
    : LastSelector extends string
    ? ParseResult<Accum, S, "Last selector should be other">
    : ParseResult<Accum, S, "No branch found">
  : ParseResult<
      Accum,
      S,
      `Unexpected token ${NextToken<S>[0]} (expected identifier, =, })`
    >;

type ParsePluralArgument3<
  S extends string,
  Name extends string | number,
  Selector extends string | undefined,
  Accum
> = NextToken<S> extends Token<"{", any, infer STT>
  ? ParseMessage<STT, Accum> extends ParseResult<
      infer Accum,
      infer Rem,
      infer Error
    >
    ? Error extends string
      ? ParseResult<Accum, Rem, Error>
      : NextToken<Rem> extends Token<"}", any, infer RemT>
      ? ParsePluralArgument2<RemT, Name, Selector, Accum>
      : ParseResult<
          Accum,
          Rem,
          `Unexpected token ${NextToken<Rem>[0]} (expected })`
        >
    : never
  : ParseResult<Accum, S, `Unexpected token ${NextToken<S>[0]} (expected {)`>;

type ParseElement<S extends string, Accum> = NextToken<S> extends Token<
  "identifier" | "number",
  infer Name,
  infer ST
>
  ? S extends HasWhitespace
    ? ParseResult<Accum, S, "No space allowed here">
    : CheckName<Name> extends ParseError<infer Error>
    ? ParseResult<Accum, S, Error>
    : NextToken<ST> extends Token<"/", any, infer STT>
    ? NextToken<STT> extends Token<">", any, infer STTT>
      ? STT extends HasWhitespace
        ? ParseResult<Accum, S, "No space allowed here">
        : ParseMessage<
            STTT,
            Accum & Record<CheckName<Name>, ComponentPlaceholder>
          >
      : ParseResult<
          Accum,
          S,
          `Unexpected token ${NextToken<STT>[0]} (expected >)`
        >
    : NextToken<ST> extends Token<">", any, infer STT>
    ? ParseMessage<STT, Accum> extends ParseResult<
        infer Accum,
        infer Rem,
        infer Error
      >
      ? Error extends string
        ? ParseResult<Accum, Rem, Error>
        : NextToken<Rem> extends Token<"<", any, infer RemT>
        ? NextToken<RemT> extends Token<"/", any, infer RemTT>
          ? RemT extends HasWhitespace
            ? ParseResult<Accum, S, "No space allowed here">
            : NextToken<RemTT> extends Token<
                "identifier" | "number",
                infer ClosingName,
                infer RemTTT
              >
            ? RemTT extends HasWhitespace
              ? ParseResult<Accum, S, "No space allowed here">
              : NextToken<RemTTT> extends Token<">", any, infer RemTTTT>
              ? NameEqual<Name, ClosingName> extends true
                ? ParseMessage<
                    RemTTTT,
                    Accum & Record<CheckName<Name>, ComponentPlaceholder>
                  >
                : ParseResult<
                    Accum,
                    Rem,
                    `Tag ${Name} closed with a different name: ${ClosingName}`
                  >
              : ParseResult<
                  Accum,
                  Rem,
                  `Unexpected token ${NextToken<RemTTT>[0]} (expected >)`
                >
            : ParseResult<
                Accum,
                Rem,
                `Unexpected token ${NextToken<RemTT>[0]} (expected number, identifier)`
              >
          : ParseResult<
              Accum,
              Rem,
              `Unexpected token ${NextToken<RemT>[0]} (expected /)`
            >
        : ParseResult<
            Accum,
            Rem,
            `Unexpected token ${NextToken<Rem>[0]} (expected <)`
          >
      : never
    : ParseResult<
        Accum,
        S,
        `Unexpected token ${NextToken<ST>[0]} (expected /, >)`
      >
  : ParseResult<
      Accum,
      S,
      `Unexpected token ${NextToken<S>[0]} (expected number, identifier)`
    >;

type CheckName<Name extends string> = Name extends "0"
  ? 0
  : Name extends `0${string}`
  ? ParseError<`Invalid number: ${Name}`>
  : Name extends `${Digit}${string}`
  ? CheckNumberImpl<Name>
  : Name;

type CheckNumber<Name extends string> = Name extends "0"
  ? 0
  : Name extends `0${string}`
  ? ParseError<`Invalid number: ${Name}`>
  : Name extends `${Digit}${string}`
  ? CheckNumberImpl<Name>
  : ParseError<`Invalid number: ${Name}`>;

type CheckNumberImpl<
  Name extends string,
  N extends string = Name
> = N extends `${infer NH}${infer NT}`
  ? NH extends Digit
    ? CheckNumberImpl<Name, NT>
    : ParseError<`Invalid number: ${Name}`>
  : N extends ""
  ? ParseNumber[Name]
  : never;

type Token<Kind extends string, Value extends string, S extends string> = [
  Kind,
  Value,
  S
];

type NextToken<S extends string> =
  SkipWhitespace<S> extends `offset:${infer ST}`
    ? Token<"offset:", "offset:", ST>
    : SkipWhitespace<S> extends `${Alpha}${string}`
    ? NextWord<SkipWhitespace<S>, "", "identifier">
    : SkipWhitespace<S> extends `${Digit}${string}`
    ? NextWord<SkipWhitespace<S>, "", "number">
    : SkipWhitespace<S> extends `::${infer ST}`
    ? Token<"::", "::", ST>
    : SkipWhitespace<S> extends `${infer SH}${infer ST}`
    ? Token<SH, SH, ST>
    : SkipWhitespace<S> extends ""
    ? Token<"EOF", "", "">
    : never;

type NextWord<
  S extends string,
  Name extends string,
  Kind extends string
> = S extends `${infer SH}${infer ST}`
  ? SH extends Alpha | Digit
    ? NextWord<ST, `${Name}${SH}`, Kind>
    : Token<Kind, Name, S>
  : S extends ""
  ? Token<Kind, Name, S>
  : never;

type HasWhitespace = `${Whitespace}${string}`;

type SkipWhitespace<S extends string> = S extends `${Whitespace}${infer ST}`
  ? SkipWhitespace<ST>
  : S;

type NameEqual<N1 extends string, N2 extends string> = N1 extends N2
  ? N2 extends N1
    ? true
    : false
  : false;

type ArgTypeMap = {
  number: number;
  date: Date;
  time: Date;
  spellout: number;
  ordinal: number;
  duration: number;
};

type Whitespace = " " | "\n" | "\r" | "\t";
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Alpha =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | "_";

type ParseNumber = {
  "0": 0;
  "1": 1;
  "2": 2;
  "3": 3;
  "4": 4;
  "5": 5;
  "6": 6;
  "7": 7;
  "8": 8;
  "9": 9;
  "10": 10;
  "11": 11;
  "12": 12;
  "13": 13;
  "14": 14;
  "15": 15;
  "16": 16;
  [key: string]: number;
};
