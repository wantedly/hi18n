import { CompiledMessage } from './msgfmt';
import { evaluateMessage } from './msgfmt-eval';
import { parseMessage } from './msgfmt-parser';
import type { ComponentPlaceholder, InferredMessageType } from "./msgfmt-parser-types";

export type { ComponentPlaceholder } from "./msgfmt-parser-types";

declare const messageBrandSymbol: unique symbol;
export type Message<Args = {}> = string & {
  [messageBrandSymbol]: (args: Args) => void;
};
export type CatalogBase = Record<string, Message<any>>;
export type MessageArguments<M extends Message<any>, C> = M extends Message<infer Args> ? InstantiateComponentTypes<Args, C> : never;
export type InstantiateComponentTypes<Args, C> = {
  [K in keyof Args]: InstantiateComponentType<Args[K], C>;
};
export type InstantiateComponentType<T, C> = T extends ComponentPlaceholder ? C : T;
export type SimpleMessageKeys<Messages extends CatalogBase, K extends string & keyof Messages = string & keyof Messages> =
  K extends unknown ? {} extends MessageArguments<Messages[K], never> ? K : never : never;

export function msg<S extends string>(s: S): InferredMessageType<S> {
  return s as any;
}

export class Book<Messages extends CatalogBase> {
  constructor(public readonly localCatalogs: Readonly<Record<string, LocalCatalog<Messages>>>) {
    for (const [locale, localCatalog] of Object.entries(localCatalogs)) {
      localCatalog.locale = locale;
    }
  }
}

export class LocalCatalog<Messages extends CatalogBase> {
  public locale?: string | undefined;
  private _compiled: Record<string, CompiledMessage> = {};
  constructor(public readonly data: Readonly<Messages>) {}

  getCompiledMessage(key: string & keyof Messages): CompiledMessage {
    if (!Object.prototype.hasOwnProperty.call(this._compiled, key)) {
      if (!Object.prototype.hasOwnProperty.call(this.data, key)) {
        throw new Error(`Missing translation in ${this.locale} for ${key}`);
      }
      const msg = this.data[key]!;
      this._compiled[key] = parseMessage(msg);
    }
    return this._compiled[key]!;
  }
}

export type TranslatorObject<Messages extends CatalogBase> = {
  t(key: SimpleMessageKeys<Messages>): string;
  t<K extends string & keyof Messages>(key: K, options: MessageArguments<Messages[K], never>): string;
  translateWithComponents<T, C, K extends string & keyof Messages>(key: K, interpolator: ComponentInterpolator<T, C>, options: MessageArguments<Messages[K], C>): T | string;
};

export type ComponentInterpolator<T, C> = {
  collect: (submessages: (T | string)[]) => T | string;
  wrap: (component: C, message: T | string | undefined) => T | string;
};

export function getTranslator<Messages extends CatalogBase>(book: Book<Messages>, locale: string): TranslatorObject<Messages> {
  const localCatalog = book.localCatalogs[locale];
  if (!localCatalog) throw new Error(`Missing locale: ${locale}`);

  return {
    t: <K extends string & keyof Messages>(key: K, options: MessageArguments<Messages[K], never> = {} as any) => {
      return evaluateMessage(localCatalog.getCompiledMessage(key), { key, locale, params: options });
    },
    translateWithComponents: <T, C, K extends string & keyof Messages>(key: K, interpolator: ComponentInterpolator<T, C>, options: MessageArguments<Messages[K], C>) => {
      return evaluateMessage<T>(
        localCatalog.getCompiledMessage(key),
        {
          key,
          locale,
          params: options,
          collect: interpolator.collect,
          wrap: interpolator.wrap as ComponentInterpolator<T, unknown>["wrap"],
        }
      );
    },
  };
}
