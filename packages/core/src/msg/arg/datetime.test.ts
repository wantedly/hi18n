import { describe, expect, expectTypeOf, it } from "vitest";
import { arg } from "../../msg.ts";
import type { Message } from "../../opaque.ts";
import { DateTimeArg, type CompiledMessage } from "../../msgfmt.ts";

describe("dateTimeArg", () => {
  describe("when argStyle is omitted", () => {
    it("creates a default date-time argument message", () => {
      const m = arg("dueDate", "datetime");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        }),
      );
    });
  });

  describe("when argStyle is an empty object", () => {
    it("creates a default date-time argument message", () => {
      const m = arg("dueDate", "datetime", {});
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        }),
      );
    });
  });

  describe("when argStyle is short", () => {
    it("creates a date-time argument message with short style", () => {
      const m = arg("dueDate", "datetime", "short");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      );
    });
  });

  describe("when argStyle is medium", () => {
    it("creates a date-time argument message with medium style", () => {
      const m = arg("dueDate", "datetime", "medium");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          dateStyle: "medium",
          timeStyle: "medium",
        }),
      );
    });
  });

  describe("when argStyle is long", () => {
    it("creates a date-time argument message with long style", () => {
      const m = arg("dueDate", "datetime", "long");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          dateStyle: "long",
          timeStyle: "long",
        }),
      );
    });
  });

  describe("when argStyle is full", () => {
    it("creates a date-time argument message with full style", () => {
      const m = arg("dueDate", "datetime", "full");
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          dateStyle: "full",
          timeStyle: "full",
        }),
      );
    });
  });

  describe("when argStyle of a pair of shorthands", () => {
    it("creates a date-time argument message with given styles", () => {
      const m = arg("dueDate", "datetime", {
        dateStyle: "short",
        timeStyle: "long",
      });
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          dateStyle: "short",
          timeStyle: "long",
        }),
      );
    });
  });

  describe("when argStyle is an object", () => {
    it("creates a date-time argument message with given options", () => {
      const m = arg("dueDate", "datetime", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      expectTypeOf(m).toEqualTypeOf<Message<{ dueDate: Date }>>();
      expect(m).toEqual<CompiledMessage>(
        DateTimeArg("dueDate", {
          year: "2-digit",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    });
  });
});
