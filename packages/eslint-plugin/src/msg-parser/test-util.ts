import type { TSESTree } from "@typescript-eslint/utils";
import type { JSString, JSStringPart } from "./js-string.ts";
import { MFEscapePart, type MessageNode } from "./ast.ts";

export function loc(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
): TSESTree.SourceLocation {
  return {
    start: { line: startLine, column: startCol },
    end: { line: endLine, column: endCol },
  };
}

export function noNode(): TSESTree.Expression {
  return (null as TSESTree.Expression | null)!;
}

export function cleanseJSString(node: JSString): JSString {
  return node.map((part) => {
    if (part.type === "UnknownJSStringPart") {
      return { ...part, node: noNode() };
    }
    return part;
  });
}

export function cleanseExtJSString(
  node: readonly (JSStringPart | MFEscapePart)[],
): (JSStringPart | MFEscapePart)[] {
  return node.map((part) => {
    if (part.type === "UnknownJSStringPart") {
      return { ...part, node: noNode() };
    }
    return part;
  });
}

export function cleanseMessageNode(node: MessageNode): MessageNode {
  switch (node.type) {
    case "Plaintext":
      return {
        ...node,
        parts: cleanseExtJSString(node.parts),
      };
    case "MessageList":
      return {
        ...node,
        subnodes: node.subnodes.map(cleanseMessageNode),
      };
    case "StringArg":
    case "NumberArg":
      return {
        ...node,
        nameParts: cleanseJSString(node.nameParts),
      };
    case "InvalidArg":
      return {
        ...node,
        nameParts: node.nameParts ? cleanseJSString(node.nameParts) : undefined,
      };
    case "UnknownJS":
      return {
        ...node,
        node: noNode(),
      };
    case "UnknownJSMF1":
      return {
        ...node,
        part: { ...node.part, node: noNode() },
      };
    default:
      return node;
  }
}
