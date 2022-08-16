import path from "node:path";
import { cosmiconfig } from "cosmiconfig";
import { ParserServices, TSESLint, TSESTree } from "@typescript-eslint/utils";
import resolve from "resolve";
import { Connector } from "@hi18n/tools-core";
import * as jsonMfConnector from "./json-mf-connector";

const explorer = cosmiconfig("hi18n");

export type ParserSpec = string | ParserDependency;
export type ParserDependency = {
  definition: ParserDefinition;
  filePath: string;
};
export type ParserDefinition = ESLintParser | GenericParser;
export type ESLintParser = {
  parseForESLint: (
    source: string,
    options: TSESLint.ParserOptions
  ) => ESLintParserResult<TSESTree.Program>;
};
export type GenericParser = {
  parse: (source: string, options: TSESLint.ParserOptions) => TSESTree.Program;
};
export type ESLintParserResult<T> = {
  ast: T;
  services?: ParserServices | undefined;
  visitorKeys?: Record<string, string[]> | undefined;
  scopeManager?: TSESLint.Scope.ScopeManager | undefined;
};

export type ConnectorSpec = string | ConnectorDependency;
export type ConnectorDependency = {
  connector: Connector;
};

const DEFAULT_EXTENSIONS = [
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".cts",
  ".mts",
  ".jsx",
  ".tsx",
];

const DEFAULT_EXTENSIONS_TO_REMOVE = [".js", ".cjs", ".mjs"];

const DEFAULT_PARSER_OPTIONS: TSESLint.ParserOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
};

const configKeys = [
  "include",
  "exclude",
  "parser",
  "parserOptions",
  "extensions",
  "extensionsToRemove",
  "baseUrl",
  "paths",
  "connector",
  "connectorOptions",
];

export type Config = {
  configPath: string;
  include?: string[] | undefined;
  exclude?: string[] | undefined;
  parser: ParserSpec;
  parserOptions: TSESLint.ParserOptions;
  extensions: string[];
  extensionsToRemove: string[];
  baseUrl?: string | undefined;
  paths?: Record<string, string[]> | undefined;
  connector: ConnectorDependency | undefined;
  connectorOptions: unknown;
};

export async function loadConfig(cwd: string): Promise<Config> {
  const cosmiconfigResult = (await explorer.search(cwd)) ?? {
    config: {},
    filepath: path.join(cwd, ".hi18nrc.json"),
    isEmpty: true,
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { config, filepath } = cosmiconfigResult;
  if (!isObject(config)) {
    throw new Error("config: not an object");
  }
  if (!optional(isArrayOf(isString))(config["include"])) {
    throw new Error("config.include: not an array of strings");
  }
  if (!optional(isArrayOf(isString))(config["exclude"])) {
    throw new Error("config.exclude: not an array of strings");
  }
  if (!optional(oneof(isString, isParserDependency))(config["parser"])) {
    throw new Error("config.parser: not a string nor a parser object");
  }
  if (!optional(isObject)(config["parserOptions"])) {
    throw new Error("config.parserOptions: not an object");
  }
  if (!optional(isArrayOf(isString))(config["extensions"])) {
    throw new Error("config.extensions: not an array of strings");
  }
  if (!optional(isArrayOf(isString))(config["extensionsToRemove"])) {
    throw new Error("config.extensionsToRemove: not an array of strings");
  }
  if (!optional(isString)(config["baseUrl"])) {
    throw new Error("config.baseUrl: not a string");
  }
  if (!optional(isRecordOf(isArrayOf(isString)))(config["paths"])) {
    throw new Error("config.paths: not a record of arrays of strings");
  }
  if (!optional(oneof(isString, isConnectorDependency))(config["connector"])) {
    throw new Error("config.connector: not a string nor a parser object");
  }
  if (!optional(isObject)(config["connectorOptions"])) {
    throw new Error("config.connectorOptions: not an object");
  }
  for (const key of Object.keys(config)) {
    if (!configKeys.includes(key)) {
      throw new Error(`Unrecognized config: ${key}`);
    }
  }

  const include = config["include"];
  const exclude = config["exclude"];
  const parser = resolveParser(config["parser"], filepath);
  const parserOptions =
    (config["parserOptions"] as TSESLint.ParserOptions | undefined) ??
    DEFAULT_PARSER_OPTIONS;
  const extensions = expandExtensions(config["extensions"]);
  const extensionsToRemove = expandExtensionsToRemove(
    config["extensionsToRemove"]
  );
  const baseUrl = expandBaseUrl(config["baseUrl"], filepath);
  const paths = config["paths"];

  if (paths && !baseUrl) {
    throw new Error("baseUrl must be specified");
  }

  const connector = resolveConnector(config["connector"], filepath);
  const connectorOptions = config["connectorOptions"];

  return {
    configPath: filepath,
    include,
    exclude,
    parser,
    parserOptions,
    extensions,
    extensionsToRemove,
    baseUrl,
    paths,
    connector,
    connectorOptions,
  };
}

function resolveParser(
  parser: ParserSpec | undefined,
  filepath: string
): ParserDependency {
  if (typeof parser === "string") {
    const parserPath = resolve.sync(parser, {
      basedir: path.dirname(filepath),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { definition: require(parserPath), filePath: parserPath };
  } else if (typeof parser === "object") {
    return parser;
  }
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    definition: require("@babel/eslint-parser"),
    filePath: require.resolve("@babel/eslint-parser"),
  };
}

function resolveConnector(
  connector: ConnectorSpec | undefined,
  filepath: string
): ConnectorDependency | undefined {
  if (connector === "@hi18n/cli/json-mf-connector") {
    return jsonMfConnector;
  } else if (typeof connector === "string") {
    const connectorPath = resolve.sync(connector, {
      basedir: path.dirname(filepath),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return require(connectorPath);
  } else if (typeof connector === "object") {
    return connector;
  }
  return undefined;
}

function expandExtensions(extensions: string[] | undefined): string[] {
  if (extensions === undefined) return DEFAULT_EXTENSIONS;
  return extensions.flatMap((ext) =>
    ext === "..." ? DEFAULT_EXTENSIONS : [ext]
  );
}

function expandExtensionsToRemove(
  extensionsToRemove: string[] | undefined
): string[] {
  if (extensionsToRemove === undefined) return DEFAULT_EXTENSIONS_TO_REMOVE;
  return extensionsToRemove.flatMap((ext) =>
    ext === "..." ? DEFAULT_EXTENSIONS_TO_REMOVE : [ext]
  );
}

function expandBaseUrl(
  baseUrl: string | undefined,
  filepath: string
): string | undefined {
  if (baseUrl === undefined) return undefined;
  return path.resolve(path.dirname(filepath), baseUrl);
}

function isObject(x: unknown): x is object & Record<string, unknown> {
  return typeof x === "object";
}

function isString(x: unknown): x is string {
  return typeof x === "string";
}

// eslint-disable-next-line @typescript-eslint/ban-types
function isFunction(x: unknown): x is Function {
  return typeof x === "function";
}

function isArrayOf<T>(pred: (x: unknown) => x is T) {
  return function isArrayOf(x: unknown): x is T[] {
    return Array.isArray(x) && x.every((value) => pred(value));
  };
}

function isRecordOf<T>(pred: (x: unknown) => x is T) {
  return function isRecordOf(x: unknown): x is Record<string, T> {
    return isObject(x) && Object.values(x).every((value) => pred(value));
  };
}

function optional<T>(pred: (x: unknown) => x is T) {
  return function optional(x: unknown): x is T | undefined {
    return x === undefined || pred(x);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function oneof<Types extends any[]>(
  ...preds: { [K in keyof Types]: (x: unknown) => x is Types[K] }
) {
  return function oneof(x: unknown): x is Types[number] {
    return preds.some((pred) => pred(x));
  };
}

function isParserDependency(x: unknown): x is ParserDependency {
  return (
    isObject(x) &&
    isString(x["filePath"]) &&
    isObject(x["definition"]) &&
    (isFunction(x["definition"]["parseForESLint"]) ||
      isFunction(x["definition"]["parse"]))
  );
}

function isConnectorDependency(x: unknown): x is ConnectorDependency {
  return isObject(x) && isFunction(x["connector"]);
}
