import { describe, expect, it } from "vitest";
import { convertMessage } from "./message.js";

describe("convertMessage", () => {
  it("converts a simple message", () => {
    expect(convertMessage("foo")).toBe("foo");
  });

  it("converts interpolations", () => {
    expect(convertMessage("Hello %{name}!")).toBe("Hello {name}!");
  });

  it("escapes symbols", () => {
    expect(convertMessage("{a< >foo} bar %{name} 'foo'")).toBe(
      "'{'a'<' >foo'}' bar {name} ''foo''"
    );
  });

  it("drops plural if there is only other branch", () => {
    expect(convertMessage({ other: "%{count} apples" })).toBe("{count} apples");
  });

  it("drops plural if the branches has the same text", () => {
    expect(
      convertMessage({
        one: "%{count} apples",
        other: "%{count} apples",
      })
    ).toBe("{count} apples");
  });

  it("Generates plural branches", () => {
    expect(
      convertMessage({
        one: "%{count} apple",
        other: "%{count} apples",
      })
    ).toBe("{count, plural, one {# apple} other {# apples}}");
  });

  it("Keeps other variables in plural branches", () => {
    expect(
      convertMessage({
        one: "You gave %{name} %{count} apple",
        other: "You gave %{name} %{count} apples",
      })
    ).toBe(
      "{count, plural, one {You gave {name} # apple} other {You gave {name} # apples}}"
    );
  });
});
