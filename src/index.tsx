import React from 'react';

declare const messageBrandSymbol: unique symbol;
export type Message = string & {
  [messageBrandSymbol]: () => void;
};

export function msg(s: string): Message {
  return s as Message;
}

export class MessageCatalog<M extends Record<string, Message>> {
  private _catalog: Record<string, M>;
  constructor(catalog: Record<string, M>) {
    this._catalog = catalog;
  }

  getI18n(locale: string): I18n<M> {
    const messages = this._catalog[locale];
    if (!messages) throw new Error(`Missing locale: ${locale}`);
    return {
      t: (key: keyof M) => {
        const msg = messages[key];
        if (!msg) throw new Error(`Missing translation in ${locale} for ${key}`);
        return msg;
      }
    };
  }
}

interface I18n<M extends Record<string, Message>> {
  t(key: keyof M): string;
}

export const Translate: React.FC = () => {
  return <>Hello, world!</>;
};
