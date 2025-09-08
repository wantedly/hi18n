import fs from "node:fs";
import fse from "fs-extra";
import os from "node:os";
import path from "node:path";
import { glob } from "glob";
import type { OutputConfiguration } from "commander";

export type InitFixturesResult = {
  withProject: <T>(
    fixtureName: string,
    expectName: string,
    cb: (cwd: string) => Promise<T>,
  ) => Promise<T>;
};

export function initFixtures(dir: string): InitFixturesResult {
  const fixturesDir = path.resolve(dir, "__fixtures__");

  async function withProject<T>(
    fixtureName: string,
    expectName: string,
    cb: (cwd: string) => Promise<T>,
  ): Promise<T> {
    return await withTemp(async (tempdir: string) => {
      const inputDir = path.resolve(fixturesDir, `${fixtureName}/input`);
      const expectDir = path.resolve(
        fixturesDir,
        `${fixtureName}/expect-${expectName}`,
      );
      const outputDir = path.join(tempdir, "project");
      await fse.copy(inputDir, outputDir);
      const result = await cb(outputDir);

      const files1 = await glob("**/*", {
        cwd: expectDir,
        dot: true,
      });
      const files2 = await glob("**/*", {
        cwd: outputDir,
        dot: true,
      });
      const allFiles = Array.from(new Set(files1.concat(files2)));
      allFiles.sort();
      const unmatchedFiles: string[] = [];
      for (const filepath of allFiles) {
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
          // eslint-disable-next-line no-console
          console.log("Updated the snapshots");
        } else if (process.env["SAVE_SNAPSHOTS"]) {
          const outputSaveDir = await fs.promises.mkdtemp(
            path.resolve(fixturesDir, `${fixtureName}/output-`),
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
      return result;
    });
  }

  return { withProject };
}

async function withTemp<T>(cb: (tempdir: string) => Promise<T>): Promise<T> {
  const tempdir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "hi18n-test-"),
  );
  let result: T;
  try {
    result = await cb(tempdir);
  } finally {
    await fse.remove(tempdir);
  }
  return result;
}

export class MockedOutput implements OutputConfiguration {
  stdout = "";
  stderr = "";
  writeOut(str: string): void {
    this.stdout += str;
  }
  writeErr(str: string): void {
    this.stderr += str;
  }
  getOutHelpWidth(): number {
    return 80;
  }
  getErrHelpWidth(): number {
    return 80;
  }
  outputError(str: string, write: (str: string) => void): void {
    write(str);
  }
}
