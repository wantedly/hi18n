import { describe, it } from "@jest/globals";
import fs from "node:fs";
import fse from "fs-extra";
import os from "node:os";
import path from "node:path";
import glob from "glob";
import util from "util";
import { fixTranslations } from "./fixer";

describe("fixTranslations", () => {
  // eslint-disable-next-line jest/expect-expect
  it("works", () =>
    withTemp(async (tempdir: string) => {
      const inputDir = path.resolve(
        __dirname,
        "./__fixtures__/simple-project/input"
      );
      const expectDir = path.resolve(
        __dirname,
        "./__fixtures__/simple-project/expect"
      );
      const outputDir = path.join(tempdir, "project");
      await fse.copy(inputDir, outputDir);
      await fixTranslations({ cwd: outputDir, include: ["src/**/*.ts"] });

      const files1 = await util.promisify(glob)("**/*", { cwd: expectDir });
      const files2 = await util.promisify(glob)("**/*", { cwd: outputDir });
      const allFiles = Array.from(new Set(files1.concat(files2)));
      allFiles.sort();
      const unmatchedFiles: string[] = [];
      for (const filepath of files1) {
        const filepath1 = path.join(expectDir, filepath);
        const filepath2 = path.join(outputDir, filepath);
        if (!fs.existsSync(filepath1) || !fs.existsSync(filepath2)) {
          unmatchedFiles.push(filepath);
          continue;
        }
        const stat1 = await fs.promises.stat(filepath1);
        const stat2 = await fs.promises.stat(filepath2);
        if (stat1.isFile() && stat2.isFile()) {
          const content1 = await fs.promises.readFile(filepath1);
          const content2 = await fs.promises.readFile(filepath2);
          if (
            content1.length !== content2.length ||
            !content1.every((b, i) => b === content2[i])
          ) {
            unmatchedFiles.push(filepath);
          }
        } else if (stat1.isDirectory() && stat2.isDirectory()) {
          // OK
        } else {
          unmatchedFiles.push(filepath);
        }
      }
      if (unmatchedFiles.length > 0) {
        let message: string = `Unmatched contents.`;
        message += `\nFiles:\n${unmatchedFiles
          .map((f) => `  ${f}\n`)
          .join("")}`;
        if (process.env["UPDATE_SNAPSHOTS"]) {
          await fse.remove(expectDir);
          await fse.copy(outputDir, expectDir);
          console.log("Updated the snapshots");
        } else if (process.env["SAVE_SNAPSHOTS"]) {
          const outputSaveDir = await fs.promises.mkdtemp(
            path.resolve(__dirname, "./__fixtures__/simple-project/output-")
          );
          await fse.copy(outputDir, outputSaveDir);
          message += `\nSaved the output to: ${outputSaveDir}`;
          throw new Error(message);
        } else {
          message += `\nSet UPDATE_SNAPSHOTS=true to update the expectation`;
          message += `\nSet SAVE_SNAPSHOTS=true to inspect`;
          throw new Error(message);
        }
      }
    }));
});

async function withTemp<T>(cb: (tempdir: string) => Promise<T>): Promise<T> {
  const tempdir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "hi18n-test-")
  );
  let result: T;
  try {
    result = await cb(tempdir);
  } finally {
    await fse.remove(tempdir);
  }
  return result;
}
