import { TSESLint } from "@typescript-eslint/utils";
import fs from "node:fs";
import glob from "glob";
import path from "node:path";
import util from "node:util";
import resolve from "resolve";
import {
  rules,
  serializedLocations,
  serializeReference,
  BookDef,
  CatalogDef,
  TranslationUsage,
} from "@hi18n/eslint-plugin";
import { loadConfig } from "./config";

export type Options = {
  cwd: string;
  include?: string[] | undefined;
  exclude?: string[] | undefined;
  checkOnly?: boolean | undefined;
};

export async function sync(options: Options) {
  const {
    cwd: projectPath,
    include: includeFromOpt,
    exclude: excludeFromOpt,
  } = options;
  const config = await loadConfig(projectPath);
  const include = config.include ?? includeFromOpt;
  const exclude = config.exclude ?? excludeFromOpt;
  if (include === undefined || include.length === 0) {
    throw new Error("No include specified");
  }
  const linterConfig: TSESLint.Linter.Config = {
    parser: config.parser as string,
    parserOptions: config.parserOptions,
  };

  const linter = new TSESLint.Linter({ cwd: projectPath });

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
      const { resolved } = await resolveWithFallback(
        removeExtension(loc.path, config.extensionsToRemove),
        {
          basedir: path.dirname(loc.base),
          extensions: config.extensions,
        },
        config.baseUrl,
        config.paths
      );
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
        const { resolved } = await resolveWithFallback(
          removeExtension(loc.path, config.extensionsToRemove),
          {
            basedir: path.dirname(loc.base),
            extensions: config.extensions,
          },
          config.baseUrl,
          config.paths
        );
        loc.path = resolved;
      }
      setRecordValue(linkage, serializeReference(loc), primaryName);
      rewriteTargetFiles.add(loc.path !== undefined ? loc.path : loc.base);
    }
    rewriteTargetFiles.add(bookDef.bookLocation.path);
  }

  const valueHints: Record<string, Record<string, string>> = {};

  // Set up passive importing
  if (config.connector) {
    const c = config.connector.connector(
      config.configPath,
      config.connectorOptions
    );
    if (c.importData) {
      const data = await c.importData();
      for (const [locale, catalog] of Object.entries(data.translations)) {
        const vhCatalog = (valueHints[locale] ??= {});
        for (const [id, msg] of Object.entries(catalog)) {
          vhCatalog[id] ??= msg.raw;
        }
      }
    }
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
          "@hi18n/value-hints": valueHints,
        },
      },
      { filename: rewriteTargetFile }
    );
    checkMessages(rewriteTargetFile, report.messages);
    if (report.fixed) {
      if (options.checkOnly) {
        throw new Error(
          `Found diff in ${path.relative(projectPath, rewriteTargetFile)}`
        );
      }
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

type ResolveResult = {
  resolved: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pkg: { name: string; version: string; [key: string]: any } | undefined;
};

function removeExtension(id: string, extensionsToRemove: string[]): string {
  for (const ext of extensionsToRemove) {
    if (id.endsWith(ext)) {
      return id.substring(0, id.length - ext.length);
    }
  }
  return id;
}

async function resolveWithFallback(
  id: string,
  opts: resolve.AsyncOpts,
  baseUrl?: string,
  paths?: Record<string, string[]>
): Promise<ResolveResult> {
  if (baseUrl && isPackageLikePath(id)) {
    const matchers = Object.entries(paths ?? {});
    matchers.push(["*", ["*"]]);
    for (const [matcher, candidates] of matchers) {
      let replacement: string | undefined = undefined;
      if (id === matcher) {
        replacement = "";
      } else if (
        matcher.endsWith("*") &&
        id.startsWith(matcher.substring(0, matcher.length - 1))
      ) {
        replacement = id.substring(matcher.length - 1);
      }
      if (replacement === undefined) continue;
      for (const candidate of candidates) {
        try {
          return await resolveAsPromise(
            path.resolve(baseUrl, candidate.replace("*", replacement)),
            opts
          );
        } catch (_e) {
          // Likely MODULE_NOT_FOUND
        }
      }
    }
  }
  return await resolveAsPromise(id, opts);
}

function resolveAsPromise(
  id: string,
  opts: resolve.AsyncOpts
): Promise<ResolveResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    resolve(id, opts, (err, resolved, pkg) => {
      if (err) rejectPromise(err);
      else resolvePromise({ resolved: resolved!, pkg });
    });
  });
}

function isPackageLikePath(p: string): boolean {
  const firstSegment = p.split(/[/\\]/)[0];
  return firstSegment !== "." && firstSegment !== ".." && !path.isAbsolute(p);
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
