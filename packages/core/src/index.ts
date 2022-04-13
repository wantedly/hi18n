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
export type SimpleMessageKeys<M extends CatalogBase, K extends keyof M = keyof M> =
  K extends unknown ? {} extends MessageArguments<M[K], never> ? K : never : never;

export function msg<S extends string>(s: S): InferredMessageType<S> {
  return s as any;
}

export class MessageCatalog<M extends CatalogBase> {
  private _catalog: Record<string, M>;
  private _compiledMessages: Record<string, Record<string, CompiledMessage>>;
  constructor(catalog: Record<string, M>) {
    this._catalog = catalog;
    this._compiledMessages = {};
    for (const locale of Object.keys(catalog)) {
      this._compiledMessages[locale] = {};
    }
  }

  getI18n(locale: string): I18n<M> {
    const messages = this._catalog[locale];
    if (!messages) throw new Error(`Missing locale: ${locale}`);
    const compiledMessages = this._compiledMessages[locale]!;

    const getCompiledMessage = (key: string) => {
      if (!Object.prototype.hasOwnProperty.call(compiledMessages, key)) {
        if (!Object.prototype.hasOwnProperty.call(messages, key)) {
          throw new Error(`Missing translation in ${locale} for ${key}`);
        }
        const msg = messages[key]!;
        compiledMessages[key] = parseMessage(msg);
      }
      return compiledMessages[key]!;
    };

    return {
      t: <K extends keyof M>(key: K, options: MessageArguments<M[K], never> = {} as any) => {
        return evaluateMessage(getCompiledMessage(key as string), { key: key as string, locale, params: options });
      },
      translateWithComponents: <T, C, K extends keyof M>(key: K, interpolator: ComponentInterpolator<T, C>, options: MessageArguments<M[K], C>) => {
        return evaluateMessage<T>(
          getCompiledMessage(key as string),
          {
            key: key as string,
            locale,
            params: options,
            collect: interpolator.collect,
            wrap: interpolator.wrap as ComponentInterpolator<T, unknown>["wrap"],
          }
        );
      },
    };
  }
}

export interface I18n<M extends CatalogBase> {
  t(key: SimpleMessageKeys<M>): string;
  t<K extends keyof M>(key: K, options: MessageArguments<M[K], never>): string;
  translateWithComponents<T, C, K extends keyof M>(key: K, interpolator: ComponentInterpolator<T, C>, options: MessageArguments<M[K], C>): T | string;
}

export type ComponentInterpolator<T, C> = {
  collect: (submessages: (T | string)[]) => T | string;
  wrap: (component: C, message: T | string | undefined) => T | string;
};
