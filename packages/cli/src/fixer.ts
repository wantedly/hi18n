import { Linter } from "eslint";
import fs from "node:fs";
import glob from "glob";
import path from "node:path";
import util from "node:util";
import eslintParser from "@babel/eslint-parser";
import resolve from "resolve";
import { createCollectTranslationIds, createFindCatalogLinks, rules, CatalogLink, TranslationUsage } from "@hi18n/eslint-plugin";

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

  type CatalogData = {
    catalogPath: string;
    localCatalogPaths: string[];
    translationIds: Set<string>;
  };
  const catalogs = new Map<string, CatalogData>();
  for (const u of translationUsages) {
    const { resolved } = await resolveAsPromise(u.catalogSource, {
      basedir: path.dirname(path.resolve(projectPath, u.filename)),
      extensions: [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"],
    });
    const relative = path.relative(projectPath, resolved);
    if (!catalogs.has(relative)) {
      catalogs.set(relative, {
        catalogPath: relative,
        localCatalogPaths: [],
        translationIds: new Set(),
      });
    }
    catalogs.get(relative)!.translationIds.add(u.id);
  }
  for (const l of catalogLinks) {
    const { resolved } = await resolveAsPromise(l.localCatalogSource, {
      basedir: path.dirname(path.resolve(projectPath, l.catalogFilename)),
      extensions: [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"],
    });
    const relative = path.relative(projectPath, resolved);
    if (!catalogs.has(l.catalogFilename)) {
      catalogs.set(l.catalogFilename, {
        catalogPath: l.catalogFilename,
        localCatalogPaths: [],
        translationIds: new Set(),
      });
    }
    catalogs.get(l.catalogFilename)!.localCatalogPaths.push(relative);
  }
  for (const [, catalog] of catalogs) {
    for (const localCatalog of catalog.localCatalogPaths) {
      const fixLinter = new Linter({ cwd: projectPath });
      fixLinter.defineParser("@babel/eslint-parser", eslintParser);
      fixLinter.defineRule("@hi18n/no-missing-translation-ids", rules["no-missing-translation-ids"]);
      fixLinter.defineRule("@hi18n/no-unused-translation-ids", rules["no-unused-translation-ids"]);

      const source = await fs.promises.readFile(path.resolve(projectPath, localCatalog), "utf-8");
      const report = fixLinter.verifyAndFix(source, {
        parser: "@babel/eslint-parser",
        parserOptions: {
          ecmaVersion: "latest",
          ecmaFeatures: {
            jsx: true,
          },
          sourceType: "module",
          babelOptions: {
            parserOpts: {
              plugins: ["typescript"],
            },
          },
        },
        rules: {
          "@hi18n/no-missing-translation-ids": "warn",
          "@hi18n/no-unused-translation-ids": "warn",
        },
        settings: {
          "@hi18n/used-translation-ids": Array.from(catalog.translationIds),
        },
      });
      for (const message of report.messages) {
        if (message.severity >= 2) throw new Error(`Error on ${localCatalog}: ${message.message}`);
      }
      if (report.fixed) {
        await fs.promises.writeFile(path.resolve(projectPath, localCatalog), report.output, "utf-8");
      }
    }
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
