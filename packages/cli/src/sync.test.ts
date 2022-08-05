import { describe, expect, it } from "@jest/globals";
import { hi18n } from "./command";
import { MockedOutput, withProject } from "./testing/common";

describe("sync", () => {
  // eslint-disable-next-line jest/expect-expect
  it("works with standalone configuration", async () => {
    const output = new MockedOutput();
    await withProject("standalone", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync"], cwd, output, true)
    );
  });

  // eslint-disable-next-line jest/expect-expect
  it("works with single-file configuration", async () => {
    const output = new MockedOutput();
    await withProject("single-file", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync"], cwd, output, true)
    );
  });

  // eslint-disable-next-line jest/expect-expect
  it("works with multi-file configuration", async () => {
    const output = new MockedOutput();
    await withProject("simple-project", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync"], cwd, output, true)
    );
  });

  // eslint-disable-next-line jest/expect-expect
  it("works with dynamic loading", async () => {
    const output = new MockedOutput();
    await withProject("dynamic-loading", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync"], cwd, output, true)
    );
  });

  it("sync --check is successful if convergeed", async () => {
    const output = new MockedOutput();
    await withProject("simple-project-converged", "sync-check", async (cwd) => {
      await expect(
        hi18n(["node", "hi18n", "sync", "--check"], cwd, output, true)
      ).resolves.toBe(undefined);
    });
  });

  it("errors with --check", async () => {
    const output = new MockedOutput();
    await withProject("simple-project", "sync-check", async (cwd) => {
      await expect(
        hi18n(["node", "hi18n", "sync", "--check"], cwd, output, true)
      ).rejects.toThrow("Found diff in src/locale/en.ts");
    });
  });

  // eslint-disable-next-line jest/expect-expect
  it("works without configuration if include is given", async () => {
    const output = new MockedOutput();
    await withProject("no-config", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync", "src/**/*.ts"], cwd, output, true)
    );
  });

  // eslint-disable-next-line jest/expect-expect
  it("errors if include is not given", async () => {
    const output = new MockedOutput();
    await withProject("no-config", "sync-no-include", async (cwd) => {
      await expect(
        hi18n(["node", "hi18n", "sync"], cwd, output, true)
      ).rejects.toThrow("No include specified");
    });
  });

  // eslint-disable-next-line jest/expect-expect
  it("allows resolving paths with extensions as paths with different extensions", async () => {
    const output = new MockedOutput();
    await withProject("extension-removal", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync"], cwd, output, true)
    );
  });

  // eslint-disable-next-line jest/expect-expect
  it("resolves mapped paths if configured as such", async () => {
    const output = new MockedOutput();
    await withProject("path-mapping", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync"], cwd, output, true)
    );
  });

  // eslint-disable-next-line jest/expect-expect
  it("allows parser configuration", async () => {
    const output = new MockedOutput();
    await withProject("custom-parser", "sync", (cwd) =>
      hi18n(["node", "hi18n", "sync"], cwd, output, true)
    );
  });
});
