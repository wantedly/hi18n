import { describe, expect, expectTypeOf, it } from "vitest";
import { arg } from "../../msg.ts";
import type { Message } from "../../opaque.ts";
import { DateTimeArg, type CompiledMessage } from "../../msgfmt.ts";

describe("dateArg", () => {
  describe("when argStyle is omitted", () => {
    it("creates a default date argument message", () => {
      const m = arg("dueDate", "date");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        }),
      );
    });
  });

  describe("when argStyle is an empty object", () => {
    it("creates a default date argument message", () => {
      const m = arg("dueDate", "date", {});
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        }),
      );
    });
  });

  describe("when argStyle is short", () => {
    it("creates a date argument message with short style", () => {
      const m = arg("dueDate", "date", "short");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { dateStyle: "short" }),
      );
    });
  });

  describe("when argStyle is medium", () => {
    it("creates a date argument message with medium style", () => {
      const m = arg("dueDate", "date", "medium");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { dateStyle: "medium" }),
      );
    });
  });

  describe("when argStyle is long", () => {
    it("creates a date-time argument message with long style", () => {
      const m = arg("dueDate", "date", "long");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { dateStyle: "long" }),
      );
    });
  });

  describe("when argStyle is full", () => {
    it("creates a date-time argument message with full style", () => {
      const m = arg("dueDate", "date", "full");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { dateStyle: "full" }),
      );
    });
  });

  describe("when argStyle is an object", () => {
    it("creates a date-time argument message with given options", () => {
      const m = arg("dueDate", "date", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      });
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          year: "2-digit",
          month: "2-digit",
          day: "2-digit",
        }),
      );
    });
  });
});
