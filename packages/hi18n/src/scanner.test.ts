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

  it("detects MessageCatalog usage", async () => {
    const code = `
import { catalog } from "./locale";
const { t } = catalog.getI18n("ja");
const str = t("example/greeting");
`;
    const program = await parseAsync(code, { sourceType: "module", configFile: false });
    const catalogs = getCatalog(code, program!, { highlightCode: false }).importedCatalogs;
    expect(catalogs).toEqual({
      "./locale": {
        usedKeys: ["example/greeting"]
      },
    });
  });
});
