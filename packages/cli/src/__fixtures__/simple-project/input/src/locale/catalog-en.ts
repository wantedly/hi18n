import { LocalCatalog, msg } from "@hi18n/core";
import type { Messages } from "./catalog";

export default new LocalCatalog<Messages>({
  "example/greeting": msg("Hello, world!"),
});
