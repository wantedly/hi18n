import { TSESLint } from "@typescript-eslint/utils";
import fs from "node:fs";
import { glob } from "glob";
import path from "node:path";
import resolve from "resolve";
import {
  getCollectBookDefinitionsRule,
  getCollectCatalogDefinitionsRule,
  getCollectTranslationIdsRule,
  noMissingTranslationIdsInTypesRule,
  noMissingTranslationIdsRule,
  noUnusedTranslationIdsInTypesRule,
  noUnusedTranslationIdsRule,
  serializedLocations,
  serializeReference,
  type BookDef,
  type CatalogDef,
  type TranslationUsage,
} from "@hi18n/eslint-plugin/internal-rules";
import { loadConfig } from "./config.ts";

export type Options = {
  cwd: string;
  include?: string[] | undefined;
  exclude?: string[] | undefined;
  checkOnly?: boolean | undefined;
};

export async function sync(options: Options): Promise<void> {
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

  const translationUsages: TranslationUsage[] = [];
  const bookDefs: BookDef[] = [];
  const catalogDefs: CatalogDef[] = [];
  const linterConfig: TSESLint.FlatConfig.Config = {
    languageOptions: {
      parser: config.parser as TSESLint.Parser.LooseParserModule,
      parserOptions: config.parserOptions,
    },
    plugins: {
      "@hi18n": {
        rules: {
          "collect-translation-ids": getCollectTranslationIdsRule((record) =>
            translationUsages.push(record),
          ),
          "collect-book-definitions": getCollectBookDefinitionsRule((record) =>
            bookDefs.push(record),
          ),
          "collect-catalog-definitions": getCollectCatalogDefinitionsRule(
            (record) => catalogDefs.push(record),
          ),
          "no-missing-translation-ids": noMissingTranslationIdsRule,
          "no-unused-translation-ids": noUnusedTranslationIdsRule,
          "no-missing-translation-ids-in-types":
            noMissingTranslationIdsInTypesRule,
          "no-unused-translation-ids-in-types":
            noUnusedTranslationIdsInTypesRule,
        },
      },
    },
  };

  const linter = new TSESLint.Linter({ cwd: projectPath });

  const files: string[] = [];
  for (const includeGlob of include) {
    files.push(
      ...(await glob(includeGlob, {
        cwd: projectPath,
        nodir: true,
        ignore: exclude ?? [],
      })),
    );
  }
  for (const relative of files) {
    const filename = path.join(projectPath, relative);
    const source = await fs.promises.readFile(filename, "utf-8");
    const messages = linter.verify(
      source,
      [
        { files: ["**"] },
        {
          ...linterConfig,
          rules: {
            "@hi18n/collect-translation-ids": "error",
            "@hi18n/collect-book-definitions": "error",
            "@hi18n/collect-catalog-definitions": "error",
          },
        },
      ],
      { filename },
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
        config.paths,
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
      hasOwn(usedTranslationIds, locName) ? usedTranslationIds[locName]! : [],
    );
    const uniqueTranslationIds = Array.from(
      new Set(concatenatedTranslationIds),
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
          config.paths,
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
      config.connectorOptions,
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
    const original = await fs.promises.readFile(rewriteTargetFile, "utf-8");
    let current = await fs.promises.readFile(rewriteTargetFile, "utf-8");

    function applyFix(
      rules: Partial<Record<string, TSESLint.SharedConfig.RuleEntry>>,
    ): boolean {
      const report = linter.verifyAndFix(
        current,
        [
          { files: ["**"] },
          {
            ...linterConfig,
            rules,
            settings: {
              "@hi18n/linkage": linkage,
              "@hi18n/used-translation-ids": usedTranslationIds,
              "@hi18n/value-hints": valueHints,
            },
          },
        ],
        { filename: rewriteTargetFile },
      );
      checkMessages(rewriteTargetFile, report.messages);
      if (report.fixed) {
        current = report.output;
      }
      return report.fixed;
    }

    applyFix({ "@hi18n/no-unused-translation-ids": "warn" });
    applyFix({ "@hi18n/no-unused-translation-ids-in-types": "warn" });
    applyFix({ "@hi18n/no-missing-translation-ids": "warn" });
    applyFix({ "@hi18n/no-missing-translation-ids-in-types": "warn" });

    if (current !== original) {
      if (options.checkOnly) {
        throw new Error(
          `Found diff in ${path.relative(projectPath, rewriteTargetFile)}`,
        );
      }
      await fs.promises.writeFile(rewriteTargetFile, current, "utf-8");
    }
  }
}

function checkMessages(
  filepath: string,
  messages: TSESLint.Linter.LintMessage[],
) {
  for (const message of messages) {
    if (/^Definition for rule .* was not found\.$/.test(message.message)) {
      // We load ESLint with minimal rules. Ignore the "missing rule" error.
      continue;
    }
    if (message.severity >= 2) {
      throw new Error(`Error on ${filepath}: ${message.message}`);
    } else if (message.severity >= 1) {
      console.warn(`Warning on ${filepath}: ${message.message}`);
    }
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
  paths?: Record<string, string[]>,
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
            opts,
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
  opts: resolve.AsyncOpts,
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
