import { describe, expect, it } from "@jest/globals";
import { getCatalog } from "./catalog";
import { parseAsync } from "@babel/core";

describe("getCatalog", () => {
  it("detects MessageCatalog construction", async () => {
    const code = `
import { MessageCatalog } from "@hi18n/core";
export const catalog = new MessageCatalog();
`;
    const program = await parseAsync(code, { sourceType: "module", configFile: false });
    const catalogs = getCatalog(code, program!, { highlightCode: false });
    expect(catalogs).toEqual(["catalog"]);
  });
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
