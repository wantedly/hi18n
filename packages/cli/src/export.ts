import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import glob from "glob";
import { TSESLint } from "@typescript-eslint/utils";
import { rules, CatalogDef } from "@hi18n/eslint-plugin";
import { loadConfig } from "./config";
import { Hi18nCatalogData } from "@hi18n/tools-core";

export type Options = {
  cwd: string;
};

export async function export_(options: Options) {
  const { cwd } = options;
  const config = await loadConfig(cwd);
  const include = config.include;
  const exclude = config.exclude;
  if (include === undefined || include.length === 0) {
    throw new Error("No include specified");
  }

  if (!config.connector) {
    throw new Error("Connector not configured");
  }

  const linterConfig: TSESLint.Linter.Config = {
    parser: config.parser as string,
    parserOptions: config.parserOptions,
  };

  const linter = new TSESLint.Linter({ cwd });

  const catalogDefs: CatalogDef[] = [];
  linter.defineRule(
    "@hi18n/collect-catalog-definitions",
    rules["collect-catalog-definitions"]
  );

  const files: string[] = [];
  for (const includeGlob of include) {
    files.push(
      ...(await util.promisify(glob)(includeGlob, {
        cwd,
        nodir: true,
        ignore: exclude,
      }))
    );
  }
  for (const relative of files) {
    const filename = path.join(cwd, relative);
    const source = await fs.promises.readFile(filename, "utf-8");
    const messages = linter.verify(
      source,
      {
        ...linterConfig,
        rules: {
          "@hi18n/collect-catalog-definitions": [
            "error",
            (c: CatalogDef) => {
              catalogDefs.push(c);
            },
            {
              requestMessages: true,
            },
          ],
        },
      },
      { filename }
    );
    checkMessages(relative, messages);
  }
  const translations: Record<string, Hi18nCatalogData> = {};
  for (const catalogDef of catalogDefs) {
    if (!catalogDef.locale) {
      throw new Error(`No locale given in ${catalogDef.catalogLocation.path}`);
    }
    const locale = catalogDef.locale;
    const catalogData = (translations[locale] ??= {});
    for (const [key, messageDef] of Object.entries(catalogDef.messages)) {
      catalogData[key] = { raw: messageDef.value };
    }
  }
  const c = config.connector.connector(
    config.configPath,
    config.connectorOptions
  );
  if (!c.exportData) {
    throw new Error("This connector doesn't support exporting");
  }

  await c.exportData({ translations });
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
