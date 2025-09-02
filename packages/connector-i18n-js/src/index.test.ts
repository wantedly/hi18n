import { describe, expect, it } from "vitest";
import path from "node:path";
import { connector } from "./index.js";

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
