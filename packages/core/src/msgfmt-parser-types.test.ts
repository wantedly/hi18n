import { describe, it } from "@jest/globals";
import type { Message } from "./index";
import type { InferredMessageType } from "./msgfmt-parser-types";

describe("InferredMessageType", () => {
  it("infers no arguments", () => {
    expectType<InferredMessageType<"foo">>().to(beTypeEqual<Message>());
  });

  // TypeScript >= 4.6
  it("infers long messages", () => {
    expectType<InferredMessageType<"abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz">>().to(beTypeEqual<Message>());
    expectType<InferredMessageType<"{abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz}">>().to(beTypeEqual<Message<{ abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz: string }>>());
  });

  it("infers simple arguments", () => {
    expectType<InferredMessageType<"{name}">>().to(beTypeEqual<Message<{ name: string }>>());
    expectType<InferredMessageType<"{name} {value}">>().to(beTypeEqual<Message<{ name: string, value: string }>>());
  });

  it("infers unknown on too general strings", () => {
    expectType<InferredMessageType<string>>().to(beTypeEqual<unknown>());
  });

  it("infers unknown on parse error", () => {
    expectType<InferredMessageType<"{}">>().to(beTypeEqual<unknown>());
    expectType<InferredMessageType<"{nam">>().to(beTypeEqual<unknown>());
    expectType<InferredMessageType<"{2nd}">>().to(beTypeEqual<unknown>());
    expectType<InferredMessageType<"{name foo}">>().to(beTypeEqual<unknown>());
  });
});

type Predicate<T> = {
  co?: (() => T) | undefined;
  contra?: ((x: T) => void) | undefined;
};

function expectType<T>() {
  return {
    to(_pred: Predicate<T>): void {}
  };
}

type AssignableToPredicate<T> = {
  co?: undefined;
  contra(x: T): void;
};
function beAssignableTo<T>(): AssignableToPredicate<T> {
  return { contra(_x: T) {} }
}

type AssignableFromPredicate<T> = {
  co(): T;
  contra?: undefined;
};
function beAssignableFrom<T>(): AssignableFromPredicate<T> {
  return { co() { return null as any; } };
}

type TypeEqualPredicate<T> = {
  co(): T;
  contra(x: T): void;
};
function beTypeEqual<T>(): TypeEqualPredicate<T> {
  return { co() { return null as any; }, contra(_x: T) {} }
}

// Type predicate self check

expectType<number>().to(beAssignableTo<number>());
// @ts-expect-error
expectType<number>().to(beAssignableTo<string>());
expectType<number>().to(beAssignableTo<number | string>());
// @ts-expect-error
expectType<number>().to(beAssignableTo<never>());

expectType<number>().to(beAssignableFrom<number>());
// @ts-expect-error
expectType<number>().to(beAssignableFrom<string>());
// @ts-expect-error
expectType<number>().to(beAssignableFrom<number | string>());
expectType<number>().to(beAssignableFrom<never>());

expectType<number>().to(beTypeEqual<number>());
// @ts-expect-error
expectType<number>().to(beTypeEqual<string>());
// @ts-expect-error
expectType<number>().to(beTypeEqual<number | string>());
// @ts-expect-error
expectType<number>().to(beTypeEqual<never>());
