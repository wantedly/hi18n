export class MessageError extends Error {
  public override readonly cause: Error;
  public readonly locale?: string | undefined;
  public readonly id: string;
  static {
    this.prototype.name = this.name;
  }
  constructor(
    options: ErrorOptions & {
      cause: Error;
      locale?: string | undefined;
      id: string;
    }
  ) {
    const { locale, id, ...restOptions } = options;

    const inLocale = locale != null ? ` in ${locale}` : "";

    super(
      `Error translating ${id}${inLocale}: ${options.cause.message}`,
      restOptions
    );
    this.locale = locale;
    this.id = id;
    this.cause ??= options.cause;
  }
}

export class MissingTranslationError extends Error {
  static {
    this.prototype.name = this.name;
  }
  constructor(message = "Missing translation", options?: ErrorOptions) {
    super(message, options);
  }
}

export class NoLocaleError extends Error {
  static {
    this.prototype.name = this.name;
  }
  constructor(message = "No locale specified", options?: ErrorOptions) {
    super(message, options);
  }
}

export class MissingLocaleError extends Error {
  public readonly locale: string;
  public readonly availableLocales: readonly string[];
  static {
    this.prototype.name = this.name;
  }
  constructor(
    options: ErrorOptions & {
      locale: string;
      availableLocales: readonly string[];
    }
  ) {
    const { locale, availableLocales, ...restOptions } = options;

    super(`Missing locale: ${locale}`, restOptions);
    this.locale = locale;
    this.availableLocales = availableLocales;
  }
}

export class ParseError extends Error {
  static {
    this.prototype.name = this.name;
  }
}

export class MessageEvaluationError extends Error {
  static {
    this.prototype.name = this.name;
  }
}

export class MissingArgumentError extends MessageEvaluationError {
  public readonly argName: string | number;
  static {
    this.prototype.name = this.name;
  }
  constructor(
    options: ErrorOptions & {
      argName: string | number;
    }
  ) {
    const { argName, ...restOptions } = options;
    super(`Missing argument: ${argName}`, restOptions);
    this.argName = argName;
  }
}

export class ArgumentTypeError extends MessageEvaluationError {
  public readonly argName: string | number;
  public readonly expectedType: string;
  public readonly got: unknown;
  static {
    this.prototype.name = this.name;
  }
  constructor(
    options: ErrorOptions & {
      argName: string | number;
      expectedType: string;
      got: unknown;
    }
  ) {
    const { argName, expectedType, got, ...restOptions } = options;
    super(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Invalid argument ${argName}: expected ${expectedType}, got ${got}`,
      restOptions
    );
    this.argName = argName;
    this.expectedType = expectedType;
    this.got = got;
  }
}
