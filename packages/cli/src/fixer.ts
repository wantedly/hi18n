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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
        "@hi18n/collect-translation-ids": ["error", (u: TranslationUsage) => {
          translationUsages.push(u);
        }],
        "@hi18n/collect-catalog-links": ["error", (l: CatalogLink) => {
          catalogLinks.push(l);
        }],
      },
    }, { filename: filepath });
    checkMessages(filepath, messages);
  }

  type BookData = {
    bookPath: string;
    catalogPaths: string[];
    translationIds: Set<string>;
  };
  const books = new Map<string, BookData>();
  for (const u of translationUsages) {
    const { resolved } = await resolveAsPromise(u.bookSource, {
      basedir: path.dirname(path.resolve(projectPath, u.filename)),
      extensions: [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"],
    });
    const relative = path.relative(projectPath, resolved);
    if (!books.has(relative)) {
      books.set(relative, {
        bookPath: relative,
        catalogPaths: [],
        translationIds: new Set(),
      });
    }
    books.get(relative)!.translationIds.add(u.id);
  }
  for (const l of catalogLinks) {
    const { resolved } = await resolveAsPromise(l.catalogSource, {
      basedir: path.dirname(path.resolve(projectPath, l.bookFilename)),
      extensions: [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"],
    });
    const relative = path.relative(projectPath, resolved);
    if (!books.has(l.bookFilename)) {
      books.set(l.bookFilename, {
        bookPath: l.bookFilename,
        catalogPaths: [],
        translationIds: new Set(),
      });
    }
    books.get(l.bookFilename)!.catalogPaths.push(relative);
  }
  for (const [, book] of books) {
    for (const catalog of book.catalogPaths) {
      const fixLinter = new Linter({ cwd: projectPath });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      fixLinter.defineParser("@babel/eslint-parser", eslintParser);
      fixLinter.defineRule("@hi18n/no-missing-translation-ids", rules["no-missing-translation-ids"]);
      fixLinter.defineRule("@hi18n/no-unused-translation-ids", rules["no-unused-translation-ids"]);

      const source = await fs.promises.readFile(path.resolve(projectPath, catalog), "utf-8");
      const report = fixLinter.verifyAndFix(source, {
        ...linterConfig,
        rules: {
          "@hi18n/no-missing-translation-ids": "warn",
          "@hi18n/no-unused-translation-ids": "warn",
        },
        settings: {
          "@hi18n/used-translation-ids": Array.from(book.translationIds),
        },
      }, { filename: path.resolve(projectPath, catalog) });
      checkMessages(catalog, report.messages);
      if (report.fixed) {
        await fs.promises.writeFile(path.resolve(projectPath, catalog), report.output, "utf-8");
      }
    }

    {
      const fixLinter = new Linter({ cwd: projectPath });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      fixLinter.defineParser("@babel/eslint-parser", eslintParser);
      fixLinter.defineRule("@hi18n/no-missing-translation-ids-in-types", rules["no-missing-translation-ids-in-types"]);
      fixLinter.defineRule("@hi18n/no-unused-translation-ids-in-types", rules["no-unused-translation-ids-in-types"]);

      const source = await fs.promises.readFile(path.resolve(projectPath, book.bookPath), "utf-8");
      const report = fixLinter.verifyAndFix(source, {
        ...linterConfig,
        rules: {
          "@hi18n/no-missing-translation-ids-in-types": "warn",
          "@hi18n/no-unused-translation-ids-in-types": "warn",
        },
        settings: {
          "@hi18n/used-translation-ids": Array.from(book.translationIds),
        },
      }, { filename: path.resolve(projectPath, book.bookPath) });
      checkMessages(book.bookPath, report.messages);
      if (report.fixed) {
        await fs.promises.writeFile(path.resolve(projectPath, book.bookPath), report.output, "utf-8");
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveAsPromise(id: string, opts: resolve.AsyncOpts): Promise<{ resolved: string, pkg: { name: string, version: string, [key: string]: any } | undefined }> {
  return new Promise((resolvePromise, rejectPromise) => {
    resolve(id, opts, (err, resolved, pkg) => {
      if (err) rejectPromise(err);
      else resolvePromise({ resolved: resolved!, pkg });
    });
  });
}
