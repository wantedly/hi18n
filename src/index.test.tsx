import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from "@jest/globals";
import { Message, MessageCatalog, msg, Translate } from "./index";

declare module "expect/build/types" {
  export interface Matchers<R, T> extends globalThis.jest.Matchers<R, T> {}
}

type Messages = {
  "example/greeting": Message,
  "example/greeting2": Message<{ name: string }>,
};

const catalogJa: Messages = {
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは、{name}さん!"),
};
const catalogEn: Messages = {
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, {name}!"),
};
const catalog = new MessageCatalog({
  ja: catalogJa,
  en: catalogEn,
});

describe ("MessageCatalog", () => {
  it("generates translation", () => {
    {
      const { t } = catalog.getI18n("ja");
      expect(t("example/greeting")).toBe("こんにちは!")
    }
    {
      const { t } = catalog.getI18n("en");
      expect(t("example/greeting")).toBe("Hello!")
    }
  });

  it("raises an error for missing translation", () => {
    expect(() => {
      catalog.getI18n("zh")
    }).toThrow("Missing locale: zh");
  });

  it("raises an error for missing key", () => {
    const { t } = catalog.getI18n("en")
    expect(() => {
      // @ts-expect-error
      t("example/non-existent-key")
    }).toThrow("Missing translation in en for example/non-existent-key");
  });

  it("does a simple interpolation", () => {
    {
      const { t } = catalog.getI18n("ja");
      expect(t("example/greeting2", { name: "太郎"})).toBe("こんにちは、太郎さん!");
    }
    {
      const { t } = catalog.getI18n("en");
      expect(t("example/greeting2", { name: "Taro"})).toBe("Hello, Taro!");
    }
  });

  it("raises an error for missing arguments", () => {
    const { t } = catalog.getI18n("en")
    expect(() => {
      // @ts-expect-error
      t("example/greeting2")
    }).toThrow("Missing argument for example/greeting2: name");
    expect(() => {
      // @ts-expect-error
      t("example/greeting2", {})
    }).toThrow("Missing argument for example/greeting2: name");
  });

  it("raises an error for invalid argument types", () => {
    const { t } = catalog.getI18n("en")
    expect(() => {
      // @ts-expect-error
      t("example/greeting2", { name: 42 })
    }).toThrow("Invalid argument for example/greeting2: name: 42");
  });
});

function expectType<T>(_x: T) {}
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

describe("Translate", () => {
  it("renders", () => {
    const { container } = render(<Translate />);

    expect(container).toHaveTextContent("Hello, world!");
  });
});
