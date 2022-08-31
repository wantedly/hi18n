import { Catalog, msg } from "@hi18n/core";
import type { Vocabulary } from ".";

export default new Catalog<Vocabulary>("en", {
  "example/greeting": msg("Hello!"),
  "example/greeting2": msg("Hello, world!"),
});
