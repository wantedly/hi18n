import type { TSESTree } from "@typescript-eslint/utils";
import type { JSString, JSStringPart } from "./js-string.ts";

export type MessageNode =
  | PlaintextNode
  | MessageListNode
  | ArgNode
  | InvalidArgNode
  | UnknownJSNode;

export type MessageListNode = {
  type: "MessageList";
  subnodes: readonly MessageNode[];
};
export function MessageListNode(
  subnodes: readonly MessageNode[],
): MessageListNode {
  return { type: "MessageList", subnodes };
}

export type PlaintextNode = {
  type: "Plaintext";
  style: "js" | "mf1";
  /**
   * The expression that yields a string.
   */
  parts: readonly (JSStringPart | MFEscapePart)[];
};
export function PlaintextNode(
  style: "js" | "mf1",
  parts: readonly (JSStringPart | MFEscapePart)[],
): PlaintextNode {
  return { type: "Plaintext", style, parts };
}

export type MFEscapePart = {
  type: "MFEscape";
  value: string;
  source: JSString;
};
export function MFEscapePart(value: string, source: JSString): MFEscapePart {
  return { type: "MFEscape", value, source };
}

export type ArgNode = StringArgNode;

export type StringArgNode = {
  type: "StringArg";
  name: string | number;
  nameParts: JSString;
};
export function StringArgNode(
  name: string | number,
  nameParts: JSString,
): StringArgNode {
  return { type: "StringArg", name, nameParts };
}

export type InvalidArgNode = {
  type: "InvalidArg";
  name: string | number | undefined;
  nameParts: JSString | undefined;
};
export function InvalidArgNode(
  name: string | number | undefined,
  nameParts: JSString | undefined,
): InvalidArgNode {
  return { type: "InvalidArg", name, nameParts };
}

export type UnknownJSNode = {
  type: "UnknownJS";
  node: TSESTree.Expression;
};
export function UnknownJSNode(node: TSESTree.Expression): UnknownJSNode {
  return { type: "UnknownJS", node };
}

export function extJSStringLoc(
  s: readonly (JSStringPart | MFEscapePart)[],
): TSESTree.SourceLocation | undefined {
  let start: TSESTree.Position | null = null;
  let end: TSESTree.Position | null = null;
  for (const part of s) {
    if (
      part.type === "UnknownJSStringPart" ||
      part.type == "ExternalString" ||
      part.type === "MFEscape"
    ) {
      continue;
    }
    start ??= part.loc.start;
    end = part.loc.end;
  }
  return start && end ? { start, end } : undefined;
}
