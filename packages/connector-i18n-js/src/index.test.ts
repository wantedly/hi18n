import { describe, expect, it } from "@jest/globals";
import path from "node:path";
import { connector } from ".";

describe("importData", () => {
  it("imports data from config/locales", async () => {
    const { importData } = connector(
      path.resolve(__dirname, "./__fixtures__/project1/input/.hi18nrc.json"),
      {}
    );
    const data = await importData!();
    expect(data).toMatchSnapshot();
  });
});
