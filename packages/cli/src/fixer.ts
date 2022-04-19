import { Linter } from "eslint";
import fs from "node:fs";
import glob from "glob";
import path from "node:path";
import util from "node:util";
import eslintParser from "@babel/eslint-parser";
import resolve from "resolve";
import { createCollectTranslationIds, createFindCatalogLinks, CatalogLink, TranslationUsage } from "@hi18n/eslint-plugin";

export async function fixTranslations(projectPath: string) {
  const collectLinter = new Linter({ cwd: projectPath });
  collectLinter.defineParser("@babel/eslint-parser", eslintParser);

  const translationUsages: TranslationUsage[] = [];
  collectLinter.defineRule("collect-translation-ids", createCollectTranslationIds((u) => translationUsages.push(u)));
  const catalogLinks: CatalogLink[] = [];
  collectLinter.defineRule("find-catalog-links", createFindCatalogLinks((l) => catalogLinks.push(l)));

  const files = await util.promisify(glob)("src/**/*.ts", {
    cwd: projectPath,
    nodir: true,
  });
  for (const filepath of files) {
    const source = await fs.promises.readFile(path.join(projectPath, filepath), "utf-8");
    const messages = collectLinter.verify(source, {
      parser: "@babel/eslint-parser",
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: "module",
      },
      rules: {
        "collect-translation-ids": "error",
        "find-catalog-links": "error",
      },
    }, { filename: filepath });
    for (const message of messages) {
      if (message.severity >= 2) throw new Error(`Error on ${filepath}: ${message.message}`);
    }
  }

  let result = "";
  for (const u of translationUsages) {
    const { resolved } = await resolveAsPromise(u.catalogSource, {
      basedir: path.dirname(path.resolve(projectPath, u.filename)),
      extensions: [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"],
    });
    const relative = path.relative(projectPath, resolved);
    result += `${u.id} in ${relative}\n`;
  }
  for (const l of catalogLinks) {
    const { resolved } = await resolveAsPromise(l.localCatalogSource, {
      basedir: path.dirname(path.resolve(projectPath, l.catalogFilename)),
      extensions: [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"],
    });
    const relative = path.relative(projectPath, resolved);
    result += `${l.locale} in ${relative}\n`;
  }
  // TODO: use the collected keys for autofix
  if (result !== "example/greeting in src/locale/catalog.ts\nen in src/locale/catalog-en.ts\nja in src/locale/catalog-ja.ts\n") {
    throw new Error(`Unexpected result: ${result}`);
  }
}

function resolveAsPromise(id: string, opts: resolve.AsyncOpts): Promise<{ resolved: string, pkg: { name: string, version: string, [key: string]: any } | undefined }> {
  return new Promise((resolvePromise, rejectPromise) => {
    resolve(id, opts, (err, resolved, pkg) => {
      if (err) rejectPromise(err);
      else resolvePromise({ resolved: resolved!, pkg });
    });
  });
}
