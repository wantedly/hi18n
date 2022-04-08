import React from 'react';
import { CatalogBase, I18n, MessageCatalog } from '@hi18n/core';

export const LocaleContext = /* #__PURE__ */ React.createContext<string>("");
/* #__PURE__ */ (LocaleContext.displayName = "LocaleContext");

export function useI18n<M extends CatalogBase>(catalog: MessageCatalog<M>): I18n<M> {
  const locale = React.useContext(LocaleContext);
  return catalog.getI18n(locale);
}

export const Translate: React.FC = () => {
  return <>Hello, world!</>;
};
