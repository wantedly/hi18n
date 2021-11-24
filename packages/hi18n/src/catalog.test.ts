import { describe, expect, it } from "@jest/globals";
import { getCatalog } from "./catalog";
import { parseAsync } from "@babel/core";

describe("getCatalog", () => {
  describe("export declarations", () => {
    it("throws error on untrackable re-exports", async () => {
      const code = `
export * from "@hi18n/core";
`;
      const program = await parseAsync(code, { sourceType: "module", configFile: false });
      expect(() => {
        getCatalog(code, program!, { highlightCode: false });
      }).toThrowErrorMatchingSnapshot();
    });
  });
});
