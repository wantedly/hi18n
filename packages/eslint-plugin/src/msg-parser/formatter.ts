import type { MessageNode } from "./ast.ts";

export class NotFormattableError extends Error {
  static {
    this.prototype.name = "NotFormattableError";
  }
}

export type FormatMessageAsJSOptions = {
  hasBuilderUtils?: boolean | undefined;
};

export function formatMessageAsJS(
  node: MessageNode,
  options?: FormatMessageAsJSOptions,
): string {
  const { hasBuilderUtils = true } = options ?? {};
  switch (node.type) {
    case "Plaintext": {
      if (!node.parts.every((part) => part.type !== "UnknownJSStringPart")) {
        throw new NotFormattableError("Not formattable: has unknown part");
      }
      const value = node.parts.map((part) => part.value).join("");
      if (node.style === "js") {
        return `msg\`${stringifyQuasi(value)}\``;
      } else {
        // `mf1` from `@hi18n/core/msg` is available since v0.2.1.
        // Before then, we used `msg` from `@hi18n/core`.
        const funcName = hasBuilderUtils ? "mf1" : "msg";
        return `${funcName}(${JSON.stringify(escapeForMF1(value))})`;
      }
    }
    default:
      throw new NotFormattableError(
        `TODO: formatting of node type: ${node.type}`,
      );
  }
}

function escapeForMF1(text: string): string {
  return text.replace(/['<#{]/g, (text) => {
    if (text === "'") {
      return "''";
    } else {
      return `'${text}'`;
    }
  });
}

function stringifyQuasi(text: string): string {
  return JSON.stringify(text)
    .slice(1, -1)
    .replace(/(?:`|\$\{|\\")/g, (text) => {
      if (text === '\\"') {
        // No need to escape double quotes
        return '"';
      }
      // Need to escape back quotes and interpolation-likes
      return `\\${text}`;
    });
}

export function formatMessageAsJSOrUndefined(
  node: MessageNode,
  options?: FormatMessageAsJSOptions,
): string | undefined {
  try {
    return formatMessageAsJS(node, options);
  } catch (e) {
    if (e instanceof NotFormattableError) {
      return undefined;
    }
    throw e;
  }
}
