import React from "react";
import { LocaleContext } from "@hi18n/react-context";
import {
  Book,
  type VocabularyBase,
  type TranslationId,
  type TranslatorObject,
  type MessageArguments,
  getTranslator,
  type InstantiateComponentTypes,
  type ComponentInterpolator,
} from "@hi18n/core";

export { LocaleContext } from "@hi18n/react-context";

/**
 * Renders the children with the specified locale.
 *
 * @since 0.1.0 (`@hi18n/react`)
 *
 * @example
 *   ```tsx
 *   ReactDOM.render(
 *     root,
 *     <LocaleProvider locales="ja">
 *       <Translate id="example/greeting" book={book} />
 *     </LocaleProvider>
 *   );
 *   ```
 */
export const LocaleProvider: React.FC<{
  children?: React.ReactNode;
  /**
   * A list of locales in the order of preference.
   */
  locales: string | string[];
}> = (props) => {
  const { locales, children } = props;
  const concatenatedLocales = Array.isArray(locales)
    ? locales.join("\n")
    : locales;
  const memoizedLocales = React.useMemo(
    () => (concatenatedLocales === "" ? [] : concatenatedLocales.split("\n")),
    [concatenatedLocales],
  );
  return (
    <LocaleContext.Provider value={memoizedLocales}>
      {children}
    </LocaleContext.Provider>
  );
};
/**
 * Returns the locales from the context.
 *
 * @returns A list of locales in the order of preference.
 *
 * @since 0.1.2 (`@hi18n/react`)
 *
 * @example
 *   ```tsx
 *   const Greeting: React.FC = () => {
 *     const { t } = useI18n(book);
 *     return (
 *       <section>
 *         <h1>{t("example/greeting")}</h1>
 *         {
 *           messages.length > 0 &&
 *             <p>{t("example/messages", { count: messages.length })}</p>
 *         }
 *       </section>
 *     );
 *   };
 *   ```
 */
export function useLocales(): string[] {
  // Extending string -> string | readonly string[]
  // to future-proof changes in how context is propagated.
  // Also, removing "readonly" here to correctly type Array.isArray assertion.
  const localesConcat: string | string[] = React.useContext(LocaleContext) as
    | string
    | string[];
  const locales = React.useMemo(
    () =>
      Array.isArray(localesConcat)
        ? localesConcat
        : localesConcat === ""
          ? []
          : localesConcat.split("\n"),
    [localesConcat],
  );
  return locales;
}

/**
 * Retrieves translation helpers, using the locale from the context.
 *
 * If the catalog is not loaded yet, it suspends the component being
 * rendered. This is an **experimental API** which relies on React's
 * undocumented API for suspension.
 * To avoid this behavior,
 * initialize the Book statically or use preloadCatalog from @hi18n/core
 * to ensure the catalog is loaded before using this function.
 *
 * @param book A "book" object containing translated messages
 * @returns An object containing functions necessary for translation
 *
 * @since 0.1.0 (`@hi18n/react`)
 *
 * @example
 *   ```tsx
 *   const Greeting: React.FC = () => {
 *     const { t } = useI18n(book);
 *     return (
 *       <section>
 *         <h1>{t("example/greeting")}</h1>
 *         {
 *           messages.length > 0 &&
 *             <p>{t("example/messages", { count: messages.length })}</p>
 *         }
 *       </section>
 *     );
 *   };
 *   ```
 */
export function useI18n<M extends VocabularyBase>(
  book: Book<M>,
): TranslatorObject<M> {
  const locales = useLocales();
  const i18n = React.useMemo(
    () => getTranslator(book, locales, { throwPromise: true }),
    [book, locales],
  );
  return i18n;
}

export type BaseTranslateProps<
  Vocabulary extends VocabularyBase,
  K extends string,
> = {
  /**
   * The book to look up in for the translation.
   *
   * @since 0.1.0 (`@hi18n/react`)
   */
  book: Book<Vocabulary>;
  /**
   * The translation id.
   *
   * @since 0.1.0 (`@hi18n/react`)
   */
  id: K;
  /**
   * The children. hi18n searches for elements in the node and names each one in the following way:
   *
   * - If it has a `key` prop, use the value.
   * - Otherwise, give it a number in the order of occurrence of the opening tags starting with 0.
   *
   * They are merged into the props as the parameters for the translation.
   *
   * @since 0.1.0 (`@hi18n/react`)
   */
  children?: React.ReactNode | undefined;
  /**
   * When given, the results are wrapped in the element given.
   *
   * Note that you don't need to use the prop in most cases.
   * You can just wrap the `<Translate>` element in whatever wrapper components.
   *
   * One valid use case would be to pass a component that analyzes the texts or elements within the component,
   * such as one that splits texts using `Intl.Segmenter` for better word-wrapping experience.
   *
   * @since 0.1.2 (`@hi18n/react`)
   *
   * @example
   *   ```tsx
   *   <Translate book={book} id="example/greeting" renderInElement={<TextWrapper />}>
   *   </Translate>
   *   ```
   */
  renderInElement?: React.ReactElement | undefined;
};

export type TranslateProps<
  M extends VocabularyBase,
  K extends keyof M & string,
> = BaseTranslateProps<M, K> &
  PartialForComponents<MessageArguments<M[K], React.ReactElement>>;

type PartialForComponents<T> = Partial<T> & Omit<T, ComponentKeys<T>>;
type ComponentKeys<T, K extends keyof T = keyof T> = K extends unknown
  ? T[K] extends React.ReactElement
    ? K
    : never
  : never;

/**
 * Renders the translated message, possibly interleaved with the elements you provide.
 *
 * If the catalog is not loaded yet, it suspends the component being
 * rendered. This is an **experimental API** which relies on React's
 * undocumented API for suspension.
 * To avoid this behavior,
 * initialize the Book statically or use preloadCatalog from @hi18n/core
 * to ensure the catalog is loaded before rendering this component.
 *
 * @since 0.1.0 (`@hi18n/react`)
 *
 * @example
 *   ```tsx
 *   <Translate id="example/signin" book={book}>
 *     {
 *       // These elements are inserted into the translation.
 *     }
 *     <a href="" />
 *     <a href="" />
 *   </Translate>
 *   ```
 *
 * @example You can add a placeholder for readability.
 *   ```tsx
 *   <Translate id="example/signin" book={book}>
 *     You need to <a href="">sign in</a> or <a href="">sign up</a> to continue.
 *   </Translate>
 *   ```
 *
 * @example Naming the elements
 *   ```tsx
 *   <Translate id="example/signin" book={book}>
 *     <a key="signin" href="" />
 *     <a key="signup" href="" />
 *   </Translate>
 *   ```
 *
 * @example to supply non-component parameters, you can:
 *   ```tsx
 *   <Translate id="example/greeting" book={book} name={name} />
 *   ```
 *
 *   This is almost equivalent to the following:
 *   ```tsx
 *   const { t } = useI18n(book);
 *   return t("example/greeting", { name });
 *   ```
 */
export function Translate<M extends VocabularyBase, K extends string & keyof M>(
  props: TranslateProps<M, K>,
): React.ReactElement | null {
  const { book, id, children, renderInElement, ...params } = props;
  extractComponents(children, params, { length: 0 });
  fillComponentKeys(params);
  const translator = useI18n(book);
  const interpolator = getInterpolator();
  const translatedChildren = translator.translateWithComponents<
    React.ReactNode,
    React.ReactElement,
    K
  >(
    id,
    interpolator,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    params as any,
  );
  if (renderInElement) {
    return React.cloneElement(renderInElement, {}, <>{translatedChildren}</>);
  } else {
    return <>{translatedChildren}</>;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Translate {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export function Dynamic<Vocabulary extends VocabularyBase, Args = {}>(
    props: DynamicTranslateProps<Vocabulary, Args>,
  ): React.ReactElement | null;
  export function Todo<Vocabulary extends VocabularyBase>(
    props: TodoTranslateProps<Vocabulary>,
  ): React.ReactElement | null;
}

export type DynamicTranslateProps<
  Vocabulary extends VocabularyBase,
  Args,
> = BaseTranslateProps<Vocabulary, TranslationId<Vocabulary, Args>> &
  PartialForComponents<InstantiateComponentTypes<Args, React.ReactElement>>;

/**
 * A variant of {@link Translate} for dynamic translation keys
 *
 * @since 0.1.1 (`@hi18n/react`)
 *
 * @example
 *   ```tsx
 *   const id = translationId(book, "example/signin");
 *   <Translate.Dynamic id={id} book={book}>
 *     <a href="" />
 *     <a href="" />
 *   </Translate.Dynamic>
 *   ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
Translate.Dynamic = Translate as <Vocabulary extends VocabularyBase, Args = {}>(
  props: DynamicTranslateProps<Vocabulary, Args>,
) => React.ReactElement | null;

export type TodoTranslateProps<Vocabulary extends VocabularyBase> =
  BaseTranslateProps<Vocabulary, string> & {
    [key: string]: unknown;
  };

/**
 * A variant of {@link Translate} for translation bootstrap.
 *
 * At runtime, it just renders a TODO text.
 *
 * @since 0.1.1 (`@hi18n/react`)
 *
 * @example
 *   ```tsx
 *   <Translate.Todo id="example/message-to-work-on" book={book}>
 *   </Translate.Todo>
 *   ```
 */
Translate.Todo = function Todo<Vocabulary extends VocabularyBase>(
  props: TodoTranslateProps<Vocabulary>,
): React.ReactElement | null {
  return <>[TODO: {props.id}]</>;
} satisfies unknown;

// <Translate>foo<a/> <strong>bar</strong> </Translate> => { 0: <a/>, 1: <strong/> }
// <Translate><strong><em></em></strong></Translate> => { 0: <strong/>, 1: <em/> }
// <Translate><a key="foo" /> <button key="bar" /></Translate> => { foo: <a/>, bar: <button/> }
function extractComponents(
  node: React.ReactNode,
  params: Record<string | number, unknown>,
  state: { length: number },
) {
  if (React.isValidElement(node)) {
    if (node.key != null) {
      params[node.key] = React.cloneElement(node, { key: node.key });
    } else {
      params[state.length] = React.cloneElement(node, { key: state.length });
      state.length++;
    }
    extractComponents(
      (node.props as { children?: React.ReactElement }).children,
      params,
      state,
    );
  } else if (Array.isArray(node)) {
    for (const child of node) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      extractComponents(child, params, state);
    }
  }
}

function fillComponentKeys(params: Record<string | number, unknown>) {
  for (const [key, value] of Object.entries(
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    params as Record<string | number, {} | null | undefined>,
  )) {
    if (!React.isValidElement(value)) continue;
    if (value.key == null) {
      params[key] = React.cloneElement(value, { key });
    }
  }
}

function getInterpolator(): ComponentInterpolator<
  React.ReactNode,
  React.ReactElement
> {
  const keys: Record<string, number> = {};

  function generateKey(key: string): string {
    if (!hasOwn(keys, key)) {
      Object.defineProperty(keys, key, {
        value: 1,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    const id = keys[key]!++;
    if (id === 1 && !/\$/.test(key)) {
      return key;
    } else {
      return `${key}$${id}`;
    }
  }

  function collect(submessages: React.ReactNode[]): React.ReactNode {
    return submessages;
  }

  function wrap(
    component: React.ReactElement,
    message: React.ReactNode,
  ): React.ReactNode {
    const newKey = generateKey(`${component.key}`);
    return React.cloneElement(component, { key: newKey }, message);
  }

  return { collect, wrap };
}

function hasOwn(o: object, s: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(o, s);
}
