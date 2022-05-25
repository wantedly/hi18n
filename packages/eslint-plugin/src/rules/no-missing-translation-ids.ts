import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getStaticKey, lineIndent } from "../util";
import { catalogTracker } from "../common-trackers";
import { parseComments, ParseError, Parser } from "../microparser";
import { queryUsedTranslationIds } from "../used-ids";

type MessageIds = "missing-translation-ids";

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "suggestion",
  fixable: "code",
  docs: {
    description:
      "removes the unused translations and generates the skeletons for the undeclared translation ids",
    recommended: "error",
  },
  messages: {
    "missing-translation-ids": "missing translation ids",
  },
  schema: {},
};

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): TSESLint.RuleListener {
  const tracker = catalogTracker();
  tracker.listen('new import("@hi18n/core").Catalog()', (node, captured) => {
    const usedIds = queryUsedTranslationIds(context, node, true);
    const missingIdsSet = new Set(usedIds);

    const catalogData = captured["catalogData"]!;
    if (catalogData.type !== "ObjectExpression") return;

    for (const prop of catalogData.properties) {
      if (prop.type !== "Property") continue;
      const key = getStaticKey(prop);
      if (key === null) continue;
      missingIdsSet.delete(key);
    }

    if (missingIdsSet.size > 0) {
      const missingIds = Array.from(missingIdsSet);
      missingIds.sort();
      context.report({
        node: catalogData,
        messageId: "missing-translation-ids",
        *fix(fixer) {
          const candidates = collectCandidates(
            context.getSourceCode(),
            catalogData
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
              const placeholderText = `[TODO: ${missingId}]`;
              const insertAt = lo;
              if (insertAt === 0) {
                const firstCandidate = sortedCandidates[0];
                let indent: number;
                if (firstCandidate) {
                  indent = (
                    firstCandidate.node
                      ? firstCandidate.node
                      : firstCandidate.commentedOut[0]!
                  ).loc.start.column;
                } else {
                  const openBrace = context
                    .getSourceCode()
                    .getFirstToken(catalogData)!;
                  indent = lineIndent(context.getSourceCode(), openBrace) + 2;
                }
                const text = `\n${" ".repeat(indent)}${JSON.stringify(
                  missingId
                )}: msg.todo(${JSON.stringify(placeholderText)}),`;
                const token = context
                  .getSourceCode()
                  .getFirstToken(catalogData)!;
                yield fixer.insertTextAfter(token, text);
              } else {
                const lastCandidate = sortedCandidates[insertAt - 1]!;
                const indent = (
                  lastCandidate.node
                    ? lastCandidate.node
                    : lastCandidate.commentedOut[0]!
                ).loc.start.column;
                const text = `\n${" ".repeat(indent)}${JSON.stringify(
                  missingId
                )}: msg.todo(${JSON.stringify(placeholderText)}),`;
                const node = extendNode(
                  context.getSourceCode(),
                  lastCandidate.node
                    ? lastCandidate.node
                    : lastCandidate.commentedOut[
                        lastCandidate.commentedOut.length - 1
                      ]!
                );
                yield fixer.insertTextAfterRange(node.range, text);
              }
            }
          }
        },
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}

type Candidate = LiveCandidate | CommentedOutCandidate;
type LiveCandidate = {
  id: string;
  node: TSESTree.Property;
  commentedOut?: never;
  precedingComments: TSESTree.Comment[];
};
type CommentedOutCandidate = {
  id: string;
  node?: never;
  commentedOut: TSESTree.Comment[];
  precedingComments: TSESTree.Comment[];
};

function* unCommentCandidate(
  fixer: TSESLint.RuleFixer,
  candidate: Candidate
): Generator<TSESLint.RuleFix> {
  if (candidate.node) return;
  const trimStart = Math.min(
    ...candidate.commentedOut.map((c) => /^\s*/.exec(c.value)![0]!.length)
  );
  for (const comment of candidate.commentedOut) {
    const value = comment.value.substring(trimStart).trimEnd();
    yield fixer.replaceTextRange(comment.range, value);
  }
}

function collectCandidates(
  sourceCode: TSESLint.SourceCode,
  catalogData: TSESTree.ObjectExpression
): Candidate[] {
  const candidateNodes: Candidate[] = [];
  for (const prop of catalogData.properties) {
    const precedingComments = getPrecedingComments(sourceCode, prop);
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

    if (prop.type !== "Property") continue;
    const key = getStaticKey(prop);
    if (key === null) continue;
    candidateNodes.push({
      id: key,
      node: prop,
      precedingComments: trueComments,
    });
  }
  {
    const lastComments = getLastComments(sourceCode, catalogData.properties);
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

function parsePart(parser: Parser): TSESTree.Property {
  const node = parser.parseProperty();
  parser.expectPunct(",");
  if (getStaticKey(node) === null) throw new ParseError();
  return node;
}

function getPrecedingComments(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node
): TSESTree.Comment[] {
  const comments: TSESTree.Comment[] = [];
  let lastLine: number = -1;
  while (true) {
    const current = comments.length > 0 ? comments[comments.length - 1]! : node;
    const commentOrToken = sourceCode.getTokenBefore(current, {
      includeComments: true,
    });
    if (!commentOrToken) break;
    if (commentOrToken.type !== "Line" && commentOrToken.type !== "Block") {
      lastLine = commentOrToken.loc.end.line;
      break;
    }
    comments.push(commentOrToken);
  }
  // Remove in-line comments
  while (
    comments.length > 0 &&
    comments[comments.length - 1]!.loc.start.line === lastLine
  ) {
    comments.pop();
  }
  comments.reverse();
  return comments;
}

function getLastComments(
  sourceCode: TSESLint.SourceCode,
  nodes: TSESTree.Node[]
): TSESTree.Comment[] {
  if (nodes.length === 0) return [];
  const lastNode = nodes[nodes.length - 1]!;
  const maybeComma = sourceCode.getTokenAfter(lastNode, {
    includeComments: false,
  });
  let lastToken: TSESTree.Node | TSESTree.Comment | TSESTree.Token =
    maybeComma && maybeComma.type === "Punctuator" && maybeComma.value === ","
      ? maybeComma
      : lastNode;
  const lastLine = lastToken.loc.end.line;
  const comments: TSESTree.Comment[] = [];
  while (true) {
    const nextToken: TSESTree.Comment | TSESTree.Token | null =
      sourceCode.getTokenAfter(lastToken, { includeComments: true });
    if (!nextToken) break;
    if (nextToken.type === "Line" || nextToken.type === "Block") {
      if (nextToken.loc.start.line > lastLine) {
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
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node | TSESTree.Comment
): TSESTree.Node | TSESTree.Comment | TSESTree.Token {
  const maybeComma = sourceCode.getTokenAfter(node, { includeComments: false });
  let lastToken: TSESTree.Node | TSESTree.Comment | TSESTree.Token =
    maybeComma && maybeComma.type === "Punctuator" && maybeComma.value === ","
      ? maybeComma
      : node;
  const lastLine = lastToken.loc.end.line;
  while (true) {
    const nextToken: TSESTree.Comment | TSESTree.Token | null =
      sourceCode.getTokenAfter(lastToken, { includeComments: true });
    if (
      nextToken &&
      (nextToken.type === "Line" || nextToken.type === "Block") &&
      nextToken.loc.start.line === lastLine
    ) {
      lastToken = nextToken;
    } else {
      break;
    }
  }
  return lastToken;
}
