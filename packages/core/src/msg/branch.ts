import type { Message } from "../opaque.ts";

/**
 * An intermediary builder for constructing a branch message, such as `plural`.
 *
 * @since 0.2.1 (`@hi18n/core`)
 */
export type BranchBuilder<Options extends string | number> = {
  branch: <const Branches extends BranchesBase<Options, Message<never>>>(
    ...branches: Branches
  ) => Message<
    Branches extends BranchesBase<Options, Message<infer T>>
      ? { [K in keyof T]: T[K] }
      : never
  >;
};

/**
 * @since 0.2.1 (`@hi18n/core`)
 */
export type BranchesBase<Options extends string | number, M> = [
  ...When<Options, M>[],
  Otherwise<M>,
];

/**
 * @since 0.2.1 (`@hi18n/core`)
 */
export type When<Condition extends string | number, M> = {
  type: "When";
  when: Condition;
  message: M;
};

/**
 * A DSL function used as part of a branch message, such as `plural`.
 *
 * @since 0.2.1 (`@hi18n/core`)
 */
export function when<Condition extends string | number, M>(
  when: Condition,
  message: M,
): When<Condition, M> {
  return { type: "When", when, message };
}

/**
 * @since 0.2.1 (`@hi18n/core`)
 */
export type Otherwise<M> = {
  type: "Otherwise";
  message: M;
};

/**
 * A DSL function used as part of a branch message, such as `plural`.
 *
 * @since 0.2.1 (`@hi18n/core`)
 */
export function otherwise<M>(message: M): Otherwise<M> {
  return { type: "Otherwise", message };
}
