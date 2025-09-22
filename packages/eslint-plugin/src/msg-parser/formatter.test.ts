import { describe, expect, it } from "vitest";
import { formatMessageAsJS } from "./formatter.ts";
import { PlaintextNode } from "./ast.ts";
import { ExternalStringPart } from "./js-string.ts";

describe("formatMessageAsJS", () => {
  describe("when style = js", () => {
    it("formats Plaintext as js", () => {
      expect(
        formatMessageAsJS(PlaintextNode("js", [ExternalStringPart("Hello!")])),
      ).toEqual("msg`Hello!`");
    });

    it("escapes back quotes", () => {
      expect(
        formatMessageAsJS(PlaintextNode("js", [ExternalStringPart("`")])),
      ).toEqual("msg`\\``");
    });

    it("escapes interpolation-likes", () => {
      expect(
        formatMessageAsJS(PlaintextNode("js", [ExternalStringPart("${")])),
      ).toEqual("msg`\\${`");
    });

    it("escapes backslashes", () => {
      expect(
        formatMessageAsJS(PlaintextNode("js", [ExternalStringPart("\\")])),
      ).toEqual("msg`\\\\`");
    });

    it("escapes newlines", () => {
      expect(
        formatMessageAsJS(PlaintextNode("js", [ExternalStringPart("\n")])),
      ).toEqual("msg`\\n`");
    });

    it("does not escape double quotes", () => {
      expect(
        formatMessageAsJS(PlaintextNode("js", [ExternalStringPart('"')])),
      ).toEqual('msg`"`');
    });

    it("does not escape single quotes", () => {
      expect(
        formatMessageAsJS(PlaintextNode("js", [ExternalStringPart("'")])),
      ).toEqual("msg`'`");
    });
  });

  describe("when style = mf1", () => {
    it("formats Plaintext as mf1", () => {
      expect(
        formatMessageAsJS(PlaintextNode("mf1", [ExternalStringPart("Hello!")])),
      ).toEqual('mf1("Hello!")');
    });

    it("escapes single quotes", () => {
      expect(
        formatMessageAsJS(PlaintextNode("mf1", [ExternalStringPart("'")])),
      ).toEqual("mf1(\"''\")");
    });

    it("escapes <", () => {
      expect(
        formatMessageAsJS(PlaintextNode("mf1", [ExternalStringPart("<")])),
      ).toEqual("mf1(\"'<'\")");
    });

    it("escapes #", () => {
      expect(
        formatMessageAsJS(PlaintextNode("mf1", [ExternalStringPart("#")])),
      ).toEqual("mf1(\"'#'\")");
    });

    it("escapes {", () => {
      expect(
        formatMessageAsJS(PlaintextNode("mf1", [ExternalStringPart("{")])),
      ).toEqual("mf1(\"'{'\")");
    });

    it("escapes newlines", () => {
      expect(
        formatMessageAsJS(PlaintextNode("mf1", [ExternalStringPart("\n")])),
      ).toEqual('mf1("\\n")');
    });

    it("escapes double quotes", () => {
      expect(
        formatMessageAsJS(PlaintextNode("mf1", [ExternalStringPart('"')])),
      ).toEqual('mf1("\\"")');
    });
  });
});
