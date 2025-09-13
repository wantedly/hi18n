import { describe, expect, expectTypeOf, it } from "vitest";
import { msg, arg } from "../msg.ts";
import { NumberArg, StringArg, type CompiledMessage } from "../msgfmt.ts";
import type { Message } from "../opaque.ts";

describe("msg tag", () => {
  it("emits empty string for empty message", () => {
    const m = msg``;
    expectTypeOf(m).toEqualTypeOf<Message>();
    expect(m).toEqual<CompiledMessage>([""]);
  });

  it("emits simple string", () => {
    const m = msg`Hello, World!`;
    expectTypeOf(m).toEqualTypeOf<Message>();
    expect(m).toEqual<CompiledMessage>(["Hello, World!"]);
  });

  it("does not interpret MessageFormat escapes", () => {
    const m = msg`Hello, {name}! I''m John.`;
    expectTypeOf(m).toEqualTypeOf<Message>();
    expect(m).toEqual<CompiledMessage>(["Hello, {name}! I''m John."]);
  });

  it("concatenates string-valued interpolations", () => {
    const name = "Alice";
    const m = msg`Hello, ${name as unknown as Message<unknown>}!`;
    expectTypeOf(m).toEqualTypeOf<Message>();
    expect(m).toEqual<CompiledMessage>(["Hello, Alice!"]);
  });

  it("concatenates array-of-strings-valued interpolations", () => {
    const items = ["apples, ", "bananas, ", "cherries"];
    const m = msg`I like ${items as unknown as Message<unknown>}!`;
    expectTypeOf(m).toEqualTypeOf<Message>();
    expect(m).toEqual<CompiledMessage>(["I like apples, bananas, cherries!"]);
  });

  it("interpolates multiple arguments", () => {
    const m = msg`Name: ${arg("name")}, Age: ${arg("age", "number")}`;
    expectTypeOf(m).toEqualTypeOf<
      Message<{ name: string; age: number | bigint }>
    >();
    expect(m).toEqual<CompiledMessage>([
      "Name: ",
      StringArg("name"),
      ", Age: ",
      NumberArg("age", {}),
    ]);
  });
});
