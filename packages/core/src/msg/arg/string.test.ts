import { describe, expect, expectTypeOf, it } from "vitest";
import { arg } from "../../msg.ts";
import type { Message } from "../../opaque.ts";
import { StringArg, type CompiledMessage } from "../../msgfmt.ts";

describe("stringArg", () => {
  it("creates a string argument message", () => {
    const m = arg("username", "string");
    expectTypeOf(m).toEqualTypeOf<Message<{ username: string }>>();
    expect(m).toEqual<CompiledMessage>(StringArg("username"));
  });
});
