import type { Message } from "./index";

export type ParseResult<Accum, Rem extends string, Error extends string | undefined> = {
  Accum: Accum,
  Rem: Rem,
  Error: Error,
};

export type ParseError<Error extends string> = { error: Error };

export type InferredMessageType<S extends string> =
  ParseMessageEOF<S, {}> extends ParseResult<infer Accum, any, infer Error> ?
  Error extends string ? ParseError<Error> :
  Accum[] extends never[] ? unknown :
  Message<Accum> :
  unknown;

type ValidArgType = "number" | "date" | "time" | "spellout" | "ordinal" | "duration";

type ParseMessageEOF<S extends string, Accum> =
  ParseMessage<S, Accum> extends ParseResult<infer Accum, infer Rem, infer Error> ?
    Error extends string ? ParseResult<Accum, Rem, Error> :
    Rem extends `${string}${infer _Rem}` ? ParseResult<Accum, Rem, "Found an unmatching }"> :
    Rem extends "" ? ParseResult<Accum, Rem, Error> :
    ParseResult<never, Rem, Error> :
  never;

type ParseMessage<S extends string, Accum> =
  S extends `}${string}` | "" ? ParseResult<Accum, S, undefined> :
  S extends `{${infer ST}` ? ParseArgument<SkipWhitespace<ST>, Accum> :
  S extends `'${infer ST}` ?
    ST extends `'${infer STT}` ? ParseMessage<STT, Accum> :
    ST extends `{${string}` | `}${string}` ? ParseQuoted<ST, Accum> :
    ParseMessage<ST, Accum> :
  S extends `${string}${infer ST}` ? ParseMessage<ST, Accum> :
  ParseResult<never, S, undefined>;

// After "'"
type ParseQuoted<S extends string, Accum> =
  S extends `''${infer ST}` ? ParseQuoted<ST, Accum> :
  S extends `'${infer ST}` ? ParseMessage<ST, Accum> :
  S extends "" ? ParseResult<Accum, S, "Unclosed quoted string"> :
  S extends `${string}${infer ST}` ? ParseQuoted<ST, Accum> :
  ParseResult<never, S, undefined>;

// After '{ '
type ParseArgument<S extends string, Accum> =
  NextToken<S> extends Token<"identifier" | "number", infer Name, infer ST> ?
    CheckName<Name> extends ParseError<infer Error> ? ParseResult<Accum, S, Error> :
    NextToken<SkipWhitespace<ST>> extends Token<"}", any, infer STT> ? ParseMessage<STT, Accum & Record<CheckName<Name>, string>> :
    NextToken<SkipWhitespace<ST>> extends Token<",", any, infer STT> ?
      NextToken<SkipWhitespace<STT>> extends Token<"identifier", "choice", any> ? ParseResult<Accum, S, "choice is not supported"> :
      NextToken<SkipWhitespace<STT>> extends Token<"identifier", "plural", any> ? ParseResult<Accum, S, "Unimplemented: pluralArg"> :
      NextToken<SkipWhitespace<STT>> extends Token<"identifier", "select" | "selectordinal", any> ? ParseResult<Accum, S, "Unimplemented: selectArg"> :
      NextToken<SkipWhitespace<STT>> extends Token<"identifier", ValidArgType, infer STTT> ?
        NextToken<SkipWhitespace<STTT>> extends Token<"}", any, infer STTTT> ? ParseMessage<STTTT, Accum & Record<CheckName<Name>, ArgTypeMap[NextToken<SkipWhitespace<STT>>[1]]>> :
        NextToken<SkipWhitespace<STTT>> extends Token<",", any, any> ? ParseResult<Accum, S, "Unimplemented: argStyle"> :
        ParseResult<Accum, S, `Unexpected token ${NextToken<SkipWhitespace<STTT>>[0]} (expected }, ,)`> :
      NextToken<SkipWhitespace<STT>> extends Token<"identifier", any, any> ? ParseResult<Accum, S, `Invalid argType: ${NextToken<SkipWhitespace<STT>>[1]}`> :
      ParseResult<Accum, S, `Unexpected token ${NextToken<SkipWhitespace<STT>>[0]} (expected identifier)`>:
    ParseResult<Accum, S, `Unexpected token ${NextToken<SkipWhitespace<ST>>[0]} (expected }, ,)`> :
  ParseResult<Accum, S, `Unexpected token ${NextToken<S>[0]} (expected number, identifier)`>;

type CheckName<Name extends string> =
  Name extends "0" ? 0 :
  Name extends `0${string}` ? ParseError<`Invalid number: ${Name}`> :
  Name extends `${Digit}${string}` ? CheckNumber<Name> :
  Name;

type CheckNumber<Name extends string, N extends string = Name> =
  N extends `${infer NH}${infer NT}` ?
    NH extends Digit ? CheckNumber<Name, NT> :
    ParseError<`Invalid number: ${Name}`> :
  N extends "" ? ParseNumber[Name] :
  never;

type Token<Kind extends string, Value extends string, S extends string> =
  [Kind, Value, S];

type NextToken<S extends string> =
  S extends `offset:${infer ST}` ? Token<"offset:", "offset:", ST> :
  S extends `${Alpha}${string}` ? NextWord<S, "", "identifier"> :
  S extends `${Digit}${string}` ? NextWord<S, "", "number"> :
  S extends `=${Alpha | Digit}${string}` ?
    S extends `=${infer ST}` ? NextWord<ST, "=", "=number"> : never :
  S extends `${infer SH}${infer ST}` ? Token<SH, SH, ST> :
  S extends "" ? Token<"EOF", "", ""> :
  never;

type NextWord<S extends string, Name extends string, Kind extends string> =
  S extends `${infer SH}${infer ST}` ?
    SH extends Alpha | Digit ? NextWord<ST, `${Name}${SH}`, Kind> :
    Token<Kind, Name, S> :
  S extends "" ? Token<Kind, Name, S> :
  never;

type SkipWhitespace<S extends string> =
  S extends `${Whitespace}${infer ST}` ? SkipWhitespace<ST> : S;

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
  "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" |
  "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z" | "_";

type ParseNumber = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  "11": 11,
  "12": 12,
  "13": 13,
  "14": 14,
  "15": 15,
  "16": 16,
  [key: string]: number,
};
