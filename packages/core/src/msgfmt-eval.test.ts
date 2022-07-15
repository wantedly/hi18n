import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { CompiledMessage } from "./msgfmt.js";
import { evaluateMessage } from "./msgfmt-eval.js";
import { ErrorHandler } from "./error-handling.js";

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
    ).toThrow("Missing argument: name");
    expect(() =>
      evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], {
        id: "greeting.named",
        locale: "en",
        params: { name: 42 },
      })
    ).toThrow("Invalid argument name: expected string, got 42");
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
      "Missing argument: count"
    );
    expect(() =>
      evaluateMessage(msg1, { locale: "en", params: { count: "foo" } })
    ).toThrow("Invalid argument count: expected number, got foo");

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

  describe("when Intl.NumberFormat is missing", () => {
    const NumberFormat = Intl.NumberFormat;
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      Intl.NumberFormat = undefined as any;
    });
    afterEach(() => {
      Intl.NumberFormat = NumberFormat;
    });

    it("evaluates number interpolation", () => {
      const handleError = jest.fn<ErrorHandler>();
      const msg1: CompiledMessage = [
        { type: "Var", name: "count", argType: "number" },
        " apples",
      ];
      const msg2: CompiledMessage = [
        { type: "Var", name: "count", argType: "number" },
        " pommes",
      ];
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 42 },
          handleError,
        })
      ).toBe("42 apples");

      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 12345 },
          handleError,
        })
      ).toBe("12345 apples");
      expect(
        evaluateMessage(msg2, {
          locale: "fr",
          params: { count: 12345 },
          handleError,
        })
      ).toBe("12345 pommes");

      expect(handleError.mock.calls).toEqual([
        [new Error("Missing Intl.NumberFormat"), "warn"],
        [new Error("Missing Intl.NumberFormat"), "warn"],
        [new Error("Missing Intl.NumberFormat"), "warn"],
      ]);
    });

    it("evaluates integer styles", () => {
      const handleError = jest.fn<ErrorHandler>();
      const msg1: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "number",
        argStyle: "integer",
      };
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { foo: 42 },
          handleError,
        })
      ).toBe("42");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { foo: 42.1 },
          handleError,
        })
      ).toBe("42");

      expect(handleError.mock.calls).toEqual([
        [new Error("Missing Intl.NumberFormat"), "warn"],
        [new Error("Missing Intl.NumberFormat"), "warn"],
      ]);
    });
  });

  it("evaluates date interpolation", () => {
    const date = new Date(Date.UTC(2006, 0, 2, 22, 4, 5, 999));

    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "date",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("Jan 2, 2006");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "date",
        argStyle: "short",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("1/2/06");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "date",
        argStyle: "medium",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("Jan 2, 2006");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "date",
        argStyle: "long",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("January 2, 2006");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "date",
        argStyle: "full",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("Monday, January 2, 2006");
    }

    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "time",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("3:04:05 PM");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "time",
        argStyle: "short",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("3:04 PM");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "time",
        argStyle: "medium",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("3:04:05 PM");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "time",
        argStyle: "long",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("3:04:05 PM GMT-7");
    }
    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "time",
        argStyle: "full",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: date },
        })
      ).toBe("3:04:05 PM GMT-07:00");
    }
  });

  it("evaluates date interpolation if a date is faked", () => {
    const realDate = new Date(Date.UTC(2006, 0, 2, 22, 4, 5, 999));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateFake: any = {};
    for (const key of Object.getOwnPropertyNames(Date.prototype)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      dateFake[key] = (...args: any[]) => (realDate as any)[key](...args);
    }

    {
      const msg: CompiledMessage = {
        type: "Var",
        name: "foo",
        argType: "date",
      };
      expect(
        evaluateMessage(msg, {
          locale: "en",
          timeZone: "MST",
          params: { foo: dateFake },
        })
      ).toBe("Jan 2, 2006");
    }
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

  it("evaluates plural interpolation with offsets", () => {
    const msg1: CompiledMessage = {
      type: "Plural",
      name: "count",
      offset: 1,
      branches: [
        {
          selector: 0,
          message: ["Connected to no one"],
        },
        {
          selector: 1,
          message: ["Connected to ", { type: "Var", name: "name" }],
        },
        {
          selector: "one",
          message: [
            "Connected to ",
            { type: "Var", name: "name" },
            " and ",
            { type: "Number" },
            " other",
          ],
        },
        {
          selector: "other",
          message: [
            "Connected to ",
            { type: "Var", name: "name" },
            " and ",
            { type: "Number" },
            " others",
          ],
        },
      ],
    };
    expect(
      evaluateMessage(msg1, { locale: "en", params: { count: 0, name: "" } })
    ).toBe("Connected to no one");
    expect(
      evaluateMessage(msg1, {
        locale: "en",
        params: { count: 1, name: "John" },
      })
    ).toBe("Connected to John");
    expect(
      evaluateMessage(msg1, {
        locale: "en",
        params: { count: 2, name: "John" },
      })
    ).toBe("Connected to John and 1 other");
    expect(
      evaluateMessage(msg1, {
        locale: "en",
        params: { count: 3, name: "John" },
      })
    ).toBe("Connected to John and 2 others");
  });

  describe("when Intl.PluralRules is missing", () => {
    const PluralRules = Intl.PluralRules;
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (Intl as any).PluralRules = undefined as any;
    });
    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (Intl as any).PluralRules = PluralRules;
    });

    it("evaluates plural interpolation", () => {
      const handleError = jest.fn<ErrorHandler>();
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
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 0 },
          handleError,
        })
      ).toBe("There are 0 apples.");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 1 },
          handleError,
        })
      ).toBe("There are 1 apples.");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 2 },
          handleError,
        })
      ).toBe("There are 2 apples.");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 3 },
          handleError,
        })
      ).toBe("There are 3 apples.");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 12341 },
          handleError,
        })
      ).toBe("There are 12,341 apples.");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 12345 },
          handleError,
        })
      ).toBe("There are 12,345 apples.");
      expect(
        evaluateMessage(msg2, {
          locale: "ru",
          params: { count: 0 },
          handleError,
        })
      ).toBe("Там 0 яблок.");
      expect(
        evaluateMessage(msg2, {
          locale: "ru",
          params: { count: 1 },
          handleError,
        })
      ).toBe("Там 1 яблок.");
      expect(
        evaluateMessage(msg2, {
          locale: "ru",
          params: { count: 3 },
          handleError,
        })
      ).toBe("Там 3 яблок.");
      expect(
        evaluateMessage(msg2, {
          locale: "ru",
          params: { count: 5 },
          handleError,
        })
      ).toBe("Там 5 яблок.");
      expect(
        evaluateMessage(msg2, {
          locale: "ru",
          params: { count: 12341 },
          handleError,
        })
      ).toBe("Там 12\xA0341 яблок.");
      expect(
        evaluateMessage(msg2, {
          locale: "ru",
          params: { count: 12343 },
          handleError,
        })
      ).toBe("Там 12\xA0343 яблок.");
      expect(
        evaluateMessage(msg2, {
          locale: "ru",
          params: { count: 12345 },
          handleError,
        })
      ).toBe("Там 12\xA0345 яблок.");
    });

    it("evaluates plural interpolation with offsets", () => {
      const handleError = jest.fn<ErrorHandler>();
      const msg1: CompiledMessage = {
        type: "Plural",
        name: "count",
        offset: 1,
        branches: [
          {
            selector: 0,
            message: ["Connected to no one"],
          },
          {
            selector: 1,
            message: ["Connected to ", { type: "Var", name: "name" }],
          },
          {
            selector: "one",
            message: [
              "Connected to ",
              { type: "Var", name: "name" },
              " and ",
              { type: "Number" },
              " other",
            ],
          },
          {
            selector: "other",
            message: [
              "Connected to ",
              { type: "Var", name: "name" },
              " and ",
              { type: "Number" },
              " others",
            ],
          },
        ],
      };
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 0, name: "" },
          handleError,
        })
      ).toBe("Connected to no one");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 1, name: "John" },
          handleError,
        })
      ).toBe("Connected to John");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 2, name: "John" },
          handleError,
        })
      ).toBe("Connected to John and 1 others");
      expect(
        evaluateMessage(msg1, {
          locale: "en",
          params: { count: 3, name: "John" },
          handleError,
        })
      ).toBe("Connected to John and 2 others");
    });
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
