import { describe, expect, it } from "@jest/globals";
import { CompiledMessage } from "./msgfmt";
import { evaluateMessage } from "./msgfmt-eval";

describe("evaluageMessage", () => {
  it("evaluates a string", () => {
    expect(evaluateMessage("Hello, world!", { locale: "en" })).toBe("Hello, world!");
    expect(evaluateMessage("こんにちは世界!", { locale: "ja" })).toBe("こんにちは世界!");
  });

  it("evaluates an array", () => {
    expect(evaluateMessage(["Hello, ", "world!"], { locale: "en" })).toBe("Hello, world!");
    expect(evaluateMessage(["こんにちは", "世界!"], { locale: "ja" })).toBe("こんにちは世界!");
  });

  it("evaluates simple interpolation", () => {
    expect(evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], { locale: "en", params: { name: "John" } })).toBe("Hello, John!");
    expect(() => evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], { key: "greeting.named", locale: "en", params: {} })).toThrow("Missing argument name (locale=en, key=greeting.named)");
    expect(() => evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], { key: "greeting.named", locale: "en", params: { name: 42 } })).toThrow("Invalid argument name: expected string, got 42 (locale=en, key=greeting.named)");
  });

  it("evaluates number interpolation", () => {
    const msg1: CompiledMessage = [{ type: "Var", name: "count", argType: "number" }, " apples"];
    const msg2: CompiledMessage = [{ type: "Var", name: "count", argType: "number" }, " pommes"];
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 42 } })).toBe("42 apples");
    expect(() => evaluateMessage(msg1, { locale: "en", params: {} })).toThrow("Missing argument count (locale=en)");
    expect(() => evaluateMessage(msg1, { locale: "en", params: { count: "foo" } })).toThrow("Invalid argument count: expected number, got foo (locale=en)");

    expect(evaluateMessage(msg1, { locale: "en", params: { count: 12345 } })).toBe("12,345 apples");
    expect(evaluateMessage(msg2, { locale: "fr", params: { count: 12345 } })).toBe("12\u202F345 pommes");
  });

  it("evaluates plural interpolation", () => {
    const msg1: CompiledMessage = {
      type: "Plural",
      name: "count",
      branches: [
        {
          selector: "one",
          message: [
            "There is ",
            // TODO: use `#` later
            { type: "Var", name: "count", argType: "number" },
            " apple.",
          ],
        },
        {
          selector: "other",
          message: [
            "There are ",
            // TODO: use `#` later
            { type: "Var", name: "count", argType: "number" },
            " apples.",
          ],
        }
      ],
    };
    const msg2: CompiledMessage = {
      type: "Plural",
      name: "count",
      branches: [
        {
          selector: "one",
          message: [
            "Там ",
            // TODO: use `#` later
            { type: "Var", name: "count", argType: "number" },
            " яблоко.",
          ],
        },
        {
          selector: "few",
          message: [
            "Там ",
            // TODO: use `#` later
            { type: "Var", name: "count", argType: "number" },
            " яблока.",
          ],
        },
        {
          selector: "other",
          message: [
            "Там ",
            // TODO: use `#` later
            { type: "Var", name: "count", argType: "number" },
            " яблок.",
          ],
        }
      ],
    };
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 0 } })).toBe("There are 0 apples.");
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 1 } })).toBe("There is 1 apple.");
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 2 } })).toBe("There are 2 apples.");
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 3 } })).toBe("There are 3 apples.");
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 12341 } })).toBe("There are 12,341 apples.");
    expect(evaluateMessage(msg1, { locale: "en", params: { count: 12345 } })).toBe("There are 12,345 apples.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 0 } })).toBe("Там 0 яблок.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 1 } })).toBe("Там 1 яблоко.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 3 } })).toBe("Там 3 яблока.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 5 } })).toBe("Там 5 яблок.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 12341 } })).toBe("Там 12\xA0341 яблоко.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 12343 } })).toBe("Там 12\xA0343 яблока.");
    expect(evaluateMessage(msg2, { locale: "ru", params: { count: 12345 } })).toBe("Там 12\xA0345 яблок.");
  });
});
