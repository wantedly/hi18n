/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */

import { describe, expect, it, jest } from "@jest/globals";
import {
  Book,
  Catalog,
  Message,
  getTranslator,
  msg,
  translationId,
  TranslationId,
  MissingLocaleError,
  NoLocaleError,
  ErrorHandler,
  MessageError,
  MissingTranslationError,
  ArgumentTypeError,
} from "./index.js";

type Vocabulary = {
  "example/greeting": Message;
  "example/greeting2": Message<{ name: string }>;
  "example/apples": Message<{ count: number }>;
  "example/additional": Message;
  "example/date": Message<{ today: Date }>;
  "example/date2": Message<{ today: Date }>;
};

const catalogJa = new Catalog<Vocabulary>("ja", {
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは、{name}さん!"),
  "example/apples": msg("リンゴは{count,number}個あります。"),
  "example/additional": msg("日本限定企画!"),
  "example/date": msg("今日は{today,date}です。"),
  "example/date2": msg("今日は{today,date,::MMMMdjmm}です。"),
});
const catalogEn = new Catalog<Vocabulary>("en", {
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, {name}!"),
  "example/apples": msg(
    "{count,plural,one{There is # apple.}other{There are # apples.}}"
  ),
  // An example of not-yet-translated texts
  "example/additional": msg.todo("日本限定企画!"),
  "example/date": msg("Today is {today,date}."),
  "example/date2": msg("Today is {today,date,::MMMMdjmm}."),
});
const book = new Book<Vocabulary>({
  ja: catalogJa,
  en: catalogEn,
});

describe("Book", () => {
  it("generates translation", () => {
    {
      const { t } = getTranslator(book, "ja");
      expect(t("example/greeting")).toBe("こんにちは!");
    }
    {
      const { t } = getTranslator(book, "en");
      expect(t("example/greeting")).toBe("Hello!");
    }
  });

  it("raises an error for missing translation language", () => {
    expect(() => {
      getTranslator(book, "zh");
    }).toThrow("Missing locale: zh");
  });

  it("raises an error for empty locale list", () => {
    expect(() => {
      getTranslator(book, []);
    }).toThrow("No locale specified");
  });

  it("uses the first specified locale", () => {
    {
      const { t } = getTranslator(book, ["ja", "en"]);
      expect(t("example/greeting")).toBe("こんにちは!");
    }
    {
      const { t } = getTranslator(book, ["en", "ja"]);
      expect(t("example/greeting")).toBe("Hello!");
    }
  });

  it("raises an error for missing translation id", () => {
    const { t } = getTranslator(book, "en");
    expect(() => {
      // @ts-expect-error
      t("example/non-existent-translation-id");
    }).toThrow(
      "Error translating example/non-existent-translation-id in en: Missing translation"
    );
  });

  it("does a simple interpolation", () => {
    {
      const { t } = getTranslator(book, "ja");
      expect(t("example/greeting2", { name: "太郎" })).toBe(
        "こんにちは、太郎さん!"
      );
    }
    {
      const { t } = getTranslator(book, "en");
      expect(t("example/greeting2", { name: "Taro" })).toBe("Hello, Taro!");
    }
  });

  it("does plural interpolation", () => {
    {
      const { t } = getTranslator(book, "ja");
      expect(t("example/apples", { count: 1 })).toBe("リンゴは1個あります。");
      expect(t("example/apples", { count: 12345 })).toBe(
        "リンゴは12,345個あります。"
      );
    }
    {
      const { t } = getTranslator(book, "en");
      expect(t("example/apples", { count: 1 })).toBe("There is 1 apple.");
      expect(t("example/apples", { count: 12345 })).toBe(
        "There are 12,345 apples."
      );
    }
  });

  it("raises an error for missing arguments", () => {
    const { t } = getTranslator(book, "en");
    expect(() => {
      // @ts-expect-error
      t("example/greeting2");
    }).toThrow(
      "Error translating example/greeting2 in en: Missing argument: name"
    );
    expect(() => {
      // @ts-expect-error
      t("example/greeting2", {});
    }).toThrow(
      "Error translating example/greeting2 in en: Missing argument: name"
    );
  });

  it("raises an error for invalid argument types", () => {
    const { t } = getTranslator(book, "en");
    expect(() => {
      // @ts-expect-error
      t("example/greeting2", { name: 42 });
    }).toThrow(
      "Error translating example/greeting2 in en: Invalid argument name: expected string, got 42"
    );
  });

  it("evaluates datetime", () => {
    // Only a limited locale is supported
    if (/v14/.test(process.version)) return;
    const date = new Date(Date.UTC(2006, 0, 2, 22, 4, 5, 999));
    {
      const { t } = getTranslator(book, "en");
      expect(t("example/date", { today: date, timeZone: "MST" })).toBe(
        "Today is Jan 2, 2006."
      );
      expect(t("example/date2", { today: date, timeZone: "MST" })).toBe(
        /v16/.test(process.version)
          ? "Today is January 2, 3:04 PM."
          : "Today is January 2 at 3:04 PM."
      );
    }
    {
      const { t } = getTranslator(book, "ja");
      expect(t("example/date", { today: date, timeZone: "MST" })).toBe(
        "今日は2006/01/02です。"
      );
      expect(t("example/date2", { today: date, timeZone: "MST" })).toBe(
        "今日は1月2日 15:04です。"
      );
    }
    {
      const { t } = getTranslator(book, "ja");
      expect(t("example/date", { today: date, timeZone: "JST" })).toBe(
        "今日は2006/01/03です。"
      );
      expect(t("example/date2", { today: date, timeZone: "JST" })).toBe(
        "今日は1月3日 7:04です。"
      );
    }
  });

  it("raises an error for missing timeZone parameter", () => {
    const { t } = getTranslator(book, "en");
    const date = new Date(Date.UTC(2006, 0, 2, 22, 4, 5, 999));
    expect(t("example/date", { today: date, timeZone: "MST" })).toBe(
      "Today is Jan 2, 2006."
    );
    expect(() => {
      // @ts-expect-error
      t("example/date", { today: date });
    }).toThrow(
      "Error translating example/date in en: Missing argument: timeZone"
    );
  });

  describe("dynamic translation", () => {
    it("generates translation", () => {
      const id = translationId(book, "example/greeting");
      {
        const { t } = getTranslator(book, "ja");
        expect(t.dynamic(id)).toBe("こんにちは!");
      }
      {
        const { t } = getTranslator(book, "en");
        expect(t.dynamic(id)).toBe("Hello!");
      }
    });

    it("raises an error for missing translation id", () => {
      const id: TranslationId<Vocabulary> = translationId(
        book,
        // @ts-expect-error
        "example/non-existent-translation-id"
      );
      const { t } = getTranslator(book, "en");
      expect(() => {
        t.dynamic(id);
      }).toThrow(
        "Error translating example/non-existent-translation-id in en: Missing translation"
      );
    });

    it("does a simple interpolation", () => {
      const id = translationId(book, "example/greeting2");
      {
        const { t } = getTranslator(book, "ja");
        expect(t.dynamic(id, { name: "太郎" })).toBe("こんにちは、太郎さん!");
      }
      {
        const { t } = getTranslator(book, "en");
        expect(t.dynamic(id, { name: "Taro" })).toBe("Hello, Taro!");
      }
    });

    it("does plural interpolation", () => {
      const id = translationId(book, "example/apples");
      {
        const { t } = getTranslator(book, "ja");
        expect(t.dynamic(id, { count: 1 })).toBe("リンゴは1個あります。");
        expect(t.dynamic(id, { count: 12345 })).toBe(
          "リンゴは12,345個あります。"
        );
      }
      {
        const { t } = getTranslator(book, "en");
        expect(t.dynamic(id, { count: 1 })).toBe("There is 1 apple.");
        expect(t.dynamic(id, { count: 12345 })).toBe(
          "There are 12,345 apples."
        );
      }
    });

    it("raises an error for missing arguments", () => {
      const id = translationId(book, "example/greeting2");
      const { t } = getTranslator(book, "en");
      expect(() => {
        // @ts-expect-error
        t.dynamic(id);
      }).toThrow(
        "Error translating example/greeting2 in en: Missing argument: name"
      );
      expect(() => {
        // @ts-expect-error
        t.dynamic(id, {});
      }).toThrow(
        "Error translating example/greeting2 in en: Missing argument: name"
      );
    });

    it("raises an error for invalid argument types", () => {
      const id = translationId(book, "example/greeting2");
      const { t } = getTranslator(book, "en");
      expect(() => {
        // @ts-expect-error
        t.dynamic(id, { name: 42 });
      }).toThrow(
        "Error translating example/greeting2 in en: Invalid argument name: expected string, got 42"
      );
    });
  });

  describe("translation bootstrapping", () => {
    it("Returns placeholder", () => {
      const { t } = getTranslator(book, "ja");
      expect(t.todo("example/greeting")).toBe("[TODO: example/greeting]");
      expect(t.todo("example/greeting2")).toBe("[TODO: example/greeting2]");
      expect(t.todo("example/foobar")).toBe("[TODO: example/foobar]");
    });

    it("Discards parameters", () => {
      const { t } = getTranslator(book, "ja");
      expect(t.todo("example/greeting", { name: "John" })).toBe(
        "[TODO: example/greeting]"
      );
      expect(t.todo("example/greeting2", { name: "John" })).toBe(
        "[TODO: example/greeting2]"
      );
      expect(t.todo("example/foobar", { name: "John" })).toBe(
        "[TODO: example/foobar]"
      );
    });
  });

  describe("handleError", () => {
    it("without implicitLocale, doesn't handle errors when locale is missing", () => {
      const handleError = jest.fn<ErrorHandler>();
      const book = new Book<Vocabulary>(
        {
          ja: catalogJa,
          en: catalogEn,
        },
        { handleError }
      );
      expect(() => getTranslator(book, [])).toThrow(NoLocaleError);
      expect(handleError).not.toHaveBeenCalled();
    });

    it("with implicitLocale, handles errors when locale is missing", () => {
      const handleError = jest.fn<ErrorHandler>();
      const book = new Book<Vocabulary>(
        {
          ja: catalogJa,
          en: catalogEn,
        },
        { handleError, implicitLocale: "en" }
      );
      expect(() => getTranslator(book, [])).not.toThrow();
      expect(handleError).toHaveBeenCalledWith(new NoLocaleError(), "error");

      const { t } = getTranslator(book, []);
      expect(t("example/greeting")).toBe("Hello!");
    });

    it("without implicitLocale, doesn't handle errors when locale is invalid", () => {
      const handleError = jest.fn<ErrorHandler>();
      const book = new Book<Vocabulary>(
        {
          ja: catalogJa,
          en: catalogEn,
        },
        { handleError }
      );
      expect(() => getTranslator(book, "foo")).toThrow(
        new MissingLocaleError({
          locale: "foo",
          availableLocales: ["ja", "en"],
        })
      );
      expect(handleError).not.toHaveBeenCalled();
    });

    it("with implicitLocale, handles errors when locale is invalid", () => {
      const handleError = jest.fn<ErrorHandler>();
      const book = new Book<Vocabulary>(
        {
          ja: catalogJa,
          en: catalogEn,
        },
        { handleError, implicitLocale: "en" }
      );
      expect(() => getTranslator(book, ["foo"])).not.toThrow();
      expect(handleError).toHaveBeenCalledWith(
        new MissingLocaleError({
          locale: "foo",
          availableLocales: ["ja", "en"],
        }),
        "error"
      );

      const { t } = getTranslator(book, ["foo"]);
      expect(t("example/greeting")).toBe("Hello!");
    });

    it("handles errors when translation is missing", () => {
      const handleError = jest.fn<ErrorHandler>();
      const book = new Book<Vocabulary>(
        {
          ja: catalogJa,
          en: catalogEn,
        },
        { handleError }
      );

      const { t } = getTranslator(book, "en");
      // @ts-expect-error it is deliberate
      expect(t("example/nonexistent")).toBe("[example/nonexistent]");

      expect(handleError).toHaveBeenCalledWith(
        new MessageError({
          cause: new MissingTranslationError(),
          id: "example/nonexistent",
          locale: "en",
        }),
        "error"
      );
    });

    it("handles errors when it failed to evaluate translations", () => {
      const handleError = jest.fn<ErrorHandler>();
      const book = new Book<Vocabulary>(
        {
          ja: catalogJa,
          en: catalogEn,
        },
        { handleError }
      );

      const { t } = getTranslator(book, "en");
      // @ts-expect-error it is deliberate
      expect(t("example/greeting2", { name: null })).toBe(
        "[example/greeting2]"
      );

      expect(handleError).toHaveBeenCalledWith(
        new MessageError({
          cause: new ArgumentTypeError({
            argName: "name",
            expectedType: "string",
            got: null,
          }),
          id: "example/greeting2",
          locale: "en",
        }),
        "error"
      );
    });
  });
});

function expectType<T>(_x: T) {
  /* Nothing to do */
}
expectType<Message>(msg("foo"));

// Translation with unintended arguments
{
  // @ts-expect-error
  expectType<Message>(msg("{name}"));
  // @ts-expect-error
  expectType<Message<{ value: string }>>(msg("{name}"));
}

// Too general translation
{
  // @ts-expect-error
  expectType<Message>(msg("message" as string));
}

// Broken translation
{
  // @ts-expect-error
  expectType<Message>(msg("{}"));
  // @ts-expect-error
  expectType<Message>(msg("{nam"));
  // @ts-expect-error
  expectType<Message<any>>(msg("{2nd}"));
  // @ts-expect-error
  expectType<Message<any>>(msg("{name foo}"));
}
