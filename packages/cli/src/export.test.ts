import { describe, it } from "vitest";
import { hi18n } from "./command.js";
import { MockedOutput, initFixtures } from "@hi18n/dev-utils";

const { withProject } = initFixtures(__dirname);

describe("export", () => {
  // eslint-disable-next-line jest/expect-expect
  it("exports as JSON by default", async () => {
    const output = new MockedOutput();
    await withProject("export-json", "export", (cwd) =>
      hi18n(["node", "hi18n", "export"], cwd, output, true)
    );
  });
});
