import { describe, expect, expectTypeOf, it } from "vitest";
import { arg } from "../../msg.ts";
import type { Message } from "../../opaque.ts";
import { DateTimeArg, type CompiledMessage } from "../../msgfmt.ts";

describe("timeArg", () => {
  describe("when argStyle is omitted", () => {
    it("creates a default time argument message", () => {
      const m = arg("dueDate", "time");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        }),
      );
    });
  });

  describe("when argStyle is an empty object", () => {
    it("creates a default time argument message", () => {
      const m = arg("dueDate", "time", {});
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        }),
      );
    });
  });

  describe("when argStyle is short", () => {
    it("creates a time argument message with short style", () => {
      const m = arg("dueDate", "time", "short");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { timeStyle: "short" }),
      );
    });
  });

  describe("when argStyle is medium", () => {
    it("creates a time argument message with medium style", () => {
      const m = arg("dueDate", "time", "medium");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { timeStyle: "medium" }),
      );
    });
  });

  describe("when argStyle is long", () => {
    it("creates a time argument message with long style", () => {
      const m = arg("dueDate", "time", "long");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { timeStyle: "long" }),
      );
    });
  });

  describe("when argStyle is full", () => {
    it("creates a time argument message with full style", () => {
      const m = arg("dueDate", "time", "full");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", { timeStyle: "full" }),
      );
    });
  });

  describe("when argStyle is an object", () => {
    it("creates a time argument message with given options", () => {
      const m = arg("dueDate", "time", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    });
  });
});
