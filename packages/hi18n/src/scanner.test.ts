import { describe, expect, it } from "@jest/globals";
import { getCatalog } from "./scanner";
import { parseAsync } from "@babel/core";

describe("getCatalog", () => {
  it("detects MessageCatalog construction", async () => {
    const code = `
import { MessageCatalog } from "@hi18n/core";
export const catalog = new MessageCatalog();
`;
    const program = await parseAsync(code, { sourceType: "module", configFile: false });
    const catalogs = getCatalog(code, program!, { highlightCode: false }).exportedCatalogs;
    expect(catalogs).toEqual(["catalog"]);
  });
});
