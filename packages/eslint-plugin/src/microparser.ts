import {
  Comment,
  Expression,
  Identifier,
  Literal,
  Position,
  Property,
  SpreadElement,
} from "estree";
import { AST } from "eslint";
import {
  TSSignature,
  TSType,
  TSTypeAnnotation,
  TSTypeLiteral,
  TSTypeParameterInstantiation,
  TSTypeReference,
} from "./estree-ts";

export class ParseError extends Error {}

export function parseComments(comments: Comment[]) {
  const tokens: AST.Token[] = [];
  const commentTokenIndex: number[] = [];
  const tokenCommentIndex: number[] = [];
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i]!;
    let tokenized: AST.Token[];
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

  const parser = new Parser(tokens);
  const nextComment = 0;
  while (nextComment < comments.length) {
    parser.parseProperty();
  }
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
  constructor(public tokens: AST.Token[]) {}

  parseIdentifierName(): Identifier {
    const token = this.nextToken();
    if (!(token.type === "Identifier" || token.type === "Keyword")) {
      throw new ParseError();
    }
    const name = evalIdentifier(token.value);
    this.pos++;
    return {
      type: "Identifier",
      name,
      loc: token.loc,
      range: token.range,
    };
  }
  parsePrimaryExpression(): Expression {
    const token = this.nextToken();
    switch (token.type) {
      case "Identifier": {
        const name = evalIdentifier(token.value);
        if (KEYWORDS.includes(name)) throw new ParseError();
        this.pos++;
        return {
          type: "Identifier",
          name,
          loc: token.loc,
          range: token.range,
        };
        break;
      }
      case "Numeric":
        this.pos++;
        return {
          type: "Literal",
          value: Number(token.value),
          raw: token.value,
          loc: token.loc,
          range: token.range,
        };
      case "String":
        this.pos++;
        return {
          type: "Literal",
          value: evalString(token.value),
          raw: token.value,
          loc: token.loc,
          range: token.range,
        };
      default:
        throw new ParseError();
    }
  }
  parseProperty(): Property {
    const { key, computed } = this.parsePropertyName();
    this.expectPunct(":");
    const value = this.parseAssignmentExpression();
    return {
      type: "Property",
      key,
      value,
      kind: "init",
      method: false,
      shorthand: false,
      computed,
    };
  }
  parsePropertyName(): { key: Expression; computed: boolean } {
    return { key: this.parseLiteralPropertyName(), computed: false };
  }
  parseLiteralPropertyName(): Identifier | Literal {
    const token = this.nextToken();
    if (token.type === "Identifier") {
      this.pos++;
      return {
        type: "Identifier",
        name: evalIdentifier(token.value),
        loc: token.loc,
        range: token.range,
      };
    } else if (token.type === "Numeric") {
      this.pos++;
      return {
        type: "Literal",
        value: Number(token.value),
        raw: token.value,
        loc: token.loc,
        range: token.range,
      };
    } else if (token.type === "String") {
      this.pos++;
      return {
        type: "Literal",
        value: evalString(token.value),
        raw: token.value,
        loc: token.loc,
        range: token.range,
      };
    } else {
      throw new ParseError();
    }
  }
  parseMemberExpression(): Expression {
    let expr: Expression = this.parsePrimaryExpression();
    while (true) {
      if (this.tryPunct(".")) {
        const property = this.parseIdentifierName();
        expr = {
          type: "MemberExpression",
          object: expr,
          property,
          computed: false,
          optional: false,
        };
      } else if (this.isPunct("(")) {
        const args = this.parseArguments();
        expr = {
          type: "CallExpression",
          callee: expr,
          arguments: args,
          optional: false,
        };
      } else {
        break;
      }
    }
    return expr;
  }
  parseArguments(): (Expression | SpreadElement)[] {
    this.expectPunct("(");
    const args: (Expression | SpreadElement)[] = [];
    while (true) {
      let isSpread = false;
      if (this.tryPunct(")")) {
        break;
      } else if (this.tryPunct("...")) {
        isSpread = true;
      }
      const argument = this.parseAssignmentExpression();
      args.push(isSpread ? { type: "SpreadElement", argument } : argument);
      if (this.tryPunct(")")) {
        break;
      } else {
        this.expectPunct(",");
      }
    }
    return args;
  }
  parseLeftHandSideExpression(): Expression {
    return this.parseMemberExpression();
  }
  parseUpdateExpression(): Expression {
    return this.parseLeftHandSideExpression();
  }
  parseUnaryExpression(): Expression {
    return this.parseUpdateExpression();
  }
  parseExponentialExpression(): Expression {
    return this.parseUnaryExpression();
  }
  parseMultiplicativeExpression(): Expression {
    return this.parseExponentialExpression();
  }
  parseAdditiveExpression(): Expression {
    return this.parseMultiplicativeExpression();
  }
  parseShiftExpression(): Expression {
    return this.parseAdditiveExpression();
  }
  parseRelationalExpression(): Expression {
    return this.parseShiftExpression();
  }
  parseEqualityExpression(): Expression {
    return this.parseRelationalExpression();
  }
  parseBitwiseANDExpression(): Expression {
    return this.parseEqualityExpression();
  }
  parseBitwiseXORExpression(): Expression {
    return this.parseBitwiseANDExpression();
  }
  parseBitwiseORExpression(): Expression {
    return this.parseBitwiseXORExpression();
  }
  parseLogicalANDExpression(): Expression {
    return this.parseBitwiseORExpression();
  }
  parseLogicalORExpression(): Expression {
    return this.parseLogicalANDExpression();
  }
  parseShortCircuitExpression(): Expression {
    return this.parseLogicalORExpression();
  }
  parseConditionalExpression(): Expression {
    return this.parseShortCircuitExpression();
  }
  parseAssignmentExpression(): Expression {
    return this.parseConditionalExpression();
  }
  parseTSSignature(): TSSignature {
    const { key, computed } = this.parsePropertyName();
    let typeAnnotation: TSTypeAnnotation | undefined = undefined;
    if (this.tryPunct(":")) {
      const type = this.parseTSType();
      typeAnnotation = {
        type: "TSTypeAnnotation",
        typeAnnotation: type,
        loc: type.loc,
        range: type.range,
      };
    }
    return {
      type: "TSPropertySignature",
      key,
      readonly: false,
      computed,
      optional: false,
      typeAnnotation,
    };
  }
  parseTSTypeReference(): TSTypeReference {
    const token = this.nextToken();
    if (token.type !== "Identifier") throw new ParseError();
    const typeName: Identifier = {
      type: "Identifier",
      name: evalIdentifier(token.value),
      loc: token.loc,
      range: token.range,
    };
    this.pos++;
    const typeParameters = this.parseTSTypeParameterInstantiation();
    return {
      type: "TSTypeReference",
      typeName,
      typeParameters,
      loc: token.loc,
      range: token.range,
    };
  }
  parseTSTypeParameterInstantiation():
    | TSTypeParameterInstantiation
    | undefined {
    if (!this.tryPunct("<")) return undefined;
    const params: TSType[] = [];
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
    return { type: "TSTypeParameterInstantiation", params };
  }
  parseTSNonArrayType(): TSType {
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
  parseTSTypeLiteral(): TSTypeLiteral {
    this.expectPunct("{");
    const members: TSSignature[] = [];
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
    return { type: "TSTypeLiteral", members };
  }
  parseTSType(): TSType {
    return this.parseTSNonArrayType();
  }
  nextToken(): AST.Token | { type: "EOF" } {
    if (this.pos < this.tokens.length) return this.tokens[this.pos]!;
    else return { type: "EOF" };
  }
  isPunct(
    punct: string,
    token = this.nextToken()
  ): token is AST.Token & { type: "Punctuator" } {
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

export function tokenizeComment(comment: Comment): AST.Token[] {
  const pos: Position | undefined = comment.loc
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
  pos: Position = { line: 1, column: 0 },
  idxBase = 0
): AST.Token[] {
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

  const tokens: AST.Token[] = [];
  while (idx < text.length) {
    const start: Position = { ...pos };
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
          type: "String",
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
            type: "Punctuator",
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
            type: KEYWORDS.includes(match[0]!) ? "Keyword" : "Identifier",
            value: match[0]!,
            range: [startIdx, idxBase + idx],
            loc: { start, end: { ...pos } },
          });
          continue;
        } else {
          advance(ch);
          tokens.push({
            type: "Punctuator",
            value: ch,
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

function dummyTokenFrom(comment: Comment): AST.Token {
  return {
    type: "Punctuator",
    value: "\0",
    loc: {
      start: { ...comment.loc!.start },
      end: {
        line: comment.loc!.end.line,
        column: comment.loc!.end.column + 1,
      },
    },
    range: [comment.range![0], comment.range![0] + 1],
  };
}
