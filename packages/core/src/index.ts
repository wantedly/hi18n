import { CompiledMessage } from './msgfmt';
import { evaluateMessage } from './msgfmt-eval';
import { parseMessage } from './msgfmt-parser';
import type { ComponentPlaceholder, InferredMessageType } from "./msgfmt-parser-types";

export type { ComponentPlaceholder } from "./msgfmt-parser-types";

declare const messageBrandSymbol: unique symbol;
export type Message<Args = {}> = string & {
  [messageBrandSymbol]: (args: Args) => void;
};
export type VocabularyBase = Record<string, Message<any>>;
export type MessageArguments<M extends Message<any>, C> = M extends Message<infer Args> ? InstantiateComponentTypes<Args, C> : never;
export type InstantiateComponentTypes<Args, C> = {
  [K in keyof Args]: InstantiateComponentType<Args[K], C>;
};
export type InstantiateComponentType<T, C> = T extends ComponentPlaceholder ? C : T;
export type SimpleMessageKeys<Vocabulary extends VocabularyBase, K extends string & keyof Vocabulary = string & keyof Vocabulary> =
  K extends unknown ? {} extends MessageArguments<Vocabulary[K], never> ? K : never : never;

export function msg<S extends string>(s: S): InferredMessageType<S> {
  return s as any;
}

export class Book<Vocabulary extends VocabularyBase> {
  constructor(public readonly catalogs: Readonly<Record<string, Catalog<Vocabulary>>>) {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      catalog.locale = locale;
    }
  }
}

export class Catalog<Vocabulary extends VocabularyBase> {
  public locale?: string | undefined;
  private _compiled: Record<string, CompiledMessage> = {};
  constructor(public readonly data: Readonly<Vocabulary>) {}

  getCompiledMessage(id: string & keyof Vocabulary): CompiledMessage {
    if (!Object.prototype.hasOwnProperty.call(this._compiled, id)) {
      if (!Object.prototype.hasOwnProperty.call(this.data, id)) {
        throw new Error(`Missing translation in ${this.locale} for ${id}`);
      }
      const msg = this.data[id]!;
      this._compiled[id] = parseMessage(msg);
    }
    return this._compiled[id]!;
  }
}

export type TranslatorObject<Vocabulary extends VocabularyBase> = {
  t(id: SimpleMessageKeys<Vocabulary>): string;
  t<K extends string & keyof Vocabulary>(id: K, options: MessageArguments<Vocabulary[K], never>): string;
  translateWithComponents<T, C, K extends string & keyof Vocabulary>(id: K, interpolator: ComponentInterpolator<T, C>, options: MessageArguments<Vocabulary[K], C>): T | string;
};

export type ComponentInterpolator<T, C> = {
  collect: (submessages: (T | string)[]) => T | string;
  wrap: (component: C, message: T | string | undefined) => T | string;
};

export function getTranslator<Vocabulary extends VocabularyBase>(book: Book<Vocabulary>, locale: string): TranslatorObject<Vocabulary> {
  const catalog = book.catalogs[locale];
  if (!catalog) throw new Error(`Missing locale: ${locale}`);

  return {
    t: <K extends string & keyof Vocabulary>(id: K, options: MessageArguments<Vocabulary[K], never> = {} as any) => {
      return evaluateMessage(catalog.getCompiledMessage(id), { id, locale, params: options });
    },
    translateWithComponents: <T, C, K extends string & keyof Vocabulary>(id: K, interpolator: ComponentInterpolator<T, C>, options: MessageArguments<Vocabulary[K], C>) => {
      return evaluateMessage<T>(
        catalog.getCompiledMessage(id),
        {
          id,
          locale,
          params: options,
          collect: interpolator.collect,
          wrap: interpolator.wrap as ComponentInterpolator<T, unknown>["wrap"],
        }
      );
    },
  };
}
