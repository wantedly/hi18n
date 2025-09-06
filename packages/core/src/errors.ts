/**
 * An error for a specific message. It is thrown when:
 *
 * - the message is missing,
 * - the message contains a syntax error, or
 * - the message cannot be evaluated with the supplied parameters.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class MessageError extends Error {
  public override readonly cause: Error;
  public readonly locale?: string | undefined;
  public readonly id: string;
  static {
    this.prototype.name = "MessageError";
  }
  constructor(
    options: ErrorOptions & {
      cause: Error;
      locale?: string | undefined;
      id: string;
    },
  ) {
    const { locale, id, ...restOptions } = options;

    const inLocale = locale != null ? ` in ${locale}` : "";

    super(
      `Error translating ${id}${inLocale}: ${options.cause.message}`,
      restOptions,
    );
    this.locale = locale;
    this.id = id;
    this.cause ??= options.cause;
  }
}

/**
 * Missing translation. Usually wrapped in {@link MessageError}.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class MissingTranslationError extends Error {
  static {
    this.prototype.name = "MissingTranslationError";
  }
  constructor(message = "Missing translation", options?: ErrorOptions) {
    super(message, options);
  }
}

/**
 * No locale specified.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class NoLocaleError extends Error {
  static {
    this.prototype.name = "NoLocaleError";
  }
  constructor(message = "No locale specified", options?: ErrorOptions) {
    super(message, options);
  }
}

/**
 * Locale is specified, but no such locale exists in the book.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class MissingLocaleError extends Error {
  public readonly locale: string;
  public readonly availableLocales: readonly string[];
  static {
    this.prototype.name = "MissingLocaleError";
  }
  constructor(
    options: ErrorOptions & {
      locale: string;
      availableLocales: readonly string[];
    },
  ) {
    const { locale, availableLocales, ...restOptions } = options;

    super(`Missing locale: ${locale}`, restOptions);
    this.locale = locale;
    this.availableLocales = availableLocales;
  }
}

/**
 * Parse error. Usually wrapped in {@link MessageError}.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class ParseError extends Error {
  static {
    this.prototype.name = "ParseError";
  }
}

/**
 * An error during evaluating messages. Usually wrapped in {@link MessageError}.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class MessageEvaluationError extends Error {
  static {
    this.prototype.name = "MessageEvaluationError";
  }
}

/**
 * Missing translation argument. Usually wrapped in {@link MessageError}.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class MissingArgumentError extends MessageEvaluationError {
  public readonly argName: string | number;
  static {
    this.prototype.name = "MissingArgumentError";
  }
  constructor(
    options: ErrorOptions & {
      argName: string | number;
    },
  ) {
    const { argName, ...restOptions } = options;
    super(`Missing argument: ${argName}`, restOptions);
    this.argName = argName;
  }
}

/**
 * Translation argument type mismatch. Usually wrapped in {@link MessageError}.
 *
 * @since 0.1.7 (`@hi18n/core`)
 */
export class ArgumentTypeError extends MessageEvaluationError {
  public readonly argName: string | number;
  public readonly expectedType: string;
  public readonly got: unknown;
  static {
    this.prototype.name = "ArgumentTypeError";
  }
  constructor(
    options: ErrorOptions & {
      argName: string | number;
      expectedType: string;
      got: unknown;
    },
  ) {
    const { argName, expectedType, got, ...restOptions } = options;
    super(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Invalid argument ${argName}: expected ${expectedType}, got ${got}`,
      restOptions,
    );
    this.argName = argName;
    this.expectedType = expectedType;
    this.got = got;
  }
}
