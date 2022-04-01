import React from 'react';

declare const messageBrandSymbol: unique symbol;
export type Message<Args = {}> = string & {
  [messageBrandSymbol]: (args: Args) => void;
};
export type CatalogBase = Record<string, Message<any>>;
export type MessageArguments<M extends Message<any>> = M extends Message<infer Args> ? Args : never;
export type SimpleMessageKeys<M extends CatalogBase, K extends keyof M = keyof M> =
  K extends unknown ? {} extends MessageArguments<M[K]> ? K : never : never;


type ParseResult<Accum, Rem extends string> = {
  Accum: Accum,
  Rem: Rem,
};

type Alpha =
  "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" |
  "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z" | "_";

type InferredMessageType<S extends string> =
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

export function msg<S extends string>(s: S): InferredMessageType<S> {
  return s as any;
}

export class MessageCatalog<M extends CatalogBase> {
  private _catalog: Record<string, M>;
  constructor(catalog: Record<string, M>) {
    this._catalog = catalog;
  }

  getI18n(locale: string): I18n<M> {
    const messages = this._catalog[locale];
    if (!messages) throw new Error(`Missing locale: ${locale}`);
    return {
      t: <K extends keyof M>(key: K, options: MessageArguments<M[K]> = {} as any) => {
        const msg = messages[key];
        if (!msg) throw new Error(`Missing translation in ${locale} for ${key}`);
        return msg.replace(/{(\w+)}/g, (_match, name?: string): string => {
          const value = options[name!];
          if (value === undefined) throw new Error(`Missing argument for ${key}: ${name}`);
          if (typeof value !== "string") throw new Error(`Invalid argument for ${key}: ${name}: ${value}`);
          return value;
        });
      }
    };
  }
}

interface I18n<M extends CatalogBase> {
  t(key: SimpleMessageKeys<M>): string;
  t<K extends keyof M>(key: K, options: MessageArguments<M[K]>): string;
}

export const LocaleContext = /* #__PURE__ */ React.createContext<string>("");
/* #__PURE__ */ (LocaleContext.displayName = "LocaleContext");

export function useI18n<M extends CatalogBase>(catalog: MessageCatalog<M>): I18n<M> {
  const locale = React.useContext(LocaleContext);
  return catalog.getI18n(locale);
}

export const Translate: React.FC = () => {
  return <>Hello, world!</>;
};
