import type { AST, Rule, SourceCode } from "eslint";
import { getStaticKey } from "../util";
import { Tracker } from "../tracker";
import { Comment, Node, ObjectExpression, Property } from "estree";

export const meta: Rule.RuleMetaData = {
  type: "suggestion",
  fixable: "code",
  docs: {
    description: "removes the unused translations and generates the skeletons for the undeclared translation ids",
    recommended: true,
  },
  messages: {
    "missing-translation-ids": "missing translation ids",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember("import(\"@hi18n/core\")", "LocalCatalog");
  tracker.watchConstruct("import(\"@hi18n/core\").LocalCatalog", [
    {
      captureAs: "catalogData",
      path: ["0"],
    },
  ]);
  tracker.listen("new import(\"@hi18n/core\").LocalCatalog()", (_node, captured) => {
    const usedIds: unknown = context.settings["usedIds"];
    if (!Array.isArray(usedIds)) return;
    if (!usedIds.every((k): k is string => typeof k === "string")) return;
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
          const candidates = collectCandidates(context.getSourceCode(), catalogData);
          const candidateIndices = new Map<string, number>();
          for (let i = 0; i < candidates.length; i++) {
            candidateIndices.set(candidates[i]!.id, i);
          }
          for (const missingId of missingIds) {
            const candidateIndex = candidateIndices.get(missingId);
            if (candidateIndex !== undefined) {
              yield *unCommentCandidate(fixer, candidates[candidateIndex]!);
            } else {
              throw new Error("TODO");
            }
          }
        },
      });
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
};

type Candidate = LiveCandidate | CommentedOutCandidate;
type LiveCandidate = {
  id: string;
  node: Property;
  commentedOut?: never;
  precedingComments: Comment[];
};
type CommentedOutCandidate = {
  id: string;
  node?: never;
  commentedOut: Comment[];
  precedingComments: Comment[];
};

function* unCommentCandidate(fixer: Rule.RuleFixer, candidate: Candidate): Generator<Rule.Fix> {
  if (candidate.node) return;
  const trimStart = Math.min(...candidate.commentedOut.map((c) => /^\s*/.exec(c.value)![0]!.length));
  for (const comment of candidate.commentedOut) {
    const value = comment.value.substring(trimStart).trimEnd();
    yield fixer.replaceTextRange(comment.range!, value);
  }
}

// Estimate commented out lines
const RE_LIKELY_COMMENT_START = /^\s*("[^"\\]*"|'[^'\\]*'|\w+)\s*:/;
const RE_LIKELY_COMMENT_END = /["'),]\s*(?:\/\/.*(?:\n|$)|\/\*(?:[^*]|\*(?!\/))\*\/\s*)*$/;

function collectCandidates(sourceCode: SourceCode, catalogData: ObjectExpression): Candidate[] {
  const candidateNodes: Candidate[] = [];
  for (const prop of catalogData.properties) {
    const precedingComments = getPrecedingComments(sourceCode, prop);
    const [commentedOutCandidates, trueComments] = parseComments(precedingComments);
    candidateNodes.push(...commentedOutCandidates);

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
    const [commentedOutCandidates] = parseComments(lastComments);
    candidateNodes.push(...commentedOutCandidates);
  }
  return candidateNodes;
}

function parseComments(comments: Comment[]): [CommentedOutCandidate[], Comment[]] {
  const candidates: CommentedOutCandidate[] = [];
  let last = 0;
  let estimatedStart: number | null = null;
  let id = "";
  let i = 0;
  while (i < comments.length) {
    const comment = comments[i]!;
    const match = RE_LIKELY_COMMENT_START.exec(comment.value);
    if (match) {
      // likely a start line
      estimatedStart = i;
      const keyPart = match[1]!;
      if (keyPart.startsWith('"') || keyPart.startsWith("'")) {
        id = keyPart.substring(1, keyPart.length - 1);
      } else {
        id = keyPart;
      }
    }
    if (RE_LIKELY_COMMENT_END.test(comment.value) && estimatedStart !== null) {
      // likely an end line
      i++;
      const text = comments.slice(estimatedStart, i).map((c) => c.value).join("");
      let ok = false;
      // Check if it's valid
      try {
        new SimpleParser(simpleTokenize(text)).parseProp();
        ok = true;
      } catch (_e) {}
      if (ok) {
        candidates.push({
          id,
          precedingComments: comments.slice(last, estimatedStart),
          commentedOut: comments.slice(estimatedStart, i),
        });
        estimatedStart = null;
        last = i;
      }
    } else {
      i++;
    }
  }
  return [candidates, comments.slice(last)];
}

function getPrecedingComments(sourceCode: SourceCode, node: Node): Comment[] {
  const comments: Comment[] = [];
  let lastLine: number = -1;
  while (true) {
    const current = comments.length > 0 ? comments[comments.length - 1]! : node;
    const commentOrToken = sourceCode.getTokenBefore(current, { includeComments: true });
    if (!commentOrToken) break;
    if (commentOrToken.type !== "Line" && commentOrToken.type !== "Block") {
      lastLine = commentOrToken.loc!.end.line;
      break;
    }
    comments.push(commentOrToken);
  }
  // Remove in-line comments
  while (comments.length > 0 && comments[comments.length - 1]!.loc!.start.line === lastLine) {
    comments.pop();
  }
  comments.reverse();
  return comments;
}

function getLastComments(sourceCode: SourceCode, nodes: Node[]): Comment[] {
  if (nodes.length === 0) return [];
  const lastNode = nodes[nodes.length - 1]!;
  const maybeComma = sourceCode.getTokenAfter(lastNode, { includeComments: false });
  let lastToken: Node | Comment | AST.Token = 
    maybeComma && maybeComma.type === "Punctuator" && maybeComma.value === "," ?
      maybeComma : lastNode;
  const lastLine = lastToken.loc!.end.line;
  const comments: Comment[] = [];
  while (true) {
    const nextToken: Comment | AST.Token | null = sourceCode.getTokenAfter(lastToken, { includeComments: true });
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

// Simplified parser to detect a subset of correct JavaScript construction.
class SimpleParser {
  pos = 0;
  constructor(public tokens: string[]) {}
  parseProp() {
    this.expect(/^(?:[a-zA-Z_$].*|".*"|'.*')$/);
    this.expect(":");
    if (this.is("msg")) {
      this.expect("msg");
      this.expect("(");
      this.expect(/^(?:".*"|'.*')$/);
      this.expect(")");
    } else {
      this.expect(/^(?:".*"|'.*')$/);
    }
    if (this.is(",")) this.expect(",");
    this.expect("");
  }
  is(cond: ((s: string) => boolean) | RegExp | string): boolean {
    const token = this.tokens[this.pos] ?? "";
    return typeof cond === "string" ? token === cond :
      cond instanceof RegExp ? cond.test(token) :
      cond(token);
  }
  expect(cond: ((s: string) => boolean) | RegExp | string): string {
    if (!this.is(cond)) throw new Error("unexpected token");
    const token = this.tokens[this.pos] ?? "";
    if (this.pos < this.tokens.length) this.pos++;
    return token;
  }
}

function simpleTokenize(text: string): string[] {
  let currentText = text;
  const tokens: string[] = [];
  while (currentText.length > 0) {
    const ch = currentText[0]!;
    let token = ch;
    if (/\s/.test(ch)) {
      currentText = currentText.substring(/^\s+/.exec(currentText)![0]!.length);
      continue;
    } else if (/[a-zA-Z_$]/.test(ch)) {
      token = /^[a-zA-Z_$][a-zA-Z_$0-9]*/.exec(currentText)![0]!;
    } else if (ch === "\"") {
      const match = /^"(?:[^"\\\n]|\\.|)*"/.exec(currentText);
      if (match) {
        try {
          JSON.parse(match[0]!);
          token = match[0]!;
        } catch (e) {}
      }
    } else if (ch === "\'") {
      const match = /^'(?:[^'\\\n]|\\.|)*'/.exec(currentText);
      if (match) {
        try {
          JSON.parse(match[0]!);
          token = match[0]!;
        } catch (e) {}
      }
    }
    tokens.push(token);
    currentText = currentText.substring(token.length);
  }
  return tokens;
}

