import fs from "node:fs";
import { Hi18nData, Hi18nCatalogData, ConnectorObj } from "./connector";

export function connector(params: unknown): ConnectorObj {
  const { path } = params as {
    path: string;
  };

  async function exportData(data: Hi18nData): Promise<void> {
    let json = "{\n";
    const locales = Object.keys(data.translations).sort();
    locales.forEach((locale, i) => {
      const catalog = data.translations[locale]!;

      json += `  ${JSON.stringify(locale)}: {\n`;
      const ids = Object.keys(catalog).sort();
      ids.forEach((id, j) => {
        const msg = catalog[id]!;

        const comma = j + 1 === ids.length ? "" : ",";
        json += `    ${JSON.stringify(id)}: ${JSON.stringify(
          msg.raw
        )}${comma}\n`;
      });
      const comma = i + 1 === locales.length ? "" : ",";
      json += `  }${comma}\n`;
    });
    json += "}\n";

    await fs.promises.writeFile(path, json, "utf-8");
  }

  async function importData(): Promise<Hi18nData> {
    const json = await fs.promises.readFile(path, "utf-8");
    const obj = JSON.parse(json) as Record<string, Record<string, string>>;

    const translations: Record<string, Hi18nCatalogData> = {};
    for (const [locale, catalogObj] of Object.entries(obj)) {
      const catalog: Hi18nCatalogData = (translations[locale] = {});
      for (const [id, msg] of Object.entries(catalogObj)) {
        catalog[id] = { raw: msg };
      }
    }

    return {
      translations,
    };
  }

  return { exportData, importData };
}
