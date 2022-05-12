/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */

import { CompiledMessage } from "./msgfmt.js";
import { evaluateMessage } from "./msgfmt-eval.js";
import { parseMessage } from "./msgfmt-parser.js";
import type {
  ComponentPlaceholder,
  InferredMessageType,
} from "./msgfmt-parser-types.js";

export type { ComponentPlaceholder } from "./msgfmt-parser-types.js";

declare const messageBrandSymbol: unique symbol;
declare const translationIdBrandSymbol: unique symbol;

/**
 * A subtype of `string` that represents translation messages.
 *
 * @param Args parameters required by this message
 */
export type Message<Args = {}> = string & {
  [messageBrandSymbol]: (args: Args) => void;
};

/**
 * A base type for a vocabulary.
 *
 * A vocabulary here means a set of translation ids required for this book of translations.
 */
export type VocabularyBase = Record<string, Message<any>>;

/**
 * Extracts parameters required by the translated message.
 *
 * @param M the message being instantiated.
 * @param C replacement for the component interpolation (like `<0></0>` or `<link></link>`).
 */
export type MessageArguments<
  M extends Message<any>,
  C
> = InstantiateComponentTypes<AbstractMessageArguments<M>, C>;

export type AbstractMessageArguments<M extends Message<any>> =
  M extends Message<infer Args> ? Args : never;

export type InstantiateComponentTypes<Args, C> = {
  [K in keyof Args]: InstantiateComponentType<Args[K], C>;
};
export type InstantiateComponentType<T, C> = T extends ComponentPlaceholder
  ? C
  : T;

/**
 * A subtype of `string` that represents a dynamically-managed translation id.
 *
 * @param Vocabulary the vocabulary type of the Book it refers to
 * @param Args parameters required by this message
 */
export type TranslationId<
  Vocabulary extends VocabularyBase,
  Args = {}
> = string & {
  [translationIdBrandSymbol]: (catalog: Vocabulary, args: Args) => void;
};

/**
 * Extracts the translation ids that don't take parameters.
 *
 * @param Vocabulary the vocabulary, a set of translation ids we can use for this book of translations.
 * @param K a dummy parameter to do a union distribution
 */
export type SimpleMessageKeys<
  Vocabulary extends VocabularyBase,
  K extends string & keyof Vocabulary = string & keyof Vocabulary
> = K extends unknown
  ? {} extends MessageArguments<Vocabulary[K], never>
    ? K
    : never
  : never;

/**
 * Infers the appropriate type for the translated message.
 *
 * At runtime, it just returns the first argument.
 *
 * @param s the translated message
 * @returns the first argument
 *
 * @example
 *   ```ts
 *   export default new Book<Vocabulary>({
 *     "example/greeting": msg("Hello, {name}!"),
 *   });
 *   ```
 */
export function msg<S extends string>(s: S): InferredMessageType<S> {
  return s as InferredMessageType<S>;
}

/**
 * Marks a translation id as dynamically used with {@link CompoundTranslatorFunction.dynamic t.dynamic}.
 *
 * At runtime, it just returns the second argument.
 *
 * @param book the book the id is linked to. Just discarded at runtime.
 * @param id the translation id.
 * @returns the second argument
 *
 * @example
 *   ```ts
 *   const menus = [
 *     {
 *       url: "https://example.com/home",
 *       titleId: translationId(book, "example/navigation/home"),
 *     },
 *     {
 *       url: "https://example.com/map",
 *       titleId: translationId(book, "example/navigation/map"),
 *     },
 *   ];
 *
 *   const { t } = getTranslator(book, "en");
 *   t.dynamic(menus[i].titleId);
 *   ```
 */
export function translationId<
  Vocabulary extends VocabularyBase,
  K extends string & keyof Vocabulary
>(
  book: Book<Vocabulary>,
  id: K
): TranslationId<Vocabulary, AbstractMessageArguments<Vocabulary[K]>> {
  const _book = book;
  return id as string as TranslationId<
    Vocabulary,
    AbstractMessageArguments<Vocabulary[K]>
  >;
}

/**
 * A set of translated messages, containing translations for all supported locales.
 *
 * In other words, a book is a set of {@link Catalog}s for all languages.
 *
 * @example
 *   ```ts
 *   type Vocabulary = {
 *     "example/greeting": Message<{ name: string }>;
 *   };
 *   export const book = new Book<Vocabulary>({
 *     en: catalogEn,
 *     ja: catalogJa,
 *   });
 *   ```
 */
export class Book<Vocabulary extends VocabularyBase> {
  constructor(
    public readonly catalogs: Readonly<Record<string, Catalog<Vocabulary>>>
  ) {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      catalog.locale = locale;
    }
  }
}

/**
 * A set of translated messages for a specific locale.
 *
 * @example
 *   ```ts
 *   type Vocabulary = {
 *     "example/greeting": Message<{ name: string }>;
 *   };
 *   export default new Catalog<Vocabulary>({
 *     "example/greeting": msg("Hello, {name}!"),
 *   });
 *   ```
 */
export class Catalog<Vocabulary extends VocabularyBase> {
  public locale?: string | undefined;
  private _compiled: Record<string, CompiledMessage> = {};
  constructor(public readonly data: Readonly<Vocabulary>) {}

  getCompiledMessage(id: string & keyof Vocabulary): CompiledMessage {
    if (!Object.prototype.hasOwnProperty.call(this._compiled, id)) {
      if (!Object.prototype.hasOwnProperty.call(this.data, id)) {
        throw new Error(
          `Missing translation in ${
            this.locale ?? "<unknown locale>"
          } for ${id}`
        );
      }
      const msg = this.data[id]!;
      this._compiled[id] = parseMessage(msg);
    }
    return this._compiled[id]!;
  }
}

/**
 * An object returned from {@link getTranslator}.
 */
export type TranslatorObject<Vocabulary extends VocabularyBase> = {
  /**
   * Returns the translated message.
   *
   * @example
   *   ```ts
   *   const { t } = getTranslator(book, "en");
   *   t("example/greeting-simple"); // => "Hello!"
   *   ```
   */
  t: CompoundTranslatorFunction<Vocabulary>;

  /**
   * Similar to {@link TranslatorObject.t} but allows component interpolation
   * (i.e. to interpret commands like `<0>foo</0>` or `<link>foo</link>`)
   *
   * Users usually don't need to call it manually.
   * See the `@hi18n/react` package for its application to React.
   *
   * @param id the id of the translation
   * @param interpolator functions to customize the interpolation behavior
   * @param options the parameters of the translation.
   */
  translateWithComponents<T, C, K extends string & keyof Vocabulary>(
    id: K,
    interpolator: ComponentInterpolator<T, C>,
    options: MessageArguments<Vocabulary[K], C>
  ): T | string;
};

type CompoundTranslatorFunction<Vocabulary extends VocabularyBase> =
  TranslatorFunction<Vocabulary> & {
    /**
     * Returns the translated message for a dynamic id.
     *
     * @example
     *   ```ts
     *   const { t } = getTranslator(book, "en");
     *   t.dynamic(menus[i].titleId); // => "Map"
     *   ```
     */
    dynamic: DynamicTranslatorFunction<Vocabulary>;

    /**
     * Declares a translation to be made.
     *
     * At runtime, it returns the first argument.
     *
     * @param id the id of the translation
     * @param options the parameters of the translation.
     * @example
     *   ```ts
     *   const { t } = getTranslator(book, "en");
     *   t.todo("example/greeting-simple"); // => "[TODO: example/greeting-simple]"
     *   ```
     */
    todo(id: string, options?: Record<string, unknown>): string;
  };

type TranslatorFunction<Vocabulary extends VocabularyBase> = {
  /**
   * Returns the translated message for a simple one.
   *
   * @param id the id of the translation
   * @example
   *   ```ts
   *   const { t } = getTranslator(book, "en");
   *   t("example/greeting-simple"); // => "Hello!"
   *   ```
   */
  (id: SimpleMessageKeys<Vocabulary>): string;

  /**
   * Returns the translated message.
   *
   * @param id the id of the translation
   * @param options the parameters of the translation.
   *
   * @example
   *   ```ts
   *   const { t } = getTranslator(book, "en");
   *   t("example/greeting", { name: "John" }); // => "Hello, John!"
   *   ```
   */
  <K extends string & keyof Vocabulary>(
    id: K,
    options: MessageArguments<Vocabulary[K], never>
  ): string;
};

type DynamicTranslatorFunction<Vocabulary extends VocabularyBase> = {
  /**
   * Returns the translated message for a simple dynamic id.
   *
   * @param id the id of the translation
   * @example
   *   ```ts
   *   const { t } = getTranslator(book, "en");
   *   t.dynamic(menus[i].titleId); // => "Map"
   *   ```
   */
  (id: TranslationId<Vocabulary, {}>): string;

  /**
   * Returns the translated message for a dynamic id.
   *
   * @param id the id of the translation
   * @param options the parameters of the translation.
   *
   * @example
   *   ```ts
   *   const { t } = getTranslator(book, "en");
   *   t.dynamic(greetings[i].translationId, { name: "John" }); // => "Hello, John!"
   *   ```
   */
  <Args>(
    id: TranslationId<Vocabulary, Args>,
    options: InstantiateComponentTypes<Args, never>
  ): string;
};

/**
 * Used in {@link TranslatorObject.translateWithComponents} to customize
 * the behavior of component interpolation.
 */
export type ComponentInterpolator<T, C> = {
  collect: (submessages: (T | string)[]) => T | string;
  wrap: (component: C, message: T | string | undefined) => T | string;
};

/**
 * Retrieves the translation helpers from the book and the locales.
 *
 * @param book the "book" (i.e. the set of translations) containing the desired messages.
 * @param locale a locale or a list of locale in the order of preference (the latter being not supported yet)
 * @returns A set of translation helpers
 *
 * @example
 *   ```ts
 *   const { t } = getTranslator(book, "en");
 *   t("example/greeting-simple"); // => "Hello!"
 *   ```
 */
export function getTranslator<Vocabulary extends VocabularyBase>(
  book: Book<Vocabulary>,
  locale: string
): TranslatorObject<Vocabulary> {
  const catalog = book.catalogs[locale];
  if (!catalog) throw new Error(`Missing locale: ${locale}`);

  const t = (id: string, options: Record<string, unknown> = {}) => {
    return evaluateMessage(catalog.getCompiledMessage(id), {
      id,
      locale,
      params: options,
    });
  };
  t.dynamic = t;
  t.todo = (id: string) => {
    return `[TODO: ${id}]`;
  };

  return {
    t: t as CompoundTranslatorFunction<Vocabulary>,
    translateWithComponents: <T, C, K extends string & keyof Vocabulary>(
      id: K,
      interpolator: ComponentInterpolator<T, C>,
      options: MessageArguments<Vocabulary[K], C>
    ) => {
      return evaluateMessage<T>(catalog.getCompiledMessage(id), {
        id,
        locale,
        params: options,
        collect: interpolator.collect,
        wrap: interpolator.wrap as ComponentInterpolator<T, unknown>["wrap"],
      });
    },
  };
}
