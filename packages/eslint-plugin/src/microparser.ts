import {
  AST_NODE_TYPES,
  AST_TOKEN_TYPES,
  TSESTree,
  // eslint-disable-next-line node/no-unpublished-import
} from "@typescript-eslint/utils";

export class ParseError extends Error {}

type ParseCommentsResult<T> = {
  parts: ParsedPart<T>[];
  rest: TSESTree.Comment[];
};

type ParsedPart<T> = {
  leadingComments: TSESTree.Comment[];
  commentedOut: TSESTree.Comment[];
  node: T;
};

export function parseComments<T>(
  comments: TSESTree.Comment[],
  parse: (parser: Parser) => T
): ParseCommentsResult<T> {
  const tokens: TSESTree.Token[] = [];
  const commentTokenIndex: number[] = [];
  const tokenCommentIndex: number[] = [];
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i]!;
    let tokenized: TSESTree.Token[];
    try {
      tokenized = tokenizeComment(comment);
    } catch (e) {
      if (e instanceof ParseError) {
        tokenized = [dummyTokenFrom(comment)];
      } else {
        throw e;
      }
    }
    commentTokenIndex.push(tokens.length);
    for (const token of tokenized) {
      tokens.push(token);
      tokenCommentIndex.push(i);
    }
  }
  commentTokenIndex.push(tokens.length);
  tokenCommentIndex.push(comments.length);

  const parser = new Parser(tokens);
  const parts: ParsedPart<T>[] = [];
  let lastComment = 0;
  let nextComment = 0;
  while (nextComment < comments.length) {
    parser.pos = commentTokenIndex[nextComment]!;
    let node: T;
    let ok = false;
    try {
      node = parse(parser);
      ok = true;
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
    }
    if (!ok) {
      nextComment++;
      continue;
    }
    const commentIndex = tokenCommentIndex[parser.pos]!;
    if (commentTokenIndex[commentIndex] !== parser.pos) {
      nextComment++;
      continue;
    }
    parts.push({
      leadingComments: comments.slice(lastComment, nextComment),
      commentedOut: comments.slice(nextComment, commentIndex),
      node: node!,
    });
    lastComment = nextComment = commentIndex;
  }
  return {
    parts,
    rest: comments.slice(lastComment),
  };
}

export function isProperty(text: string): boolean {
  try {
    const tokens = tokenize(text);
    const parser = new Parser(tokens);
    parser.parseProperty();
    if (parser.pos < parser.tokens.length) throw new ParseError();
  } catch (e) {
    if (e instanceof ParseError) {
      return false;
    } else {
      throw e;
    }
  }
  return true;
}

export function isTSSignature(text: string): boolean {
  try {
    const tokens = tokenize(text);
    const parser = new Parser(tokens);
    parser.parseTSSignature();
    if (parser.pos < parser.tokens.length) throw new ParseError();
  } catch (e) {
    if (e instanceof ParseError) {
      return false;
    } else {
      throw e;
    }
  }
  return true;
}

export class Parser {
  pos = 0;
  constructor(public tokens: TSESTree.Token[]) {}

  parseIdentifierName(): TSESTree.Identifier {
    const token = this.nextToken();
    if (!(token.type === "Identifier" || token.type === "Keyword")) {
      throw new ParseError();
    }
    const name = evalIdentifier(token.value);
    this.pos++;
    return {
      type: AST_NODE_TYPES.Identifier,
      name,
      loc: token.loc,
      range: token.range,
    };
  }
  parsePrimaryExpression(): TSESTree.LeftHandSideExpression {
    const token = this.nextToken();
    switch (token.type) {
      case "Identifier": {
        const name = evalIdentifier(token.value);
        if (KEYWORDS.includes(name)) throw new ParseError();
        this.pos++;
        return {
          type: AST_NODE_TYPES.Identifier,
          name,
          loc: token.loc,
          range: token.range,
        };
        break;
      }
      case "Numeric":
        this.pos++;
        return {
          type: AST_NODE_TYPES.Literal,
          value: Number(token.value),
          raw: token.value,
          loc: token.loc,
          range: token.range,
        };
      case "String":
        this.pos++;
        return {
          type: AST_NODE_TYPES.Literal,
          value: evalString(token.value),
          raw: token.value,
          loc: token.loc,
          range: token.range,
        };
      default:
        throw new ParseError();
    }
  }
  parseProperty(): TSESTree.Property {
    const firstToken = this.nextToken();
    const propName = this.parsePropertyName();
    this.expectPunct(":");
    const value = this.parseAssignmentExpression();
    return {
      type: AST_NODE_TYPES.Property,
      ...propName,
      value,
      kind: "init",
      method: false,
      shorthand: false,
      loc: {
        start: (firstToken as TSESTree.Token).loc.start,
        end: value.loc.end,
      },
      range: [(firstToken as TSESTree.Token).range[0], value.range[1]],
    };
  }
  parsePropertyName():
    | { key: TSESTree.Expression; computed: true }
    | { key: TSESTree.PropertyNameNonComputed; computed: false } {
    return { key: this.parseLiteralPropertyName(), computed: false };
  }
  parseLiteralPropertyName(): TSESTree.PropertyNameNonComputed {
    const token = this.nextToken();
    if (token.type === "Identifier") {
      this.pos++;
      return {
        type: AST_NODE_TYPES.Identifier,
        name: evalIdentifier(token.value),
        loc: token.loc,
        range: token.range,
      };
    } else if (token.type === "Numeric") {
      this.pos++;
      return {
        type: AST_NODE_TYPES.Literal,
        value: Number(token.value),
        raw: token.value,
        loc: token.loc,
        range: token.range,
      };
    } else if (token.type === "String") {
      this.pos++;
      return {
        type: AST_NODE_TYPES.Literal,
        value: evalString(token.value),
        raw: token.value,
        loc: token.loc,
        range: token.range,
      };
    } else {
      throw new ParseError();
    }
  }
  parseMemberExpression(): TSESTree.Expression {
    let expr: TSESTree.LeftHandSideExpression = this.parsePrimaryExpression();
    while (true) {
      if (this.tryPunct(".")) {
        const property = this.parseIdentifierName();
        expr = {
          type: AST_NODE_TYPES.MemberExpression,
          object: expr,
          property,
          computed: false,
          optional: false,
          loc: {
            start: expr.loc.start,
            end: property.loc.end,
          },
          range: [expr.range[0], property.range[1]],
        };
      } else if (this.isPunct("(")) {
        const args = this.parseArguments();
        expr = {
          type: AST_NODE_TYPES.CallExpression,
          callee: expr,
          arguments: args,
          optional: false,
          // TODO: incorrect location
          loc: expr.loc,
          range: expr.range,
        };
      } else {
        break;
      }
    }
    return expr;
  }
  parseArguments(): (TSESTree.Expression | TSESTree.SpreadElement)[] {
    this.expectPunct("(");
    const args: (TSESTree.Expression | TSESTree.SpreadElement)[] = [];
    while (true) {
      let isSpread = false;
      if (this.tryPunct(")")) {
        break;
      } else if (this.tryPunct("...")) {
        isSpread = true;
      }
      const argument = this.parseAssignmentExpression();
      args.push(
        isSpread
          ? {
              type: AST_NODE_TYPES.SpreadElement,
              argument,
              // TODO: incorrect location
              loc: argument.loc,
              range: argument.range,
            }
          : argument
      );
      if (this.tryPunct(")")) {
        break;
      } else {
        this.expectPunct(",");
      }
    }
    return args;
  }
  parseLeftHandSideExpression(): TSESTree.Expression {
    return this.parseMemberExpression();
  }
  parseUpdateExpression(): TSESTree.Expression {
    return this.parseLeftHandSideExpression();
  }
  parseUnaryExpression(): TSESTree.Expression {
    return this.parseUpdateExpression();
  }
  parseExponentialExpression(): TSESTree.Expression {
    return this.parseUnaryExpression();
  }
  parseMultiplicativeExpression(): TSESTree.Expression {
    return this.parseExponentialExpression();
  }
  parseAdditiveExpression(): TSESTree.Expression {
    return this.parseMultiplicativeExpression();
  }
  parseShiftExpression(): TSESTree.Expression {
    return this.parseAdditiveExpression();
  }
  parseRelationalExpression(): TSESTree.Expression {
    return this.parseShiftExpression();
  }
  parseEqualityExpression(): TSESTree.Expression {
    return this.parseRelationalExpression();
  }
  parseBitwiseANDExpression(): TSESTree.Expression {
    return this.parseEqualityExpression();
  }
  parseBitwiseXORExpression(): TSESTree.Expression {
    return this.parseBitwiseANDExpression();
  }
  parseBitwiseORExpression(): TSESTree.Expression {
    return this.parseBitwiseXORExpression();
  }
  parseLogicalANDExpression(): TSESTree.Expression {
    return this.parseBitwiseORExpression();
  }
  parseLogicalORExpression(): TSESTree.Expression {
    return this.parseLogicalANDExpression();
  }
  parseShortCircuitExpression(): TSESTree.Expression {
    return this.parseLogicalORExpression();
  }
  parseConditionalExpression(): TSESTree.Expression {
    return this.parseShortCircuitExpression();
  }
  parseAssignmentExpression(): TSESTree.Expression {
    return this.parseConditionalExpression();
  }
  parseTSSignature(): TSESTree.TypeElement {
    const propName = this.parsePropertyName();
    const { key } = propName;
    let typeAnnotation: TSESTree.TSTypeAnnotation | undefined = undefined;
    if (this.tryPunct(":")) {
      const type = this.parseTSType();
      typeAnnotation = {
        type: AST_NODE_TYPES.TSTypeAnnotation,
        typeAnnotation: type,
        loc: type.loc,
        range: type.range,
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      type: AST_NODE_TYPES.TSPropertySignature,
      ...propName,
      readonly: false,
      optional: false,
      typeAnnotation,
      // TODO: incorrect location
      loc: key.loc,
      range: key.range,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any; // TODO
  }
  parseTSTypeReference(): TSESTree.TSTypeReference {
    const token = this.nextToken();
    if (token.type !== "Identifier") throw new ParseError();
    const typeName: TSESTree.Identifier = {
      type: AST_NODE_TYPES.Identifier,
      name: evalIdentifier(token.value),
      loc: token.loc,
      range: token.range,
    };
    this.pos++;
    const typeParameters = this.parseTSTypeParameterInstantiation();
    return {
      type: AST_NODE_TYPES.TSTypeReference,
      typeName,
      ...(typeParameters ? { typeParameters } : {}),
      loc: token.loc,
      range: token.range,
    };
  }
  parseTSTypeParameterInstantiation():
    | TSESTree.TSTypeParameterInstantiation
    | undefined {
    if (!this.tryPunct("<")) return undefined;
    const params: TSESTree.TypeNode[] = [];
    while (true) {
      if (this.tryPunct(">")) {
        break;
      }
      const param = this.parseTSType();
      params.push(param);
      if (this.tryPunct(">")) {
        break;
      } else {
        this.expectPunct(",");
      }
    }
    if (params.length === 0) throw new ParseError();
    return {
      type: AST_NODE_TYPES.TSTypeParameterInstantiation,
      params,
      // TODO: incorrect location
      loc: params[0]!.loc,
      range: params[0]!.range,
    };
  }
  parseTSNonArrayType(): TSESTree.TypeNode {
    const token = this.nextToken();
    switch (token.type) {
      case "Identifier":
        switch (token.value) {
          case "infer":
          case "keyof":
          case "readonly":
          case "unique":
            throw new ParseError();
          default:
            return this.parseTSTypeReference();
        }
      case "Punctuator":
        switch (token.value) {
          case "{":
            return this.parseTSTypeLiteral();
          default:
            throw new ParseError();
        }
      default:
        throw new ParseError();
    }
  }
  parseTSTypeLiteral(): TSESTree.TSTypeLiteral {
    const startToken = this.nextToken();
    this.expectPunct("{");
    const members: TSESTree.TypeElement[] = [];
    while (true) {
      if (this.tryPunct("}")) {
        break;
      }
      const signature = this.parseTSSignature();
      members.push(signature);
      if (this.tryPunct("}")) {
        break;
      } else {
        this.tryPunct(",") || this.expectSemi();
      }
    }
    return {
      type: AST_NODE_TYPES.TSTypeLiteral,
      members,
      // TODO: incorrect location
      loc: (startToken as TSESTree.Token).loc,
      range: (startToken as TSESTree.Token).range,
    };
  }
  parseTSType(): TSESTree.TypeNode {
    return this.parseTSNonArrayType();
  }
  nextToken(): TSESTree.Token | { type: "EOF" } {
    if (this.pos < this.tokens.length) return this.tokens[this.pos]!;
    else return { type: "EOF" };
  }
  isPunct(
    punct: string,
    token = this.nextToken()
  ): token is TSESTree.Token & { type: "Punctuator" } {
    return token.type === "Punctuator" && token.value === punct;
  }
  tryPunct(punct: string): boolean {
    if (this.isPunct(punct)) {
      this.pos++;
      return true;
    } else {
      return false;
    }
  }
  expectPunct(punct: string) {
    if (!this.tryPunct(punct)) throw new ParseError();
  }
  isSemi(): boolean {
    return (
      this.isPunct(";") ||
      (this.pos > 0 &&
        this.pos < this.tokens.length &&
        this.tokens[this.pos - 1]!.loc.start.line <
          this.tokens[this.pos]!.loc.start.line)
    );
  }
  trySemi(): boolean {
    if (this.isPunct(";")) {
      this.pos++;
      return true;
    } else {
      return this.isSemi();
    }
  }
  expectSemi() {
    if (!this.trySemi()) throw new ParseError();
  }
}

export function tokenizeComment(comment: TSESTree.Comment): TSESTree.Token[] {
  const pos: TSESTree.Position | undefined = comment.loc
    ? {
        line: comment.loc.start.line,
        column: comment.loc.start.column + 2,
      }
    : undefined;
  const idxBase = comment.range ? comment.range[0] + 2 : undefined;
  return tokenize(comment.value, pos, idxBase);
}

export function tokenize(
  text: string,
  pos: TSESTree.Position = { line: 1, column: 0 },
  idxBase = 0
): TSESTree.Token[] {
  let idx = 0;
  function advance(text: string) {
    let currentText = text;
    while (true) {
      const match = /\r\n|[\r\n\u2028\u2029]/.exec(currentText);
      if (!match) break;
      currentText = currentText.substring(match.index + match[0]!.length);
      pos.line++;
      pos.column = 0;
    }
    pos.column += currentText.length;
    idx += text.length;
  }

  const tokens: TSESTree.Token[] = [];
  while (idx < text.length) {
    const start: TSESTree.Position = { ...pos };
    const startIdx = idxBase + idx;
    const ch = text[idx]!;
    switch (ch) {
      case '"':
      case "'": {
        const re =
          ch === '"'
            ? /^"((?:[^"\\\r\n]|\\\r\n|\\[^])*)"/
            : /^'((?:[^'\\\r\n]|\\\r\n|\\[^])*)'/;
        const match = re.exec(text.substring(idx));
        if (!match) throw new ParseError();
        verifyString(match[1]!);
        advance(match[0]!);
        tokens.push({
          type: AST_TOKEN_TYPES.String,
          value: match[0]!,
          range: [startIdx, idxBase + idx],
          loc: { start, end: { ...pos } },
        });
        break;
      }
      case "/":
        if (text.startsWith("/*", idx)) {
          const match = /^\/\*(?:[^*]|\*(?!\/))*\*\//.exec(text.substring(idx));
          if (!match) throw new ParseError();
          advance(match[0]!);
          continue;
        } else if (text.startsWith("//", idx)) {
          const match = /^\/\/[^\r\n\u2028\u2029]*/.exec(text.substring(idx))!;
          advance(match[0]!);
        } else {
          advance(ch);
          tokens.push({
            type: AST_TOKEN_TYPES.Punctuator,
            value: ch,
            range: [startIdx, idxBase + idx],
            loc: { start, end: { ...pos } },
          });
        }
        break;
      default:
        if (/[\t\v\f\uFEFF\p{Zs}\r\n\u2028\u2029]/u.test(ch)) {
          const match = /^[\t\v\f\uFEFF\p{Zs}\r\n\u2028\u2029]+/u.exec(
            text.substring(idx)
          )!;
          advance(match[0]!);
          continue;
        } else if (/[\p{ID_Start}$_\\]/u.test(ch)) {
          const match =
            /^(?:[\p{ID_Start}$_]|\\u\{[0-9a-fA-F]+\}|\\u[0-9a-fA-F]{4})(?:[\p{ID_Continue}$_\u200C\u200D]|\\u\{[0-9a-fA-F]+\}|\\u[0-9a-fA-F]{4})*/u.exec(
              text.substring(idx)
            );
          if (!match) throw new ParseError();
          advance(match[0]!);
          tokens.push({
            type: KEYWORDS.includes(match[0]!)
              ? AST_TOKEN_TYPES.Keyword
              : AST_TOKEN_TYPES.Identifier,
            value: match[0]!,
            range: [startIdx, idxBase + idx],
            loc: { start, end: { ...pos } },
          });
          continue;
        } else {
          advance(ch);
          tokens.push({
            type: AST_TOKEN_TYPES.Punctuator,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            value: ch as any,
            range: [startIdx, idxBase + idx],
            loc: { start, end: { ...pos } },
          });
        }
        break;
    }
  }
  return tokens;
}

const KEYWORDS = [
  "arguments",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
];

function verifyString(content: string) {
  for (const match of content.matchAll(/\\([0-9xu])/g)) {
    const directive = match[1]!;
    const escStart = match.index! + 2;
    if (directive === "x") {
      // "\xFF"
      if (!/^[0-9a-fA-F]{2}/.test(content.substring(escStart))) {
        throw new ParseError();
      }
    } else if (directive === "u") {
      // "\u{10FFFF}" or "\xFFFF"
      const match2 = /^\{([0-9a-fA-F]+)\}/.exec(content.substring(escStart));
      if (match2) {
        // "\u{10FFFF}" -- check the codepoint limit
        if (parseInt(match2[1]!, 16) >= 0x110000) throw new ParseError();
      } else if (!/^[0-9a-fA-F]{4}/.test(content.substring(escStart))) {
        throw new ParseError();
      }
    } else if (directive === "0") {
      // "\0"
      if (/^[0-9]/.test(content.substring(escStart))) {
        // This is legacy octal ("\07")
        throw new ParseError();
      }
    } else {
      // legacy octal ("\377") or legacy non-octal decimal ("\9")
      throw new ParseError();
    }
  }
}

function evalIdentifier(raw: string) {
  return raw.replaceAll(/\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/g, (esc) => {
    if (esc.startsWith("\\u{")) {
      return String.fromCodePoint(
        parseInt(esc.substring(3, esc.length - 1), 16)
      );
    } else {
      return String.fromCharCode(parseInt(esc.substring(2), 16));
    }
  });
}

function evalString(raw: string) {
  return raw
    .substring(1, raw.length - 1)
    .replace(
      /\\(?:x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|u\{[0-9a-fA-F]+\}|\r\n|[^])/g,
      (esc) => {
        if (esc.startsWith("\\u{")) {
          return String.fromCodePoint(
            parseInt(esc.substring(3, esc.length - 1), 16)
          );
        } else if (esc.startsWith("\\u") || esc.startsWith("\\x")) {
          return String.fromCharCode(parseInt(esc.substring(2), 16));
        } else if (/\\[bfnrtv0]/.test(esc)) {
          return {
            b: "\b",
            f: "\f",
            n: "\n",
            r: "\r",
            t: "\t",
            v: "\v",
            0: "\0",
          }[esc[1]!]!;
        } else {
          return esc[1]!;
        }
      }
    );
}

function dummyTokenFrom(comment: TSESTree.Comment): TSESTree.Token {
  return {
    type: AST_TOKEN_TYPES.Punctuator,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    value: "\0" as any,
    loc: {
      start: { ...comment.loc.start },
      end: {
        line: comment.loc.end.line,
        column: comment.loc.end.column + 1,
      },
    },
    range: [comment.range[0], comment.range[0] + 1],
  };
}
