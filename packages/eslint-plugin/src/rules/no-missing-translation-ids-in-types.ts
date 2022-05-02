import type { AST, Rule, SourceCode } from "eslint";
import { getStaticKey } from "../util";
import { Comment, Node } from "estree";
import { bookTracker } from "../common-trackers";
import { findTypeDefinition } from "../ts-util";
import {
  TSInterfaceBody,
  TSPropertySignature,
  TSSignature,
  TSTypeLiteral,
} from "../estree-ts";
import { parseComments, ParseError, Parser } from "../microparser";

export const meta: Rule.RuleMetaData = {
  type: "suggestion",
  fixable: "code",
  docs: {
    description:
      "removes the unused translations and generates the skeletons for the undeclared translation ids",
    recommended: false,
  },
  messages: {
    "missing-translation-ids": "missing translation ids",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = bookTracker();
  tracker.listen("book", (node, _captured) => {
    const usedIds: unknown = context.settings["@hi18n/used-translation-ids"];
    if (usedIds === undefined)
      throw new Error(
        'settings["@hi18n/used-translation-ids"] not found\nNote: this rule is for an internal use.'
      );
    if (
      !Array.isArray(usedIds) ||
      !usedIds.every((k): k is string => typeof k === "string")
    )
      throw new Error("Invalid usedIds");
    const missingIdsSet = new Set(usedIds);

    const objinfo = findTypeDefinition(
      context.getSourceCode().scopeManager,
      node as Rule.Node
    );
    if (!objinfo) return;

    for (const signature of objinfo.signatures) {
      if (signature.type !== "TSPropertySignature") continue;
      const key = getStaticKey(signature);
      if (key === null) continue;
      missingIdsSet.delete(key);
    }

    if (missingIdsSet.size > 0) {
      const missingIds = Array.from(missingIdsSet);
      missingIds.sort();
      context.report({
        node: objinfo.body as
          | Rule.Node
          | TSInterfaceBody
          | TSTypeLiteral as Rule.Node,
        messageId: "missing-translation-ids",
        *fix(fixer) {
          const candidates = collectCandidates(
            context.getSourceCode(),
            objinfo.signatures
          );
          const candidateIndices = new Map<string, number>();
          for (let i = 0; i < candidates.length; i++) {
            candidateIndices.set(candidates[i]!.id, i);
          }
          const sortedCandidates: Candidate[] = candidates
            .slice()
            .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

          for (const missingId of missingIds) {
            const candidateIndex = candidateIndices.get(missingId);
            if (candidateIndex !== undefined) {
              yield* unCommentCandidate(fixer, candidates[candidateIndex]!);
            } else {
              let lo = 0,
                hi = sortedCandidates.length;
              while (lo < hi) {
                const mid = lo + (0 | ((hi - lo) / 2));
                if (missingId < sortedCandidates[mid]!.id) {
                  hi = mid;
                } else {
                  lo = mid + 1;
                }
              }
              const insertAt = lo;
              if (insertAt === 0) {
                const firstCandidate = sortedCandidates[0]!;
                const indent = (
                  firstCandidate.node
                    ? firstCandidate.node
                    : firstCandidate.commentedOut[0]!
                ).loc!.start.column;
                const text = `\n${" ".repeat(indent)}${JSON.stringify(
                  missingId
                )}: Message;`;
                const token = context
                  .getSourceCode()
                  .getFirstToken(
                    objinfo.body as
                      | Rule.Node
                      | TSInterfaceBody
                      | TSTypeLiteral as Rule.Node
                  )!;
                yield fixer.insertTextAfter(token, text);
              } else {
                const lastCandidate = sortedCandidates[insertAt - 1]!;
                const indent = (
                  lastCandidate.node
                    ? lastCandidate.node
                    : lastCandidate.commentedOut[0]!
                ).loc!.start.column;
                const text = `\n${" ".repeat(indent)}${JSON.stringify(
                  missingId
                )}: Message;`;
                const node = extendNode(
                  context.getSourceCode(),
                  lastCandidate.node
                    ? (lastCandidate.node as Node | TSPropertySignature as Node)
                    : lastCandidate.commentedOut[
                        lastCandidate.commentedOut.length - 1
                      ]!
                );
                yield fixer.insertTextAfterRange(node.range!, text);
              }
            }
          }
        },
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager, node);
    },
  };
}

type Candidate = LiveCandidate | CommentedOutCandidate;
type LiveCandidate = {
  id: string;
  node: TSPropertySignature;
  commentedOut?: never;
  precedingComments: Comment[];
};
type CommentedOutCandidate = {
  id: string;
  node?: never;
  commentedOut: Comment[];
  precedingComments: Comment[];
};

function* unCommentCandidate(
  fixer: Rule.RuleFixer,
  candidate: Candidate
): Generator<Rule.Fix> {
  if (candidate.node) return;
  const trimStart = Math.min(
    ...candidate.commentedOut.map((c) => /^\s*/.exec(c.value)![0]!.length)
  );
  for (const comment of candidate.commentedOut) {
    const value = comment.value.substring(trimStart).trimEnd();
    yield fixer.replaceTextRange(comment.range!, value);
  }
}

function collectCandidates(
  sourceCode: SourceCode,
  signatures: TSSignature[]
): Candidate[] {
  const candidateNodes: Candidate[] = [];
  for (const signature of signatures) {
    const precedingComments = getPrecedingComments(
      sourceCode,
      signature as Node | TSSignature as Node
    );
    const { parts: commentedOutCandidates, rest: trueComments } = parseComments(
      precedingComments,
      parsePart
    );
    candidateNodes.push(
      ...commentedOutCandidates.map((c) => ({
        id: getStaticKey(c.node)!,
        commentedOut: c.commentedOut,
        precedingComments: c.leadingComments,
      }))
    );

    if (signature.type !== "TSPropertySignature") continue;
    const key = getStaticKey(signature);
    if (key === null) continue;
    candidateNodes.push({
      id: key,
      node: signature,
      precedingComments: trueComments,
    });
  }
  {
    const lastComments = getLastComments(
      sourceCode,
      signatures as (Node | TSSignature)[] as Node[]
    );
    const { parts: commentedOutCandidates } = parseComments(
      lastComments,
      parsePart
    );
    candidateNodes.push(
      ...commentedOutCandidates.map((c) => ({
        id: getStaticKey(c.node)!,
        commentedOut: c.commentedOut,
        precedingComments: c.leadingComments,
      }))
    );
  }
  return candidateNodes;
}

function parsePart(parser: Parser): TSPropertySignature {
  const node = parser.parseTSSignature();
  parser.tryPunct(",") || parser.expectSemi();
  if (node.type !== "TSPropertySignature") throw new ParseError();
  if (getStaticKey(node) === null) throw new ParseError();
  return node;
}

function getPrecedingComments(sourceCode: SourceCode, node: Node): Comment[] {
  const comments: Comment[] = [];
  let lastLine: number = -1;
  while (true) {
    const current = comments.length > 0 ? comments[comments.length - 1]! : node;
    const commentOrToken = sourceCode.getTokenBefore(current, {
      includeComments: true,
    });
    if (!commentOrToken) break;
    if (commentOrToken.type !== "Line" && commentOrToken.type !== "Block") {
      lastLine = commentOrToken.loc!.end.line;
      break;
    }
    comments.push(commentOrToken);
  }
  // Remove in-line comments
  while (
    comments.length > 0 &&
    comments[comments.length - 1]!.loc!.start.line === lastLine
  ) {
    comments.pop();
  }
  comments.reverse();
  return comments;
}

function getLastComments(sourceCode: SourceCode, nodes: Node[]): Comment[] {
  if (nodes.length === 0) return [];
  const lastNode = nodes[nodes.length - 1]!;
  const maybePunct = sourceCode.getTokenAfter(lastNode, {
    includeComments: false,
  });
  let lastToken: Node | Comment | AST.Token =
    maybePunct &&
    maybePunct.type === "Punctuator" &&
    (maybePunct.value === "," || maybePunct.value === ";")
      ? maybePunct
      : lastNode;
  const lastLine = lastToken.loc!.end.line;
  const comments: Comment[] = [];
  while (true) {
    const nextToken: Comment | AST.Token | null = sourceCode.getTokenAfter(
      lastToken,
      { includeComments: true }
    );
    if (!nextToken) break;
    if (nextToken.type === "Line" || nextToken.type === "Block") {
      if (nextToken.loc!.start.line > lastLine) {
        comments.push(nextToken);
      }
    } else {
      break;
    }
    lastToken = nextToken;
  }
  return comments;
}

function extendNode(
  sourceCode: SourceCode,
  node: Node | Comment
): Node | Comment | AST.Token {
  const maybePunct = sourceCode.getTokenAfter(node, { includeComments: false });
  let lastToken: Node | Comment | AST.Token =
    maybePunct &&
    maybePunct.type === "Punctuator" &&
    (maybePunct.value === "," || maybePunct.value === ";")
      ? maybePunct
      : node;
  const lastLine = lastToken.loc!.end.line;
  while (true) {
    const nextToken: Comment | AST.Token | null = sourceCode.getTokenAfter(
      lastToken,
      { includeComments: true }
    );
    if (
      nextToken &&
      (nextToken.type === "Line" || nextToken.type === "Block") &&
      nextToken.loc!.start.line === lastLine
    ) {
      lastToken = nextToken;
    } else {
      break;
    }
  }
  return lastToken;
}
