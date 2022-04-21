import { LocalCatalog, msg } from "@hi18n/core";
import type { Messages } from "./catalog";

export default new LocalCatalog<Messages>({
  "example/greeting": msg("Hello, world!"),
  "example/greeting-unused": msg("Hello, world! (unused translation)"),
  // "example/greeting-todo": msg("Hello, world! (TODO)"),
});
