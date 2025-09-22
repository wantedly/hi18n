import type { TSESTree } from "@typescript-eslint/utils";
import {
  MessageListNode,
  PlaintextNode,
  UnknownJSNode,
  type MessageNode,
} from "./ast.ts";
import { isStringType } from "./js-string.ts";
import { parseJSString, parseTaggedQuasis } from "./js-string-parser.ts";
import { parseMF1 } from "./mf1-parser.ts";
import type { Diagnostic } from "./diagnostic.ts";

const msgFuncPattern = /(^msg|Msg)($|[A-Z])/;
const mf1FuncPattern = /(^mf1|Mf1)($|[A-Z])/;

export function parseJSAsMessage(
  node: TSESTree.Expression,
  diagnostics: Diagnostic[],
): MessageNode {
  const nodeAsString = parseJSString(node);
  if (isStringType(nodeAsString)) {
    return PlaintextNode("js", nodeAsString);
  }
  switch (node.type) {
    case "CallExpression": {
      const callee = node.callee;
      if (
        callee.type === "Identifier" &&
        (msgFuncPattern.test(callee.name) || mf1FuncPattern.test(callee.name))
      ) {
        // Parse msg(...) or mf1(...)
        if (node.arguments.length < 1) {
          return UnknownJSNode(node);
        }
        const firstArg = node.arguments[0]!;
        if (firstArg.type === "SpreadElement") {
          return UnknownJSNode(node);
        }
        const parsedFirstArg = parseJSString(firstArg);
        if (!isStringType(parsedFirstArg)) {
          return UnknownJSNode(node);
        }
        return parseMF1(parsedFirstArg, diagnostics);
      }
      break;
    }
    case "TaggedTemplateExpression": {
      const tag = node.tag;
      if (tag.type === "Identifier" && msgFuncPattern.test(tag.name)) {
        // Parse msg`...`
        return parseMsgTagged(node, diagnostics);
      }
    }
  }
  return UnknownJSNode(node);
}

function parseMsgTagged(
  node: TSESTree.TaggedTemplateExpression,
  diagnostics: Diagnostic[],
): MessageNode {
  const parsedQuasis = parseTaggedQuasis(node.quasi.quasis, diagnostics);
  const subnodes: MessageNode[] = [];
  for (let i = 0; i < parsedQuasis.length; i++) {
    const quasi = parsedQuasis[i]!;
    appendSubnode(subnodes, PlaintextNode("js", quasi));

    if (i < node.quasi.expressions.length) {
      const expr = node.quasi.expressions[i]!;
      appendSubnode(subnodes, parseJSAsMessage(expr, diagnostics));
    }
  }
  if (subnodes.length === 1) {
    return subnodes[0]!;
  }
  return MessageListNode(subnodes);
}

function appendSubnode(subnodes: MessageNode[], node: MessageNode): void {
  if (node.type === "MessageList") {
    for (const child of node.subnodes) {
      appendSubnode(subnodes, child);
    }
    return;
  }
  const last = subnodes[subnodes.length - 1];
  if (last?.type === "Plaintext" && node.type === "Plaintext") {
    // Merge adjacent plaintext nodes
    subnodes[subnodes.length - 1] = PlaintextNode("js", last.parts);
    return;
  }
  subnodes.push(node);
}
