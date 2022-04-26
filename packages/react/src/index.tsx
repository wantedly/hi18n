import React from 'react';
import { CatalogBase, TranslatorObject, MessageArguments, MessageCatalog, getTranslator } from '@hi18n/core';

export const LocaleContext = /* #__PURE__ */ React.createContext<string>("");
/* #__PURE__ */ (LocaleContext.displayName = "LocaleContext");

export function useI18n<M extends CatalogBase>(catalog: MessageCatalog<M>): TranslatorObject<M> {
  const locale = React.useContext(LocaleContext);
  return getTranslator(catalog, locale);
}

export type TranslateProps<M extends CatalogBase, K extends keyof M> = {
  catalog: MessageCatalog<M>;
  id: K;
  children?: React.ReactNode | undefined;
} & PartialForComponents<MessageArguments<M[K], React.ReactElement>>;

type PartialForComponents<T> = Partial<T> & Omit<T, ComponentKeys<T>>;
type ComponentKeys<T, K extends keyof T = keyof T> =
  K extends unknown ? T[K] extends React.ReactElement ? K : never : never;

export function Translate<M extends CatalogBase, K extends string & keyof M>(props: TranslateProps<M, K>): React.ReactElement | null {
  const { catalog, id, children, ...params } = props;
  extractComponents(children, params, { length: 0 });
  fillComponentKeys(params);
  const translator = useI18n(catalog);
  return (
    <>
      {
        translator.translateWithComponents<React.ReactNode, React.ReactElement, K>(
          id,
          { collect, wrap },
          params as any,
        )
      }
    </>
  );
};

// <Translate>foo<a/> <strong>bar</strong> </Translate> => { 0: <a/>, 1: <strong/> }
// <Translate><strong><em></em></strong></Translate> => { 0: <strong/>, 1: <em/> }
// <Translate><a key="foo" /> <button key="bar" /></Translate> => { foo: <a/>, bar: <button/> }
function extractComponents(node: React.ReactNode, params: Record<string | number, any>, state: { length: number }) {
  if (React.isValidElement(node)) {
    if (node.key != null) {
      params[node.key] = React.cloneElement(node, { key: node.key });
    } else {
      params[state.length] = React.cloneElement(node, { key: state.length });
      state.length++;
    }
    extractComponents(node.props.children, params, state);
  } else if (Array.isArray(node)) {
    for (const child of node) {
      extractComponents(child, params, state);
    }
  }
}

function fillComponentKeys(params: Record<string | number, any>) {
  for (const [key, value] of Object.entries(params)) {
    if (!React.isValidElement(value)) continue;
    if (value.key == null) {
      params[key] = React.cloneElement(value, { key });
    }
  }
}

function collect(submessages: React.ReactNode[]): React.ReactNode {
  return submessages;
}

function wrap(component: React.ReactElement, message: React.ReactNode): React.ReactNode {
  return React.cloneElement(component, {}, message);
}
