import { describe, expect, it } from "@jest/globals";
import { parseMessage } from "./msgfmt-parser";

describe("parseMessage", () => {
  it("parses plain texts", () => {
    expect(parseMessage("")).toBe("");
    expect(parseMessage("Hello, world!")).toBe("Hello, world!");
    expect(parseMessage("こんにちは世界!")).toBe("こんにちは世界!");
    expect(parseMessage("1 + 1 = 2")).toBe("1 + 1 = 2");
  });

  it("parses texts with double quotes", () => {
    expect(parseMessage("I''m not a fond of this syntax.")).toBe("I'm not a fond of this syntax.");
  });

  it("parses quoted texts", () => {
    expect(parseMessage("foo, 'bar', '{}#|', 'a''b', ''''")).toBe("foo, bar, {}#|, a'b, ''");
  });
});
