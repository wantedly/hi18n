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

type ParseMessageEOF<S extends string, Accum> =
  ParseMessage<S, Accum> extends ParseResult<infer Accum, infer Rem, infer Error> ?
    Error extends string ? ParseResult<Accum, Rem, Error> :
    Rem extends `${string}${infer _Rem}` ? ParseResult<Accum, Rem, "Found an unmatching }"> :
    Rem extends "" ? ParseResult<Accum, Rem, Error> :
    ParseResult<never, Rem, Error> :
  never;

type ParseMessage<S extends string, Accum> =
  S extends `}${string}` | "" ? ParseResult<Accum, S, undefined> :
  S extends `{${infer ST}` ? ParseArgument<ST, Accum> :
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
  S extends `${infer SH}${infer ST}` ?
    SH extends Whitespace ? ParseArgument<ST, Accum> :
    SH extends Alpha | Digit ? ParseArgument2<ST, SH, Accum> :
    ParseResult<Accum, S, "Unexpected token after {"> :
  S extends "" ? ParseResult<Accum, S, "Unexpected token after {"> :
  ParseResult<never, S, undefined>;

// After "{ foo"
type ParseArgument2<S extends string, Name extends string, Accum> =
  S extends `${infer SH}${infer ST}` ?
    SH extends Digit | Alpha ? ParseArgument2<ST, `${Name}${SH}`, Accum> :
    ParseArgument3<S, Name, Accum> :
  S extends "" ? ParseResult<Accum, S, "Unclosed argument"> :
  ParseResult<never, S, undefined>;

// After "{ foo " or "{ foo" (at the word boundary)
type ParseArgument3<S extends string, Name extends string, Accum> =
  S extends `${infer SH}${infer ST}` ?
    SH extends Whitespace ? ParseArgument3<ST, Name, Accum> :
    SH extends "," ?
      CheckName<Name> extends infer Result ?
        Result extends ParseError<infer Error> ? ParseResult<Accum, S, Error> :
        Result extends string | number ?  ParseArgument4<SkipWhitespace<ST>, Name, "", Accum> :
        never :
      never :
    SH extends "}" ?
      CheckName<Name> extends infer Result ?
        Result extends ParseError<infer Error> ? ParseResult<Accum, S, Error> :
        Result extends string | number ?  ParseMessage<ST, Accum & Record<Result, string>> :
        never :
      never :
    ParseResult<Accum, S, "Invalid character after argument name"> :
  S extends "" ? ParseResult<Accum, S, "Unclosed argument"> :
  ParseResult<never, S, undefined>;

// After "{foo,"
type ParseArgument4<S extends string, Name extends string, ArgType extends string, Accum> =
  S extends `${infer SH}${infer ST}` ?
    SH extends Digit | Alpha ? ParseArgument4<ST, Name, `${ArgType}${SH}`, Accum> :
    ParseArgument5<SkipWhitespace<S>, Name, ArgType, Accum> :
  S extends "" ? ParseArgument5<S, Name, ArgType, Accum> :
  ParseResult<never, S, undefined>;

// After "{foo,number" (word boundary)
type ParseArgument5<S extends string, Name extends string, ArgType extends string, Accum> =
  ArgType extends "choice" ? ParseResult<Accum, S, "choice is not supported"> :
  ArgType extends "plural" ? ParseResult<Accum, S, "Unimplemented: pluralArg"> :
  ArgType extends "select" | "selectordinal" ? ParseResult<Accum, S, "Unimplemented: selectArg"> :
  ArgType extends "" ? ParseResult<Accum, S, "Missing argType"> :
  ArgType extends "number" | "date" | "time" | "spellout" | "ordinal" | "duration" ?
    S extends `${infer SH}${infer ST}` ?
      SH extends "}" ? ParseMessage<ST, Accum & Record<Name, ArgTypeMap[ArgType]>>:
      SH extends "," ? ParseResult<Accum, S, "Unimplemented: argStyle"> :
      ParseResult<Accum, S, "Invalid character after argument type"> :
    S extends "" ? ParseResult<Accum, S, "Unclosed argument"> :
    never :
  ParseResult<Accum, S, `Invalid argType: ${ArgType}`> ;

type CheckName<Name extends string> =
  Name extends "0" ? 0 :
  Name extends `0${string}` ? ParseError<"Numbers cannot start with 0"> :
  Name extends `${Digit}${string}` ? CheckNumber<Name> :
  Name;

type CheckNumber<Name extends string, N extends string = Name> =
  N extends `${infer NH}${infer NT}` ?
    NH extends Digit ? CheckNumber<Name, NT> :
    ParseError<"Invalid character in a number"> :
  N extends "" ? ParseNumber[Name] :
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
