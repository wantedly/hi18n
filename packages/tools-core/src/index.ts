export type Connector = (configPath: string, params: unknown) => ConnectorObj;

export type ConnectorObj = {
  importData?: Importer | undefined;
  exportData?: Exporter | undefined;
};

export type Importer = () => Promise<Hi18nData>;
export type Exporter = (data: Hi18nData) => Promise<void>;

export type Hi18nData = {
  translations: Record<string, Hi18nCatalogData>;
};
export type Hi18nCatalogData = Record<string, Message>;
export type Message = {
  raw: string;
};
