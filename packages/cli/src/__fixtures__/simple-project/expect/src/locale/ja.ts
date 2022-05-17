import { Catalog, msg } from "@hi18n/core";
import type { Vocabulary } from ".";

export default new Catalog<Vocabulary>({
  "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  "example/greeting": msg("こんにちは世界!"),
  "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/greeting-unused": msg("こんにちは世界! (未使用翻訳)"),
  "example/greeting-todo": msg("こんにちは世界! (TODO)"),
});
