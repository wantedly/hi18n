import { describe, expect, it } from "@jest/globals";
import { CompiledMessage } from "./msgfmt.js";
import { evaluateMessage } from "./msgfmt-eval.js";

describe("evaluageMessage", () => {
  it("evaluates a string", () => {
    expect(evaluateMessage("Hello, world!", { locale: "en" })).toBe(
      "Hello, world!"
    );
    expect(evaluateMessage("こんにちは世界!", { locale: "ja" })).toBe(
      "こんにちは世界!"
    );
  });

  it("evaluates an array", () => {
    expect(evaluateMessage(["Hello, ", "world!"], { locale: "en" })).toBe(
      "Hello, world!"
    );
    expect(evaluateMessage(["こんにちは", "世界!"], { locale: "ja" })).toBe(
      "こんにちは世界!"
    );
  });

  it("evaluates simple interpolation", () => {
    expect(
      evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], {
        locale: "en",
        params: { name: "John" },
      })
    ).toBe("Hello, John!");
    expect(() =>
      evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], {
        id: "greeting.named",
        locale: "en",
        params: {},
      })
    ).toThrow("Missing argument name (locale=en, id=greeting.named)");
    expect(() =>
      evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], {
        id: "greeting.named",
        locale: "en",
        params: { name: 42 },
      })
    ).toThrow(
      "Invalid argument name: expected string, got 42 (locale=en, id=greeting.named)"
    );
  });

  it("evaluates number interpolation", () => {
    const msg1: CompiledMessage = [
      { type: "Var", name: "count", argType: "number" },
      " apples",
    ];
    const msg2: CompiledMessage = [
      { type: "Var", name: "count", argType: "number" },
      " pommes",
    ];
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 42 } })).toBe(
      "42 apples"
    );
    expect(() => evaluateMessage(msg1, { locale: "en", params: {} })).toThrow(
      "Missing argument count (locale=en)"
    );
    expect(() =>
      evaluateMessage(msg1, { locale: "en", params: { count: "foo" } })
    ).toThrow("Invalid argument count: expected number, got foo (locale=en)");

    expect(
      evaluateMessage(msg1, { locale: "en", params: { count: 12345 } })
    ).toBe("12,345 apples");
    expect(
      evaluateMessage(msg2, { locale: "fr", params: { count: 12345 } })
    ).toBe("12\u202F345 pommes");
  });

  it("evaluates integer styles", () => {
    const msg1: CompiledMessage = {
      type: "Var",
      name: "foo",
      argType: "number",
      argStyle: "integer",
    };
    expect(evaluateMessage(msg1, { locale: "en", params: { foo: 42 } })).toBe(
      "42"
    );
    expect(evaluateMessage(msg1, { locale: "en", params: { foo: 42.1 } })).toBe(
      "42"
    );
  });

  it("evaluates percent styles", () => {
    const msg1: CompiledMessage = {
      type: "Var",
      name: "foo",
      argType: "number",
      argStyle: "percent",
    };
    expect(evaluateMessage(msg1, { locale: "en", params: { foo: 0.42 } })).toBe(
      "42%"
    );
  });

  it("evaluates plural interpolation", () => {
    const msg1: CompiledMessage = {
      type: "Plural",
      name: "count",
      branches: [
        {
          selector: "one",
          message: ["There is ", { type: "Number" }, " apple."],
        },
        {
          selector: "other",
          message: ["There are ", { type: "Number" }, " apples."],
        },
      ],
    };
    const msg2: CompiledMessage = {
      type: "Plural",
      name: "count",
      branches: [
        {
          selector: "one",
          message: ["Там ", { type: "Number" }, " яблоко."],
        },
        {
          selector: "few",
          message: ["Там ", { type: "Number" }, " яблока."],
        },
        {
          selector: "other",
          message: ["Там ", { type: "Number" }, " яблок."],
        },
      ],
    };
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 0 } })).toBe(
      "There are 0 apples."
    );
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 1 } })).toBe(
      "There is 1 apple."
    );
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 2 } })).toBe(
      "There are 2 apples."
    );
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 3 } })).toBe(
      "There are 3 apples."
    );
    expect(
      evaluateMessage(msg1, { locale: "en", params: { count: 12341 } })
    ).toBe("There are 12,341 apples.");
    expect(
      evaluateMessage(msg1, { locale: "en", params: { count: 12345 } })
    ).toBe("There are 12,345 apples.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 0 } })).toBe(
      "Там 0 яблок."
    );
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 1 } })).toBe(
      "Там 1 яблоко."
    );
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 3 } })).toBe(
      "Там 3 яблока."
    );
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 5 } })).toBe(
      "Там 5 яблок."
    );
    expect(
      evaluateMessage(msg2, { locale: "ru", params: { count: 12341 } })
    ).toBe("Там 12\xA0341 яблоко.");
    expect(
      evaluateMessage(msg2, { locale: "ru", params: { count: 12343 } })
    ).toBe("Там 12\xA0343 яблока.");
    expect(
      evaluateMessage(msg2, { locale: "ru", params: { count: 12345 } })
    ).toBe("Там 12\xA0345 яблок.");
  });

  it("evaluates component interpolation", () => {
    type DOMLike = string | DOMLike[] | ElementLike;
    type ElementLike =
      | {
          tag: "a";
          href?: string;
          children?: DOMLike | undefined;
        }
      | {
          tag: "strong";
          children?: DOMLike | undefined;
        };
    function collect(children: DOMLike): DOMLike {
      return children;
    }
    function wrap(component: unknown, message: DOMLike | undefined): DOMLike {
      return {
        ...(component as ElementLike),
        children: message,
      };
    }
    const msg1: CompiledMessage = [
      "Click ",
      {
        type: "Element",
        name: 0,
        message: "here",
      },
      "!",
    ];
    expect(
      evaluateMessage<DOMLike>(msg1, {
        locale: "en",
        params: {
          0: { tag: "a", href: "https://example.com" },
        },
        collect,
        wrap,
      })
    ).toEqual([
      "Click ",
      {
        tag: "a",
        href: "https://example.com",
        children: "here",
      },
      "!",
    ]);

    const msg2: CompiledMessage = [
      "You have ",
      {
        type: "Plural",
        name: "newMessages",
        branches: [
          {
            selector: "one",
            message: [
              {
                type: "Var",
                name: "newMessages",
                argType: "number",
              },
              " new message",
            ],
          },
          {
            selector: "other",
            message: [
              {
                type: "Var",
                name: "newMessages",
                argType: "number",
              },
              " new messages",
            ],
          },
        ],
      },
      ". ",
      {
        type: "Element",
        name: 0,
        message: [
          "See all the ",
          {
            type: "Plural",
            name: "messages",
            branches: [
              {
                selector: "one",
                message: [
                  {
                    type: "Var",
                    name: "messages",
                    argType: "number",
                  },
                  " message",
                ],
              },
              {
                selector: "other",
                message: [
                  {
                    type: "Var",
                    name: "messages",
                    argType: "number",
                  },
                  " messages",
                ],
              },
            ],
          },
        ],
      },
      ".",
    ];
    expect(
      evaluateMessage<DOMLike>(msg2, {
        locale: "en",
        params: {
          0: { tag: "a", href: "https://example.com" },
          newMessages: 1,
          messages: 1,
        },
        collect,
        wrap,
      })
    ).toEqual([
      "You have 1 new message. ",
      {
        tag: "a",
        href: "https://example.com",
        children: "See all the 1 message",
      },
      ".",
    ]);
    expect(
      evaluateMessage<DOMLike>(msg2, {
        locale: "en",
        params: {
          0: { tag: "a", href: "https://example.com" },
          newMessages: 1,
          messages: 2,
        },
        collect,
        wrap,
      })
    ).toEqual([
      "You have 1 new message. ",
      {
        tag: "a",
        href: "https://example.com",
        children: "See all the 2 messages",
      },
      ".",
    ]);
    expect(
      evaluateMessage<DOMLike>(msg2, {
        locale: "en",
        params: {
          0: { tag: "a", href: "https://example.com" },
          newMessages: 2,
          messages: 2,
        },
        collect,
        wrap,
      })
    ).toEqual([
      "You have 2 new messages. ",
      {
        tag: "a",
        href: "https://example.com",
        children: "See all the 2 messages",
      },
      ".",
    ]);
  });
});
