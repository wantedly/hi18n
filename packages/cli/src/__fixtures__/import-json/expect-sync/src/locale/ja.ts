import { Catalog, msg } from "@hi18n/core";
import type { Vocabulary } from ".";

export default new Catalog<Vocabulary>("ja", {
  "example/greeting": msg("こんにちは!"),
  "example/greeting2": msg("こんにちは世界!"),
});
