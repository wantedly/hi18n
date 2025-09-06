/**
 * @vitest-environment jsdom
 */

import React, { Suspense } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vitest } from "vitest";
import prettyFormat_, { plugins as prettyFormatPlugins } from "pretty-format";
import {
  Book,
  Catalog,
  Message,
  msg,
  translationId,
  TranslatorObject,
} from "@hi18n/core";
import { LocaleProvider, Translate, useI18n, useLocales } from "./index.js";
import { ComponentPlaceholder } from "@hi18n/core";
import { LocaleContext } from "@hi18n/react-context";

const prettyFormat = prettyFormat_ as {
  default: unknown;
} as unknown as typeof prettyFormat_.default;

type Vocabulary = {
  "example/greeting": Message;
  "example/greeting2": Message<{ name: string }>;
  "example/apples": Message<{ count: number }>;
  "example/link": Message<{ 0: ComponentPlaceholder }>;
  "example/link2": Message<{ link: ComponentPlaceholder }>;
  "example/multi": Message<{ strong: ComponentPlaceholder }>;
  "example/message-link": Message<{
    newMessages: number;
    messages: number;
    0: ComponentPlaceholder;
  }>;
};

const catalogJa = new Catalog<Vocabulary>("ja", {
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは、{name}さん!"),
  "example/apples": msg("リンゴは{count,number}個あります。"),
  "example/link": msg("<0>こちら</0>をクリック!"),
  "example/link2": msg("<link>こちら</link>をクリック!"),
  "example/multi": msg(
    "<strong>決定ボタン</strong>または<strong>Enter</strong>を押してください",
  ),
  "example/message-link": msg(
    "{newMessages,number}件のメッセージがあります。 <0>{messages,number}件の全てのメッセージを見る</0>",
  ),
});
const catalogEn = new Catalog<Vocabulary>("en", {
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, {name}!"),
  "example/apples": msg(
    "{count,plural,one{There is # apple.}other{There are # apples.}}",
  ),
  "example/link": msg("Click <0>here</0>!"),
  "example/link2": msg("Click <link>here</link>!"),
  "example/multi": msg(
    "Press the <strong>OK button</strong> or the <strong>Enter</strong> key.",
  ),
  "example/message-link": msg(
    "You have {newMessages,plural,one{# new message}other{# new messages}}. <0>See all the {messages,plural,one{# message}other{# messages}}</0>.",
  ),
});
const book = new Book<Vocabulary>({
  ja: catalogJa,
  en: catalogEn,
});

beforeEach(() => {
  cleanup();
});

describe("useLocales", () => {
  it("returns the t function", () => {
    const ListLocales: React.FC = () => {
      const locales = useLocales();
      return (
        <>
          {locales
            .map((locale, i) => `Locale ${i + 1} is ${locale}.`)
            .join(" ")}
        </>
      );
    };
    render(
      <LocaleProvider locales={["en", "ja", "zh-CN"]}>
        <ListLocales />
      </LocaleProvider>,
    );
    expect(
      screen.queryByText("Locale 1 is en. Locale 2 is ja. Locale 3 is zh-CN."),
    ).toBeInTheDocument();
  });

  it("returns the empty array by default", () => {
    const LocaleLength: React.FC = () => {
      const locales = useLocales();
      return <>It has {locales.length} locales in context.</>;
    };
    {
      render(
        <LocaleProvider locales={["en", "ja", "zh-CN"]}>
          <LocaleLength />
        </LocaleProvider>,
      );
      expect(
        screen.queryByText("It has 3 locales in context."),
      ).toBeInTheDocument();
      cleanup();
    }
    {
      render(
        <LocaleProvider locales={[]}>
          <LocaleLength />
        </LocaleProvider>,
      );
      expect(
        screen.queryByText("It has 0 locales in context."),
      ).toBeInTheDocument();
      cleanup();
    }
    {
      render(<LocaleLength />);
      expect(
        screen.queryByText("It has 0 locales in context."),
      ).toBeInTheDocument();
      cleanup();
    }
  });

  it("memoizes the array", () => {
    const localeObjects = new Set<string[]>();
    let increment: () => void = () => 0;
    const Counter: React.FC = () => {
      const [count, setCount] = React.useState<number>(0);
      increment = () => setCount((x) => x + 1);
      const locales = useLocales();
      localeObjects.add(locales);
      return <>count = {count}</>;
    };
    render(
      <LocaleProvider locales={["en", "ja", "zh-CN"]}>
        <Counter />
      </LocaleProvider>,
    );
    expect(screen.queryByText("count = 0")).toBeInTheDocument();
    act(() => increment());
    expect(screen.queryByText("count = 1")).toBeInTheDocument();
    act(() => increment());
    expect(screen.queryByText("count = 2")).toBeInTheDocument();
    expect(localeObjects.size).toBe(1);
  });

  it("is future-proof for when an array of strings is passed instead", () => {
    const LocaleLength: React.FC = () => {
      const locales = useLocales();
      return <>It has {locales.length} locales in context.</>;
    };
    {
      render(
        <LocaleContext.Provider
          value={["en", "ja", "zh-CN"] as string | string[] as string}
        >
          <LocaleLength />
        </LocaleContext.Provider>,
      );
      expect(
        screen.queryByText("It has 3 locales in context."),
      ).toBeInTheDocument();
      cleanup();
    }
    {
      render(
        <LocaleContext.Provider value={[] as string | string[] as string}>
          <LocaleLength />
        </LocaleContext.Provider>,
      );
      expect(
        screen.queryByText("It has 0 locales in context."),
      ).toBeInTheDocument();
      cleanup();
    }
  });
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
      </LocaleProvider>,
    );
    expect(
      screen.queryByRole("link", { name: /こんにちは!/i }),
    ).toBeInTheDocument();
  });

  it("memoizes the translator object", () => {
    const translatorObjects = new Set<TranslatorObject<Vocabulary>>();
    let increment: () => void = () => 0;
    const Counter: React.FC = () => {
      const [count, setCount] = React.useState<number>(0);
      increment = () => setCount((x) => x + 1);
      const i18n = useI18n(book);
      translatorObjects.add(i18n);
      return <>count = {count}</>;
    };
    render(
      <LocaleProvider locales={["en", "ja", "zh-CN"]}>
        <Counter />
      </LocaleProvider>,
    );
    expect(screen.queryByText("count = 0")).toBeInTheDocument();
    act(() => increment());
    expect(screen.queryByText("count = 1")).toBeInTheDocument();
    act(() => increment());
    expect(screen.queryByText("count = 2")).toBeInTheDocument();
    expect(translatorObjects.size).toBe(1);
  });

  it("suspends rendering if the locale is not available", async () => {
    const book = new Book<Vocabulary>({
      ja: () => Promise.resolve({ default: catalogJa }),
      en: () => Promise.resolve({ default: catalogEn }),
    });
    const Greeter: React.FC = () => {
      const { t } = useI18n(book);
      return <a href="#foo">{t("example/greeting")}</a>;
    };
    let container;
    act(() => {
      ({ container } = render(
        <LocaleProvider locales="ja">
          <Suspense fallback="not loaded yet">
            <Greeter />
          </Suspense>
        </LocaleProvider>,
      ));
    });
    expect(
      screen.queryByRole("link", { name: /こんにちは!/i }),
    ).not.toBeInTheDocument();
    expect(container).toHaveTextContent("not loaded yet");

    // Wait until loaded
    expect(
      await screen.findByRole("link", { name: /こんにちは!/i }),
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate book={book} id="example/link">
            <a href="https://example.com/" />
          </Translate>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/",
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate book={book} id="example/link2">
            <a key="link" href="https://example.com/" />
          </Translate>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/",
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/",
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }
  });

  it("renders a component interpolation with multiple occurrences of the same component", () => {
    const error = vitest.spyOn(console, "error");
    render(
      <LocaleProvider locales="ja">
        <Translate book={book} id="example/multi">
          <strong key="strong" />
        </Translate>
      </LocaleProvider>,
    );
    // React calls console.error() when key uniqueness is violated
    expect(error).not.toHaveBeenCalled();
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "5件のメッセージがあります。 10件の全てのメッセージを見る",
      );
      expect(
        screen.queryByRole("link", { name: /10件の全てのメッセージを見る/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /10件の全てのメッセージを見る/i }),
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "You have 1 new message. See all the 1 message.",
      );
      expect(
        screen.queryByRole("link", { name: /See all the 1 message/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 1 message/i }),
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "You have 1 new message. See all the 10 messages.",
      );
      expect(
        screen.queryByRole("link", { name: /See all the 10 messages/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 10 messages/i }),
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
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "You have 5 new messages. See all the 10 messages.",
      );
      expect(
        screen.queryByRole("link", { name: /See all the 10 messages/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 10 messages/i }),
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }
  });

  it("renders the node within renderInElement", () => {
    let node: React.ReactNode = [];
    const RecordNode: React.FC<{ children?: React.ReactNode | undefined }> = (
      props,
    ) => {
      node = props.children;
      return <>{props.children}</>;
    };
    const { container } = render(
      <LocaleProvider locales="ja">
        <Translate
          book={book}
          id="example/link"
          renderInElement={<RecordNode />}
        >
          <a href="https://example.com/" />
        </Translate>
      </LocaleProvider>,
    );

    expect(container).toHaveTextContent("こちらをクリック!");
    expect(screen.queryByRole("link", { name: /こちら/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
      "href",
      "https://example.com/",
    );
    // Ensure the node **after translation** had been passed
    expect(
      prettyFormat(node, { plugins: [prettyFormatPlugins.ReactElement] }),
    ).toEqual(
      prettyFormat(
        <>
          <a href="https://example.com/">こちら</a>をクリック!
        </>,
        { plugins: [prettyFormatPlugins.ReactElement] },
      ),
    );
  });

  it("suspends rendering if the locale is not available", async () => {
    const book = new Book<Vocabulary>({
      ja: () => Promise.resolve({ default: catalogJa }),
      en: () => Promise.resolve({ default: catalogEn }),
    });
    let container;
    act(() => {
      ({ container } = render(
        <LocaleProvider locales="ja">
          <Suspense fallback="not loaded yet">
            <Translate book={book} id="example/link">
              <a href="https://example.com/" />
            </Translate>
          </Suspense>
        </LocaleProvider>,
      ));
    });
    expect(
      screen.queryByRole("link", { name: /こちら/i }),
    ).not.toBeInTheDocument();
    expect(container).toHaveTextContent("not loaded yet");

    // Wait until loaded
    expect(
      await screen.findByRole("link", { name: /こちら/i }),
    ).toBeInTheDocument();
  });
});

describe("Translate.Dynamic", () => {
  it("renders a simple component interpolation", () => {
    const id = translationId(book, "example/link");

    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate.Dynamic book={book} id={id}>
            <a href="https://example.com/" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate.Dynamic book={book} id={id}>
            <a href="https://example.com/" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }
  });

  it("renders a named component interpolation", () => {
    const id = translationId(book, "example/link2");

    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate.Dynamic book={book} id={id}>
            <a key="link" href="https://example.com/" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate.Dynamic book={book} id={id}>
            <a key="link" href="https://example.com/" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate.Dynamic
            book={book}
            id={id}
            link={<a href="https://example.com/" />}
          />
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("こちらをクリック!");
      expect(
        screen.queryByRole("link", { name: /こちら/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /こちら/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate.Dynamic
            book={book}
            id={id}
            link={<a href="https://example.com/" />}
          />
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent("Click here!");
      expect(screen.queryByRole("link", { name: /here/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /here/i })).toHaveAttribute(
        "href",
        "https://example.com/",
      );
      cleanup();
    }
  });

  it("renders a component interpolation with plurals", () => {
    const id = translationId(book, "example/message-link");
    {
      const { container } = render(
        <LocaleProvider locales="ja">
          <Translate.Dynamic book={book} id={id} messages={10} newMessages={5}>
            <a href="https://example.com/messages" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "5件のメッセージがあります。 10件の全てのメッセージを見る",
      );
      expect(
        screen.queryByRole("link", { name: /10件の全てのメッセージを見る/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /10件の全てのメッセージを見る/i }),
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate.Dynamic book={book} id={id} messages={1} newMessages={1}>
            <a href="https://example.com/messages" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "You have 1 new message. See all the 1 message.",
      );
      expect(
        screen.queryByRole("link", { name: /See all the 1 message/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 1 message/i }),
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate.Dynamic book={book} id={id} messages={10} newMessages={1}>
            <a href="https://example.com/messages" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "You have 1 new message. See all the 10 messages.",
      );
      expect(
        screen.queryByRole("link", { name: /See all the 10 messages/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 10 messages/i }),
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }

    {
      const { container } = render(
        <LocaleProvider locales="en">
          <Translate.Dynamic book={book} id={id} messages={10} newMessages={5}>
            <a href="https://example.com/messages" />
          </Translate.Dynamic>
        </LocaleProvider>,
      );

      expect(container).toHaveTextContent(
        "You have 5 new messages. See all the 10 messages.",
      );
      expect(
        screen.queryByRole("link", { name: /See all the 10 messages/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /See all the 10 messages/i }),
      ).toHaveAttribute("href", "https://example.com/messages");
      cleanup();
    }
  });
});

describe("Translate.Todo", () => {
  it("renders a simple component interpolation", () => {
    const { container } = render(
      <LocaleProvider locales="ja">
        <Translate.Todo book={book} id="example/foobar">
          <a href="https://example.com/" />
        </Translate.Todo>
      </LocaleProvider>,
    );

    expect(container).toHaveTextContent("[TODO: example/foobar]");
  });
});
