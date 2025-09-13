import { describe, expect, expectTypeOf, it } from "vitest";
import { plural } from "./plural.ts";
import { otherwise, when } from "./branch.ts";
import { msg } from "./tagged-template.ts";
import { arg } from "../msg.ts";
import type { Message } from "../opaque.ts";
import {
  type CompiledMessage,
  PluralArg,
  PluralBranch,
  StringArg,
} from "../msgfmt.ts";

describe("plural", () => {
  it("generates one branch", () => {
    const m = plural("count").branch(otherwise(msg`foo${arg("foo")}`));
    expectTypeOf(m).toEqualTypeOf<Message<{ foo: string }>>();
    expect(m).toEqual<CompiledMessage>(
      PluralArg("count", [], ["foo", StringArg("foo")]),
    );
  });

  it("generates multiple branches", () => {
    const m = plural("count").branch(
      when("one", msg`one${arg("one")}`),
      when(2, msg`two${arg("two")}`),
      otherwise(msg`other${arg("other")}`),
    );
    expectTypeOf(m).toEqualTypeOf<
      Message<{ one: string; two: string; other: string }>
    >();
    expect(m).toEqual<CompiledMessage>(
      PluralArg(
        "count",
        [
          PluralBranch("one", ["one", StringArg("one")]),
          PluralBranch(2, ["two", StringArg("two")]),
        ],
        ["other", StringArg("other")],
      ),
    );
  });

  it("generates branches with subtract option", () => {
    const m = plural("count", { subtract: 1 }).branch(
      when("one", msg`one${arg("one")}`),
      when(2, msg`two${arg("two")}`),
      otherwise(msg`other${arg("other")}`),
    );
    expectTypeOf(m).toEqualTypeOf<
      Message<{ one: string; two: string; other: string }>
    >();
    expect(m).toEqual<CompiledMessage>(
      PluralArg(
        "count",
        [
          PluralBranch("one", ["one", StringArg("one")]),
          PluralBranch(2, ["two", StringArg("two")]),
        ],
        ["other", StringArg("other")],
        { subtract: 1 },
      ),
    );
  });
});
