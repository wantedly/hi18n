import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import yaml from "js-yaml";
import type {
  Hi18nData,
  Hi18nCatalogData,
  ConnectorObj,
} from "@hi18n/tools-core";
import { convertMessage, isMessage } from "./message.js";

export function connector(configPath: string, params: unknown): ConnectorObj {
  const { root: relativeRoot = ".", include = ["config/locales/*.yml"] } =
    params as {
      root?: string | undefined;
      include?: string[] | undefined;
    };

  if (typeof relativeRoot !== "string") {
    throw new Error("connectorOptions.root is not a string");
  }
  if (!Array.isArray(include) || !include.every((p) => typeof p === "string")) {
    throw new Error("connectorOptions.include is not an array of strings");
  }

  const root = path.resolve(path.dirname(configPath), relativeRoot);

  async function importData(): Promise<Hi18nData> {
    const files = new Set<string>();
    for (const pattern of include) {
      const globbed = await glob(pattern, {
        cwd: root,
      });
      for (const file of globbed) {
        files.add(file);
      }
    }
    const filelist = Array.from(files).sort();

    const translations: Record<string, Hi18nCatalogData> = {};

    for (const file of filelist) {
      const yamlData = yaml.load(
        await fs.promises.readFile(path.resolve(root, file), "utf-8"),
      );
      if (!isObject(yamlData)) continue;

      for (const [locale, yamlLocaleData] of Object.entries(yamlData)) {
        const localeTranslations = (translations[locale] ??= {});

        function traverse(obj: unknown, key: string) {
          if (isMessage(obj) && key.length > 0) {
            localeTranslations[key.substring(1)] = { raw: convertMessage(obj) };
          }

          if (isObject(obj)) {
            for (const [subkey, subobj] of Object.entries(obj)) {
              traverse(subobj, `${key}.${subkey}`);
            }
          }
        }

        traverse(yamlLocaleData, "");
      }
    }
    return { translations };
  }

  return { importData };
}

function isObject(obj: unknown): obj is object & Record<string, unknown> {
  return typeof obj === "object" && obj != null;
}
