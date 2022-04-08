import { describe, it } from "@jest/globals";
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
});
