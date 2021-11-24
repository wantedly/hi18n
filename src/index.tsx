import React from 'react';

declare const messageBrandSymbol: unique symbol;
export type Message<Args = {}> = string & {
  [messageBrandSymbol]: (args: Args) => void;
};
export type CatalogBase = Record<string, Message<any>>;
export type MessageArguments<M extends Message<any>> = M extends Message<infer Args> ? Args : never;
export type SimpleMessageKeys<M extends CatalogBase, K extends keyof M = keyof M> =
  K extends unknown ? {} extends MessageArguments<M[K]> ? K : never : never;

export function msg(s: string): Message<any> {
  return s as Message<any>;
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

export const Translate: React.FC = () => {
  return <>Hello, world!</>;
};
