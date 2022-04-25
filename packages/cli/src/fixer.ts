import { Linter } from "eslint";
import fs from "node:fs";
import glob from "glob";
import path from "node:path";
import util from "node:util";
import eslintParser from "@babel/eslint-parser";
import resolve from "resolve";
import { rules, CatalogLink, TranslationUsage } from "@hi18n/eslint-plugin";

export type Options = {
  cwd: string;
  include: string[];
  exclude?: string[] | undefined;
};

export async function fixTranslations(options: Options) {
  const { cwd: projectPath, include, exclude } = options;
  const linterConfig: Linter.Config = {
    parser: "@babel/eslint-parser",
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  };

  const collectLinter = new Linter({ cwd: projectPath });
  collectLinter.defineParser("@babel/eslint-parser", eslintParser);

  const translationUsages: TranslationUsage[] = [];
  collectLinter.defineRule("@hi18n/collect-translation-ids", rules["collect-translation-ids"]);
  const catalogLinks: CatalogLink[] = [];
  collectLinter.defineRule("@hi18n/collect-catalog-links", rules["collect-catalog-links"]);

  const files: string[] = [];
  for (const includeGlob of include) {
    files.push(...await util.promisify(glob)(includeGlob, {
      cwd: projectPath,
      nodir: true,
      ignore: exclude,
    }));
  }
  for (const filepath of files) {
    const source = await fs.promises.readFile(path.join(projectPath, filepath), "utf-8");
    const messages = collectLinter.verify(source, {
      ...linterConfig,
      rules: {
        "@hi18n/collect-translation-ids": "error",
        "@hi18n/collect-catalog-links": "error",
      },
      settings: {
        "@hi18n/collect-ids-callback"(u: TranslationUsage) {
          translationUsages.push(u);
        },
        "@hi18n/collect-catalog-links-callback"(l: CatalogLink) {
          catalogLinks.push(l);
        },
      },
    }, { filename: filepath });
    checkMessages(filepath, messages);
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
        ...linterConfig,
        rules: {
          "@hi18n/no-missing-translation-ids": "warn",
          "@hi18n/no-unused-translation-ids": "warn",
        },
        settings: {
          "@hi18n/used-translation-ids": Array.from(catalog.translationIds),
        },
      }, { filename: path.resolve(projectPath, localCatalog) });
      checkMessages(localCatalog, report.messages);
      if (report.fixed) {
        await fs.promises.writeFile(path.resolve(projectPath, localCatalog), report.output, "utf-8");
      }
    }

    {
      const fixLinter = new Linter({ cwd: projectPath });
      fixLinter.defineParser("@babel/eslint-parser", eslintParser);
      fixLinter.defineRule("@hi18n/no-missing-translation-ids-in-types", rules["no-missing-translation-ids-in-types"]);
      fixLinter.defineRule("@hi18n/no-unused-translation-ids-in-types", rules["no-unused-translation-ids-in-types"]);

      const source = await fs.promises.readFile(path.resolve(projectPath, catalog.catalogPath), "utf-8");
      const report = fixLinter.verifyAndFix(source, {
        ...linterConfig,
        rules: {
          "@hi18n/no-missing-translation-ids-in-types": "warn",
          "@hi18n/no-unused-translation-ids-in-types": "warn",
        },
        settings: {
          "@hi18n/used-translation-ids": Array.from(catalog.translationIds),
        },
      }, { filename: path.resolve(projectPath, catalog.catalogPath) });
      checkMessages(catalog.catalogPath, report.messages);
      if (report.fixed) {
        await fs.promises.writeFile(path.resolve(projectPath, catalog.catalogPath), report.output, "utf-8");
      }
    }
  }
}

function checkMessages(filepath: string, messages: Linter.LintMessage[]) {
  for (const message of messages) {
    if (/^Definition for rule .* was not found\.$/.test(message.message)) {
      // We load ESLint with minimal rules. Ignore the "missing rule" error.
      continue;
    }
    if (message.severity >= 2) throw new Error(`Error on ${filepath}: ${message.message}`);
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
