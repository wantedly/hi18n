import type { TSESTree } from "@typescript-eslint/utils";
import type { JSString, JSStringPart } from "./js-string.ts";

export type MessageNode =
  | PlaintextNode
  | MessageListNode
  | ArgNode
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
  /**
   * The expression that yields a string.
   */
  parts: readonly (JSStringPart | MFEscapePart)[];
};
export function PlaintextNode(
  parts: readonly (JSStringPart | MFEscapePart)[],
): PlaintextNode {
  return { type: "Plaintext", parts };
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
  name: JSString;
};
export function StringArgNode(name: JSString): StringArgNode {
  return { type: "StringArg", name };
}

export type UnknownJSNode = {
  type: "UnknownJS";
  node: TSESTree.Expression;
};
export function UnknownJSNode(node: TSESTree.Expression): UnknownJSNode {
  return { type: "UnknownJS", node };
}
