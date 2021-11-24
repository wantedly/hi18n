import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from "@jest/globals";
import { Message, MessageCatalog, msg, Translate } from "./index";

declare module "expect/build/types" {
  export interface Matchers<R, T> extends globalThis.jest.Matchers<R, T> {}
}

type Messages = {
  "example/greeting": Message,
  "example/greeting2": Message,
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
      t("example/non-existent-key" as any)
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
});

describe("Translate", () => {
  it("renders", () => {
    const { container } = render(<Translate />);

    expect(container).toHaveTextContent("Hello, world!");
  });
});
