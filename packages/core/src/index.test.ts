/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "@jest/globals";
import {
  Book,
  Catalog,
  Message,
  getTranslator,
  msg,
  translationId,
  TranslationId,
} from "./index.js";

type Vocabulary = {
  "example/greeting": Message;
  "example/greeting2": Message<{ name: string }>;
  "example/apples": Message<{ count: number }>;
  "example/additional": Message;
  "example/date": Message<{ today: Date }>;
};

const catalogJa = new Catalog<Vocabulary>({
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは、{name}さん!"),
  "example/apples": msg("リンゴは{count,number}個あります。"),
  "example/additional": msg("日本限定企画!"),
  "example/date": msg("今日は{today,date}です。"),
});
const catalogEn = new Catalog<Vocabulary>({
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, {name}!"),
  "example/apples": msg(
    "{count,plural,one{There is # apple.}other{There are # apples.}}"
  ),
  // An example of not-yet-translated texts
  "example/additional": msg.todo("日本限定企画!"),
  "example/date": msg("Today is {today,date}."),
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
      "Missing translation in en for example/non-existent-translation-id"
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
    }).toThrow("Missing argument name (locale=en, id=example/greeting2)");
    expect(() => {
      // @ts-expect-error
      t("example/greeting2", {});
    }).toThrow("Missing argument name (locale=en, id=example/greeting2)");
  });

  it("raises an error for invalid argument types", () => {
    const { t } = getTranslator(book, "en");
    expect(() => {
      // @ts-expect-error
      t("example/greeting2", { name: 42 });
    }).toThrow(
      "Invalid argument name: expected string, got 42 (locale=en, id=example/greeting2)"
    );
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
    }).toThrow("timeZone not specified (locale=en, id=example/date)");
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
        "Missing translation in en for example/non-existent-translation-id"
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
      }).toThrow("Missing argument name (locale=en, id=example/greeting2)");
      expect(() => {
        // @ts-expect-error
        t.dynamic(id, {});
      }).toThrow("Missing argument name (locale=en, id=example/greeting2)");
    });

    it("raises an error for invalid argument types", () => {
      const id = translationId(book, "example/greeting2");
      const { t } = getTranslator(book, "en");
      expect(() => {
        // @ts-expect-error
        t.dynamic(id, { name: 42 });
      }).toThrow(
        "Invalid argument name: expected string, got 42 (locale=en, id=example/greeting2)"
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
