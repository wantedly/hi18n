import { LocalCatalog, msg } from "@hi18n/core";
import type { Messages } from "./catalog";

export default new LocalCatalog<Messages>({
  "example/greeting": msg("こんにちは世界!"),
  // "example/greeting-unused": msg("こんにちは世界! (未使用翻訳)"),
  "example/greeting-todo": msg("こんにちは世界! (TODO)"),
});
