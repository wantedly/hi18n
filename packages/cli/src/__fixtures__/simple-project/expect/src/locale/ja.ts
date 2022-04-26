import { Catalog, msg } from "@hi18n/core";
import type { Vocabulary } from ".";

export default new Catalog<Vocabulary>({
  "example/greeting": msg("こんにちは世界!"),
  "example/greeting-todo-newtranslation": msg(),
  // "example/greeting-unused": msg("こんにちは世界! (未使用翻訳)"),
  "example/greeting-todo": msg("こんにちは世界! (TODO)"),
});
