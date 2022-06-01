import path from "node:path";
import { cosmiconfig } from "cosmiconfig";

const explorer = cosmiconfig("hi18n");

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

const configKeys = ["extensions", "baseUrl", "paths"];

export type Config = {
  extensions: string[];
  baseUrl?: string | undefined;
  paths?: Record<string, string[]> | undefined;
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
  if (!optional(isArrayOf(isString))(config["extensions"])) {
    throw new Error("config.extensions: not an array of strings");
  }
  if (!optional(isString)(config["baseUrl"])) {
    throw new Error("config.baseUrl: not a string");
  }
  if (!optional(isRecordOf(isArrayOf(isString)))(config["paths"])) {
    throw new Error("config.paths: not a record of arrays of strings");
  }
  for (const key of Object.keys(config)) {
    if (!configKeys.includes(key)) {
      throw new Error(`Unrecognized config: ${key}`);
    }
  }

  const extensions = expandExtensions(config["extensions"]);
  const baseUrl = expandBaseUrl(config["baseUrl"], filepath);
  const paths = config["paths"];

  if (paths && !baseUrl) {
    throw new Error("baseUrl must be specified");
  }

  return {
    extensions,
    baseUrl,
    paths,
  };
}

function expandExtensions(extensions: string[] | undefined): string[] {
  if (extensions === undefined) return DEFAULT_EXTENSIONS;
  return extensions.flatMap((ext) =>
    ext === "..." ? DEFAULT_EXTENSIONS : [ext]
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
