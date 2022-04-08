import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from "@jest/globals";
import { Message, MessageCatalog, msg } from '@hi18n/core';
import { LocaleContext, Translate, useI18n } from "./index";

declare module "expect/build/types" {
  export interface Matchers<R, T> extends globalThis.jest.Matchers<R, T> {}
}

type Messages = {
  "example/greeting": Message,
  "example/greeting2": Message<{ name: string }>,
  "example/apples": Message<{ count: number }>,
};

const catalogJa: Messages = {
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは、{name}さん!"),
  "example/apples": msg("リンゴは{count,number}個あります。"),
};
const catalogEn: Messages = {
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, {name}!"),
  "example/apples": msg("{count,plural,one{There is {count,number} apple.}other{There are {count,number} apples.}}"),
};
const catalog = new MessageCatalog({
  ja: catalogJa,
  en: catalogEn,
});

describe("useI18n", () => {
  it("returns the t function", () => {
    const Greeter: React.FC = () => {
      const { t } = useI18n(catalog);
      return <a href="#foo">{t("example/greeting")}</a>;
    };
    render(
      <LocaleContext.Provider value="ja">
        <Greeter />
      </LocaleContext.Provider>
    );
    expect(screen.queryByRole('link', { name: /こんにちは!/i })).toBeInTheDocument();
  });
});

describe("Translate", () => {
  it("renders", () => {
    const { container } = render(<Translate />);

    expect(container).toHaveTextContent("Hello, world!");
  });
});
