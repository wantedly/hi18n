/**
 * An interface a connector should implement.
 *
 * A connector module should export a function called "connector" satisfying this type.
 *
 * @param configPath Where the connector was loaded from.
 * @param params The `connectorOptions` value from the config.
 * @returns an object containing an exporter and/or an importer.
 *
 * @since 0.1.0 (`@hi18n/tools-core`)
 */
export type Connector = (configPath: string, params: unknown) => ConnectorObj;

/**
 * An object returned from the connector function.
 */
export type ConnectorObj = {
  /**
   * An importer function. It is `undefined` if the connector doesn't support importing.
   */
  importData?: Importer | undefined;
  /**
   * An exporter function. It is `undefined` if the connector doesn't support exporting.
   */
  exportData?: Exporter | undefined;
};

/**
 * Imports data from an external source.
 */
export type Importer = () => Promise<Hi18nData>;
/**
 * Exports data to an external store.
 */
export type Exporter = (data: Hi18nData) => Promise<void>;

/**
 * A data exchanged between hi18n and an external store.
 */
export type Hi18nData = {
  /**
   * Translation data per locale.
   *
   * @example
   *   ```ts
   *   hi18nData.translations["ja"]["example/greeting"].raw
   *   // => Something like "Hello, {name}!"
   *   ```
   */
  translations: Record<string, Hi18nCatalogData>;
};
export type Hi18nCatalogData = Record<string, Message>;
/**
 * A single translated message.
 */
export type Message = {
  /**
   * Translation text, formatted in hi18n's MessageFormat.
   */
  raw: string;
};
