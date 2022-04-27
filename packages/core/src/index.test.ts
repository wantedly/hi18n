/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */

import { describe, expect, it } from "@jest/globals";
import { Book, Catalog, Message, getTranslator, msg } from "./index";

type Vocabulary = {
  "example/greeting": Message;
  "example/greeting2": Message<{ name: string }>;
  "example/apples": Message<{ count: number }>;
};

const catalogJa = new Catalog<Vocabulary>({
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは、{name}さん!"),
  "example/apples": msg("リンゴは{count,number}個あります。"),
});
const catalogEn = new Catalog<Vocabulary>({
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, {name}!"),
  "example/apples": msg(
    "{count,plural,one{There is {count,number} apple.}other{There are {count,number} apples.}}"
  ),
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
