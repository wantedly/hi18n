import { TSESLint } from "@typescript-eslint/utils";
import fs from "node:fs";
import glob from "glob";
import path from "node:path";
import util from "node:util";
import eslintParser from "@babel/eslint-parser";
import resolve from "resolve";
import {
  rules,
  serializedLocations,
  serializeReference,
  BookDef,
  CatalogDef,
  TranslationUsage,
} from "@hi18n/eslint-plugin";

export type Options = {
  cwd: string;
  include: string[];
  exclude?: string[] | undefined;
};

export async function sync(options: Options) {
  const { cwd: projectPath, include, exclude } = options;
  const linterConfig: TSESLint.Linter.Config = {
    parser: "@babel/eslint-parser",
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  };

  const linter = new TSESLint.Linter({ cwd: projectPath });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  linter.defineParser("@babel/eslint-parser", eslintParser);

  const translationUsages: TranslationUsage[] = [];
  linter.defineRule(
    "@hi18n/collect-translation-ids",
    rules["collect-translation-ids"]
  );
  const bookDefs: BookDef[] = [];
  linter.defineRule(
    "@hi18n/collect-book-definitions",
    rules["collect-book-definitions"]
  );
  const catalogDefs: CatalogDef[] = [];
  linter.defineRule(
    "@hi18n/collect-catalog-definitions",
    rules["collect-catalog-definitions"]
  );

  linter.defineRule(
    "@hi18n/no-missing-translation-ids",
    rules["no-missing-translation-ids"]
  );
  linter.defineRule(
    "@hi18n/no-unused-translation-ids",
    rules["no-unused-translation-ids"]
  );
  linter.defineRule(
    "@hi18n/no-missing-translation-ids-in-types",
    rules["no-missing-translation-ids-in-types"]
  );
  linter.defineRule(
    "@hi18n/no-unused-translation-ids-in-types",
    rules["no-unused-translation-ids-in-types"]
  );

  const files: string[] = [];
  for (const includeGlob of include) {
    files.push(
      ...(await util.promisify(glob)(includeGlob, {
        cwd: projectPath,
        nodir: true,
        ignore: exclude,
      }))
    );
  }
  for (const relative of files) {
    const filename = path.join(projectPath, relative);
    const source = await fs.promises.readFile(filename, "utf-8");
    const messages = linter.verify(
      source,
      {
        ...linterConfig,
        rules: {
          "@hi18n/collect-translation-ids": [
            "error",
            (u: TranslationUsage) => {
              translationUsages.push(u);
            },
          ],
          "@hi18n/collect-book-definitions": [
            "error",
            (b: BookDef) => {
              bookDefs.push(b);
            },
          ],
          "@hi18n/collect-catalog-definitions": [
            "error",
            (c: CatalogDef) => {
              catalogDefs.push(c);
            },
          ],
        },
      },
      { filename }
    );
    checkMessages(relative, messages);
  }

  const linkage: Record<string, string> = {};
  const usedTranslationIds: Record<string, string[]> = {};
  const rewriteTargetFiles = new Set<string>();
  for (const u of translationUsages) {
    const loc = u.bookLocation;
    if (loc.path !== undefined) {
      const { resolved } = await resolveAsPromise(loc.path, {
        basedir: path.dirname(loc.base),
        extensions: [
          ".js",
          ".cjs",
          ".mjs",
          ".ts",
          ".cts",
          ".mts",
          ".jsx",
          ".tsx",
        ],
      });
      loc.path = resolved;
    }
    const locName = serializeReference(loc);
    if (hasOwn(usedTranslationIds, locName)) {
      usedTranslationIds[locName]!.push(u.id);
    } else {
      setRecordValue(usedTranslationIds, locName, [u.id]);
    }
    rewriteTargetFiles.add(loc.path !== undefined ? loc.path : loc.base);
  }
  for (const bookDef of bookDefs) {
    const bookLocNames = serializedLocations(bookDef.bookLocation);
    const concatenatedTranslationIds = bookLocNames.flatMap((locName) =>
      hasOwn(usedTranslationIds, locName) ? usedTranslationIds[locName]! : []
    );
    const uniqueTranslationIds = Array.from(
      new Set(concatenatedTranslationIds)
    ).sort();
    for (const locName of bookLocNames) {
      setRecordValue(usedTranslationIds, locName, uniqueTranslationIds);
    }

    const primaryName = bookLocNames[0]!;
    for (const catalogLink of bookDef.catalogLinks) {
      const loc = catalogLink.catalogLocation;
      if (loc.path !== undefined) {
        const { resolved } = await resolveAsPromise(loc.path, {
          basedir: path.dirname(loc.base),
          extensions: [
            ".js",
            ".cjs",
            ".mjs",
            ".ts",
            ".cts",
            ".mts",
            ".jsx",
            ".tsx",
          ],
        });
        loc.path = resolved;
      }
      setRecordValue(linkage, serializeReference(loc), primaryName);
      rewriteTargetFiles.add(loc.path !== undefined ? loc.path : loc.base);
    }
    rewriteTargetFiles.add(bookDef.bookLocation.path);
  }
  for (const rewriteTargetFile of Array.from(rewriteTargetFiles).sort()) {
    const source = await fs.promises.readFile(rewriteTargetFile, "utf-8");
    const report = linter.verifyAndFix(
      source,
      {
        ...linterConfig,
        rules: {
          "@hi18n/no-missing-translation-ids": "warn",
          "@hi18n/no-unused-translation-ids": "warn",
          "@hi18n/no-missing-translation-ids-in-types": "warn",
          "@hi18n/no-unused-translation-ids-in-types": "warn",
        },
        settings: {
          "@hi18n/linkage": linkage,
          "@hi18n/used-translation-ids": usedTranslationIds,
        },
      },
      { filename: rewriteTargetFile }
    );
    checkMessages(rewriteTargetFile, report.messages);
    if (report.fixed) {
      await fs.promises.writeFile(rewriteTargetFile, report.output, "utf-8");
    }
  }
}

function checkMessages(
  filepath: string,
  messages: TSESLint.Linter.LintMessage[]
) {
  for (const message of messages) {
    if (/^Definition for rule .* was not found\.$/.test(message.message)) {
      // We load ESLint with minimal rules. Ignore the "missing rule" error.
      continue;
    }
    if (message.severity >= 2)
      throw new Error(`Error on ${filepath}: ${message.message}`);
  }
}

function resolveAsPromise(
  id: string,
  opts: resolve.AsyncOpts
): Promise<{
  resolved: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pkg: { name: string; version: string; [key: string]: any } | undefined;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    resolve(id, opts, (err, resolved, pkg) => {
      if (err) rejectPromise(err);
      else resolvePromise({ resolved: resolved!, pkg });
    });
  });
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function setRecordValue<T>(record: Record<string, T>, key: string, value: T) {
  Object.defineProperty(record, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
