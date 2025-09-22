import type { TSESTree } from "@typescript-eslint/utils";
import {
  InvalidArgNode,
  MessageListNode,
  MFEscapePart,
  NumberArgNode,
  PlaintextNode,
  StringArgNode,
  type MessageNode,
} from "./ast.ts";
import type { Diagnostic } from "./diagnostic.ts";
import {
  jsStringLoc,
  type JSString,
  type JSStringPart,
  type UnknownJSStringPart,
} from "./js-string.ts";

export function parseMF1(
  input: JSString,
  diagnostics: Diagnostic[],
): MessageNode {
  const parser = new Parser(input, diagnostics);
  return parser.readTopLevelMessage();
}

class Parser {
  #inputParts: JSString;
  #input: string;
  #replacements: Record<number, UnknownJSStringPart> = {};
  #diagnostics: Diagnostic[];
  #pos = 0;

  constructor(inputParts: JSString, diagnostics: Diagnostic[]) {
    this.#inputParts = inputParts;
    this.#input = "";
    for (const inputPart of inputParts) {
      if (inputPart.type === "UnknownJSStringPart") {
        this.#replacements[this.#input.length] = inputPart;
        this.#input += "\uFFFC";
      } else {
        this.#input += inputPart.value;
      }
    }
    this.#diagnostics = diagnostics;
  }

  readTopLevelMessage(): MessageNode {
    const msg = this.#readMessage();
    if (this.#pos < this.#input.length) {
      // TODO: handle trailing garbage
      throw new Error(
        `Unexpected character at position ${this.#pos}: '${this.#input[this.#pos]}'`,
      );
    }
    return msg;
  }

  #readMessage(): MessageNode {
    const parts: MessageNode[] = [];
    while (this.#pos < this.#input.length) {
      parts.push(...this.#readMessageText(false));
      if (this.#pos >= this.#input.length) {
        break;
      }
      const ch = this.#input[this.#pos]!;
      if (ch === "}") {
        break;
      }
      if (ch === "<") {
        throw new Error("TODO: parse tags");
      }
      if (ch === "#") {
        throw new Error("TODO: parse # in plural");
      }
      if (ch === "{") {
        parts.push(this.#readArgumentCall());
        continue;
      }
      if (ch === "\uFFFC" && this.#replacements[this.#pos]) {
        const replacement = this.#replacements[this.#pos]!;
        this.#diagnostics.push({
          type: "UnknownJSStringInMF1",
          loc: jsStringLoc([replacement]) ?? NO_LOC,
        });
        this.#pos++;
        parts.push({
          type: "UnknownJSMF1",
          part: replacement,
        });
        continue;
      }
      throw new Error(`Unexpected character: '${ch}'`);
    }
    if (parts.length === 1) {
      return parts[0]!;
    } else {
      return MessageListNode(parts);
    }
  }

  #readMessageText(allowPlainHash: boolean): PlaintextNode[] {
    const parts: (JSStringPart | MFEscapePart)[] = [];
    while (this.#pos < this.#input.length) {
      parts.push(...this.#readVerbatimMessageText(allowPlainHash, false));
      if (this.#pos >= this.#input.length) {
        break;
      }
      const ch = this.#input[this.#pos]!;
      if (ch === "'") {
        if (this.#input[this.#pos + 1] === "'") {
          // Escaped single quote
          parts.push(
            MFEscapePart("'", this.#substringParts(this.#pos, this.#pos + 2)),
          );
          this.#pos += 2;
          continue;
        }
        // Otherwise, the beginning of a quoted text
        this.#pos++; // Skip the opening quote
        parts.push(...this.#readVerbatimMessageText(true, true));
        if (this.#input[this.#pos] === "'") {
          this.#pos++; // Skip the closing quote
        }
        continue;
      }
      // Otherwise, it must be a special character
      break;
    }
    if (parts.length === 0) {
      return [];
    }
    return [PlaintextNode("mf1", parts)];
  }

  #readVerbatimMessageText(
    allowPlainHash: boolean,
    inQuote: boolean,
  ): JSString {
    const start = this.#pos;
    while (this.#pos < this.#input.length) {
      const ch = this.#input[this.#pos]!;
      if (ch === "\uFFFC" && this.#replacements[this.#pos]) {
        break;
      }
      if (inQuote) {
        if (ch === "'") {
          break;
        }
      } else {
        if (ch === "{" || ch === "}" || ch === "<") {
          break;
        } else if (!allowPlainHash && ch === "#") {
          break;
        } else if (ch === "'") {
          const ch1 = this.#input[this.#pos + 1];
          if (
            ch1 === "{" ||
            ch1 === "}" ||
            ch1 === "<" ||
            ch1 === "|" ||
            ch1 === "#" ||
            ch1 === "'"
          ) {
            break;
          }
        }
      }
      this.#pos++;
    }
    return this.#substringParts(start, this.#pos);
  }

  #readArgumentCall(): MessageNode {
    this.#pos++; // Skip '{'
    const tok0 = this.#nextToken();
    if (tok0.type === "Eof") {
      this.#diagnostics.push({
        type: "UnterminatedArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok0.start, tok0.end)) ?? NO_LOC,
      });
      this.#readPastArgumentCall(tok0);
      return InvalidArgNode(undefined, undefined);
    } else if (tok0.type !== "Identifier" && tok0.type !== "Number") {
      this.#diagnostics.push({
        type: "InvalidArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok0.start, tok0.end)) ?? NO_LOC,
      });
      this.#readPastArgumentCall(tok0);
      return InvalidArgNode(undefined, undefined);
    }
    const name = tok0.type === "Identifier" ? tok0.name : tok0.value;
    const nameParts = this.#substringParts(tok0.start, tok0.end);
    const tok1 = this.#nextToken();
    if (tok1.type === "RBrace") {
      // Simple argument
      return StringArgNode(name, nameParts);
    } else if (tok1.type === "Eof") {
      this.#diagnostics.push({
        type: "UnterminatedArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok1.start, tok1.end)) ?? NO_LOC,
      });
      return InvalidArgNode(name, nameParts);
    } else if (tok1.type !== "Comma") {
      this.#diagnostics.push({
        type: "InvalidArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok1.start, tok1.end)) ?? NO_LOC,
      });
      this.#readPastArgumentCall(tok1);
      return InvalidArgNode(name, nameParts);
    }
    const tok2 = this.#nextToken();
    if (tok2.type === "Eof") {
      this.#diagnostics.push({
        type: "UnterminatedArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok2.start, tok2.end)) ?? NO_LOC,
      });
      return InvalidArgNode(name, nameParts);
    } else if (tok2.type !== "Identifier") {
      this.#diagnostics.push({
        type: "InvalidArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok2.start, tok2.end)) ?? NO_LOC,
      });
      this.#readPastArgumentCall(tok2);
      return InvalidArgNode(name, nameParts);
    }
    const argTypeName = tok2.name;
    switch (argTypeName) {
      case "number":
        return this.#readNumberArgument(name, nameParts);
    }
    this.#diagnostics.push({
      type: "InvalidArgumentInMF1",
      loc: jsStringLoc(this.#substringParts(tok2.start, tok2.end)) ?? NO_LOC,
    });
    this.#readPastArgumentCall(tok2);
    return InvalidArgNode(name, nameParts);
  }

  #readNumberArgument(name: string | number, nameParts: JSString): MessageNode {
    const tok3 = this.#nextToken();
    if (tok3.type === "RBrace") {
      // Simple number argument
      return NumberArgNode(name, nameParts);
    } else if (tok3.type === "Eof") {
      this.#diagnostics.push({
        type: "UnterminatedArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok3.start, tok3.end)) ?? NO_LOC,
      });
      return InvalidArgNode(name, nameParts);
    } else {
      // TODO: support options
      this.#diagnostics.push({
        type: "InvalidArgumentInMF1",
        loc: jsStringLoc(this.#substringParts(tok3.start, tok3.end)) ?? NO_LOC,
      });
      this.#readPastArgumentCall(tok3);
      return InvalidArgNode(name, nameParts);
    }
  }

  #readPastArgumentCall(errorToken: Token): void {
    if (errorToken.type === "LBrace" || errorToken.type === "RBrace") {
      this.#pos = errorToken.start;
    }
    let braceDepth = 1;
    while (this.#pos < this.#input.length) {
      const ch = this.#input[this.#pos]!;
      this.#pos++;
      if (ch === "{") {
        braceDepth++;
      } else if (ch === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          return;
        }
      }
    }
  }

  #nextToken(): Token {
    this.#skipWhitespace();
    const start = this.#pos;
    if (this.#pos >= this.#input.length) {
      return EofToken(start, this.#pos);
    }
    const ch = this.#input[this.#pos]!;
    if (ch === "{") {
      this.#pos++;
      return LBraceToken(start, this.#pos);
    } else if (ch === "}") {
      this.#pos++;
      return RBraceToken(start, this.#pos);
    } else if (ch === ",") {
      this.#pos++;
      return CommaToken(start, this.#pos);
    } else if (/[0-9a-zA-Z_]/.test(ch)) {
      const isNumberLike = /[0-9]/.test(ch);
      const start = this.#pos;
      this.#pos++;
      while (/[0-9a-zA-Z_]/.test(this.#input[this.#pos] ?? "\0")) {
        this.#pos++;
      }
      const nameParts = this.#substringParts(start, this.#pos);
      const name = this.#input.slice(start, this.#pos);
      if (isNumberLike) {
        if (!/^(0|[1-9][0-9]*)$/.test(name)) {
          this.#diagnostics.push({
            type: "InvalidNumberInMF1",
            loc: jsStringLoc(nameParts) ?? NO_LOC,
          });
        }
        const num = parseInt(name, 10);
        return NumberToken(num, start, this.#pos);
      } else {
        return IdentifierToken(name, start, this.#pos);
      }
    } else {
      while (
        this.#pos < this.#input.length &&
        !/[\s{},0-9a-zA-Z_]/.test(this.#input[this.#pos] ?? "\0")
      ) {
        if (
          this.#input[this.#pos] === "\uFFFC" &&
          this.#replacements[this.#pos]
        ) {
          break;
        }
        this.#pos++;
      }
      return UnknownToken(start, this.#pos);
    }
  }

  #skipWhitespace(): void {
    while (
      this.#pos < this.#input.length &&
      /\s/.test(this.#input[this.#pos]!)
    ) {
      this.#pos++;
    }
  }

  #substringParts(start: number, end: number): JSString {
    if (start > end) {
      return [];
    }
    const startBoundaryParts: JSStringPart[] = [];
    const endBoundaryParts: JSStringPart[] = [];
    const parts: JSStringPart[] = [];
    let pos = 0;
    for (const inputPart of this.#inputParts) {
      // For UnknownJSStringPart, we put U+FFFC as a replacement.
      const len =
        inputPart.type === "UnknownJSStringPart" ? 1 : inputPart.value.length;
      const partStart = pos;
      const partEnd = pos + len;
      pos += len;
      if (partEnd < start || partStart > end) {
        continue;
      }
      const subStart = Math.max(0, start - partStart);
      const subEnd = Math.min(len, end - partStart);
      let part: JSStringPart = inputPart;
      if (inputPart.type === "JSVerbatim") {
        if (subStart === 0 && subEnd === len) {
          // Use the whole part
        } else {
          // TODO: handle verbatim newlines in template literals
          part = {
            ...inputPart,
            value: inputPart.value.slice(subStart, subEnd),
            loc: {
              start: {
                line: inputPart.loc.start.line,
                column: inputPart.loc.start.column + subStart,
              },
              end: {
                line: inputPart.loc.start.line,
                column: inputPart.loc.start.column + subEnd,
              },
            },
          };
        }
      } else if (
        inputPart.type === "UnknownJSStringPart" ||
        inputPart.type === "JSEmptyEscape" ||
        inputPart.type === "JSQuoteOpen" ||
        inputPart.type === "JSQuoteClose" ||
        inputPart.type === "JSConcat"
      ) {
        // Use the whole part
      } else if (
        inputPart.loc &&
        subStart === subEnd &&
        subEnd === inputPart.value.length
      ) {
        part = {
          ...inputPart,
          value: inputPart.value.slice(subStart, subEnd),
          loc: {
            start: inputPart.loc.end,
            end: inputPart.loc.end,
          },
        };
      } else if (inputPart.loc && subStart === subEnd && subStart === 0) {
        part = {
          ...inputPart,
          value: inputPart.value.slice(subStart, subEnd),
          loc: {
            start: inputPart.loc.start,
            end: inputPart.loc.start,
          },
        };
      } else {
        part = {
          ...inputPart,
          value: inputPart.value.slice(subStart, subEnd),
        };
      }
      if (partEnd === start) {
        startBoundaryParts.push(part);
      } else if (partStart === end) {
        endBoundaryParts.push(part);
      } else {
        parts.push(part);
      }
    }
    if (parts.length === 0) {
      if (end === this.#input.length && startBoundaryParts.length > 0) {
        return [startBoundaryParts.at(-1)!];
      } else if (endBoundaryParts.length > 0) {
        return [endBoundaryParts[0]!];
      } else if (startBoundaryParts.length > 0) {
        return [startBoundaryParts.at(-1)!];
      }
    }
    return parts;
  }
}

type Token =
  | IdentifierToken
  | NumberToken
  | LBraceToken
  | RBraceToken
  | CommaToken
  | EofToken
  | UnknownToken;

type IdentifierToken = {
  type: "Identifier";
  name: string;
  start: number;
  end: number;
};
function IdentifierToken(
  name: string,
  start: number,
  end: number,
): IdentifierToken {
  return { type: "Identifier", name, start, end };
}

type NumberToken = {
  type: "Number";
  value: number;
  start: number;
  end: number;
};
function NumberToken(value: number, start: number, end: number): NumberToken {
  return { type: "Number", value, start, end };
}

type LBraceToken = {
  type: "LBrace";
  start: number;
  end: number;
};
function LBraceToken(start: number, end: number): LBraceToken {
  return { type: "LBrace", start, end };
}

type RBraceToken = {
  type: "RBrace";
  start: number;
  end: number;
};
function RBraceToken(start: number, end: number): RBraceToken {
  return { type: "RBrace", start, end };
}

type CommaToken = {
  type: "Comma";
  start: number;
  end: number;
};
function CommaToken(start: number, end: number): CommaToken {
  return { type: "Comma", start, end };
}

type EofToken = {
  type: "Eof";
  start: number;
  end: number;
};
function EofToken(start: number, end: number): EofToken {
  return { type: "Eof", start, end };
}

type UnknownToken = {
  type: "Unknown";
  start: number;
  end: number;
};
function UnknownToken(start: number, end: number): UnknownToken {
  return { type: "Unknown", start, end };
}

const NO_LOC: TSESTree.SourceLocation = {
  start: { line: 1, column: 0 },
  end: { line: 1, column: 0 },
};
