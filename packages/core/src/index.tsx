import React from 'react';
import { CompiledMessage } from './msgfmt';
import { evaluateMessage } from './msgfmt-eval';
import { parseMessage } from './msgfmt-parser';
import type { InferredMessageType } from "./msgfmt-parser-types";

declare const messageBrandSymbol: unique symbol;
export type Message<Args = {}> = string & {
  [messageBrandSymbol]: (args: Args) => void;
};
export type CatalogBase = Record<string, Message<any>>;
export type MessageArguments<M extends Message<any>> = M extends Message<infer Args> ? Args : never;
export type SimpleMessageKeys<M extends CatalogBase, K extends keyof M = keyof M> =
  K extends unknown ? {} extends MessageArguments<M[K]> ? K : never : never;

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
    return {
      t: <K extends keyof M>(key: K, options: MessageArguments<M[K]> = {} as any) => {
        if (!Object.prototype.hasOwnProperty.call(compiledMessages, key)) {
          if (!Object.prototype.hasOwnProperty.call(messages, key)) {
            throw new Error(`Missing translation in ${locale} for ${key}`);
          }
          const msg = messages[key]!;
          compiledMessages[key as string] = parseMessage(msg);
        }
        return evaluateMessage(compiledMessages[key as string]!, key as string, options);
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
