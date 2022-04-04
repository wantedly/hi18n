import type { Message } from "./index";

export type ParseResult<Accum, Rem extends string> = {
  Accum: Accum,
  Rem: Rem,
};

type Alpha =
  "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" |
  "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z" | "_";

export type InferredMessageType<S extends string> =
  InferredArgumentsInMessage<S, Message> extends ParseResult<infer Accum, ""> ?
    Accum[] extends Message<infer Args>[] ? Message<Args> : unknown :
    unknown;

type InferredArgumentsInMessage<S extends string, Accum extends Message<any>> =
  S extends `{${infer ST}` ? InferredArgumentsInInterpolation<ST, Accum> :
  S extends `${infer _SH}${infer ST}` ? InferredArgumentsInMessage<ST, Accum> :
  S extends "" ? ParseResult<Accum, S> :
  ParseResult<unknown, S>;

type InferredArgumentsInInterpolation<S extends string, Accum extends Message<any>> =
  S extends `${Alpha}${infer ST}` ?
    S extends `${infer SH}${ST}` ?
      InferredArgumentsInInterpolationArgName<ST, SH, Accum> :
      never :
  ParseResult<unknown, S>;

type InferredArgumentsInInterpolationArgName<S extends string, N extends string, Accum extends Message<any>> =
  S extends `${Alpha}${infer ST}` ?
    S extends `${infer SH}${ST}` ?
      InferredArgumentsInInterpolationArgName<ST, `${N}${SH}`, Accum> :
      never :
  S extends `}${infer ST}` ? InferredArgumentsInMessage<ST, Accum | Message<{ [K in N]: string }>> :
  ParseResult<unknown, S>;
