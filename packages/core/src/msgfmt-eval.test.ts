import { describe, it } from "@jest/globals";
import { evaluateMessage } from "./msgfmt-eval";

describe("evaluageMessage", () => {
  it("evaluates a string", () => {
    expect(evaluateMessage("Hello, world!", "greeting", {})).toBe("Hello, world!");
    expect(evaluateMessage("こんにちは世界!", "greeting", {})).toBe("こんにちは世界!");
  });

  it("evaluates an array", () => {
    expect(evaluateMessage(["Hello, ", "world!"], "greeting", {})).toBe("Hello, world!");
    expect(evaluateMessage(["こんにちは", "世界!"], "greeting", {})).toBe("こんにちは世界!");
  });

  it("evaluates simple interpolation", () => {
    expect(evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], "greeting.named", { name: "John" })).toBe("Hello, John!");
    expect(() => evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], "greeting.named", { })).toThrow("Missing argument for greeting.named: name");
    expect(() => evaluateMessage(["Hello, ", { type: "Var", name: "name" }, "!"], "greeting.named", { name: 42 })).toThrow("Invalid argument for greeting.named: name: 42");
  });
});
