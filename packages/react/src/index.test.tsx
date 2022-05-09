import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { Book, Catalog, Message, msg } from "@hi18n/core";
import { LocaleProvider, Translate, useI18n } from "./index.js";
import { ComponentPlaceholder } from "@hi18n/core";

declare module "expect/build" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface Matchers<R extends void | Promise<void>>
    extends globalThis.jest.Matchers<R> {}
}

type Vocabulary = {
  "example/greeting": Message;
  "example/greeting2": Message<{ name: string }>;
  "example/apples": Message<{ count: number }>;
  "example/link": Message<{ 0: ComponentPlaceholder }>;
  "example/link2": Message<{ link: ComponentPlaceholder }>;
  "example/message-link": Message<{
    newMessages: number;
    messages: number;
    0: ComponentPlaceholder;
  }>;
};

const catalogJa = new Catalog<Vocabulary>({
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは、{name}さん!"),
  "example/apples": msg("リンゴは{count,number}個あります。"),
  "example/link": msg("<0>こちら</0>をクリック!"),
  "example/link2": msg("<link>こちら</link>をクリック!"),
  "example/message-link": msg(
    "{newMessages,number}件のメッセージがあります。 <0>{messages,number}件の全てのメッセージを見る</0>"
  ),
});
const catalogEn = new Catalog<Vocabulary>({
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, {name}!"),
  "example/apples": msg(
    "{count,plural,one{There is {count,number} apple.}other{There are {count,number} apples.}}"
  ),
  "example/link": msg("Click <0>here</0>!"),
  "example/link2": msg("Click <link>here</link>!"),
  "example/message-link": msg(
    "You have {newMessages,plural,one{{newMessages,number} new message}other{{newMessages,number} new messages}}. <0>See all the {messages,plural,one{{messages,number} message}other{{messages,number} messages}}</0>."
  ),
});
const book = new Book<Vocabulary>({
  ja: catalogJa,
  en: catalogEn,
});

describe("useI18n", () => {
  it("returns the t function", () => {
    const Greeter: React.FC = () => {
      const { t } = useI18n(book);
      return <a href="#foo">{t("example/greeting")}</a>;
    };
    render(
      <LocaleProvider locales="ja">
        <Greeter />
      </LocaleProvider>
    );
    expect(
      screen.queryByRole("link", { name: /こんにちは!/i })
    ).toBeInTheDocument();
  });
});

describe("Translate", () => {
  it("renders a simple component interpolation", () => {
    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate book={book} id="example/link">
            <a href="https://example.com/" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/"
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate book={book} id="example/link">
            <a href="https://example.com/" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/"
      );
      cleanup();
    }
  });

  it("renders a named component interpolation", () => {
    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate book={book} id="example/link2">
            <a key="link" href="https://example.com/" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/"
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate book={book} id="example/link2">
            <a key="link" href="https://example.com/" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/"
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate
            book={book}
            id="example/link2"
            link={<a href="https://example.com/" />}
          />
        </LocaleProvider>
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/"
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate
            book={book}
            id="example/link2"
            link={<a href="https://example.com/" />}
          />
        </LocaleProvider>
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/"
      );
      cleanup();
    }
  });

  it("renders a component interpolation with plurals", () => {
    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate
            book={book}
            id="example/message-link"
            messages={10}
            newMessages={5}
          >
            <a href="https://example.com/messages" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent(
        "5件のメッセージがあります。 10件の全てのメッセージを見る"
      );
      expect(
        screen.queryByRole("link", { name: /10件の全てのメッセージを見る/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /10件の全てのメッセージを見る/i })
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate
            book={book}
            id="example/message-link"
            messages={1}
            newMessages={1}
          >
            <a href="https://example.com/messages" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent(
        "You have 1 new message. See all the 1 message."
      );
      expect(
        screen.queryByRole("link", { name: /See all the 1 message/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 1 message/i })
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate
            book={book}
            id="example/message-link"
            messages={10}
            newMessages={1}
          >
            <a href="https://example.com/messages" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent(
        "You have 1 new message. See all the 10 messages."
      );
      expect(
        screen.queryByRole("link", { name: /See all the 10 messages/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 10 messages/i })
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate
            book={book}
            id="example/message-link"
            messages={10}
            newMessages={5}
          >
            <a href="https://example.com/messages" />
          </Translate>
        </LocaleProvider>
      );

      expect(container).toHaveTextContent(
        "You have 5 new messages. See all the 10 messages."
      );
      expect(
        screen.queryByRole("link", { name: /See all the 10 messages/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 10 messages/i })
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }
  });
});
