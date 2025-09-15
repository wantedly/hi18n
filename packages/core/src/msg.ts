/**
 * @packageDocumentation
 * @module @hi18n/core/msg
 *
 * This module provides functions and types for creating type-safe messages
 * for each language.
 *
 * @example
 *   ```ts
 *   import { Catalog, type Message } from "@hi18n/core";
 *   import { arg, msg, plural } from "@hi18n/core/msg";
 *
 *   export type Vocabulary = {
 *     "root/greeting": Message<{ name: string }>;
 *   };
 *
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *     "root/greeting": msg`Hello, ${arg("name")}!`,
 *   });
 *   ```
 */

export * from "./msg/arg.ts";
export * from "./msg/tagged-template.ts";
export * from "./msg/branch.ts";
export * from "./msg/mf1.ts";
export * from "./msg/plural.ts";
export * from "./msg/tag.ts";
export * from "./msg/todo.ts";
