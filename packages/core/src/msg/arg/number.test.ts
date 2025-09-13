import { describe, expect, expectTypeOf, it } from "vitest";
import { arg } from "../../msg.ts";
import type { Message } from "../../opaque.ts";
import { NumberArg, type CompiledMessage } from "../../msgfmt.ts";

describe("numberArg", () => {
  describe("when argStyle is omitted", () => {
    it("creates a number argument message", () => {
      const m = arg("age", "number");
      expectTypeOf(m).toEqualTypeOf<Message<{ age: number | bigint }>>();
      expect(m).toEqual<CompiledMessage>(NumberArg("age", {}));
    });
  });

  describe("when argStyle is number", () => {
    it("creates a number argument message", () => {
      const m = arg("age", "number", "number");
      expectTypeOf(m).toEqualTypeOf<Message<{ age: number | bigint }>>();
      expect(m).toEqual<CompiledMessage>(NumberArg("age", {}));
    });
  });

  describe("when argStyle is integer", () => {
    it("creates a number argument message with integer style", () => {
      const m = arg("age", "number", "integer");
      expectTypeOf(m).toEqualTypeOf<Message<{ age: number | bigint }>>();
      expect(m).toEqual<CompiledMessage>(
        NumberArg("age", {
          maximumFractionDigits: 0,
        }),
      );
    });
  });

  describe("when argStyle is percent", () => {
    it("creates a number argument message with percent style", () => {
      const m = arg("progress", "number", "percent");
      expectTypeOf(m).toEqualTypeOf<Message<{ progress: number | bigint }>>();
      expect(m).toEqual<CompiledMessage>(
        NumberArg("progress", {
          style: "percent",
        }),
      );
    });
  });

  describe("when argStyle is object", () => {
    it("creates a number argument message with given options", () => {
      const m = arg("age", "number", {
        style: "decimal",
        minimumIntegerDigits: 2,
      });
      expectTypeOf(m).toEqualTypeOf<Message<{ age: number | bigint }>>();
      expect(m).toEqual<CompiledMessage>(
        NumberArg("age", {
          style: "decimal",
          minimumIntegerDigits: 2,
        }),
      );
    });

    it("creates a number argument message with given subtract option", () => {
      const m = arg("count", "number", {
        style: "decimal",
        subtract: 2,
      });
      expectTypeOf(m).toEqualTypeOf<Message<{ count: number | bigint }>>();
      expect(m).toEqual<CompiledMessage>(
        NumberArg(
          "count",
          {
            style: "decimal",
          },
          { subtract: 2 },
        ),
      );
    });
  });
});
