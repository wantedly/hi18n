import {
  MessageListNode,
  MFEscapePart,
  PlaintextNode,
  type MessageNode,
} from "./ast.ts";
import type {
  JSString,
  JSStringPart,
  UnknownJSStringPart,
} from "./js-string.ts";

export function parseMF1(input: JSString): MessageNode {
  const parser = new Parser(input);
  return parser.readTopLevelMessage();
}

class Parser {
  #inputParts: JSString;
  #input: string;
  #replacements: Record<number, UnknownJSStringPart> = {};
  #pos = 0;

  constructor(inputParts: JSString) {
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
        break;
      }
      if (ch === "\uFFFC" && this.#replacements[this.#pos]) {
        throw new Error("TODO: parse unknown string syntax");
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
    return [PlaintextNode(parts)];
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
    while (this.#pos < this.#input.length) {
      const ch = this.#input[this.#pos]!;
      if (/\s/.test(ch)) {
        this.#pos++;
        continue;
      }
      break;
    }
  }

  #nextToken(): Token {
    this.#skipWhitespace();
    if (this.#pos >= this.#input.length) {
      return EofToken();
    }
    const ch = this.#input[this.#pos]!;
    if (ch === "{") {
      this.#pos++;
      return LBraceToken();
    } else if (ch === "}") {
      this.#pos++;
      return RBraceToken();
    } else {
      // TODO: implement other tokens
      throw new Error(`Unexpected character: '${ch}'`);
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
    const parts: JSStringPart[] = [];
    let pos = 0;
    for (const inputPart of this.#inputParts) {
      // For UnknownJSStringPart, we put U+FFFC as a replacement.
      const len =
        inputPart.type === "UnknownJSStringPart" ? 1 : inputPart.value.length;
      if (pos + len > start && pos < end) {
        if (inputPart.type === "JSVerbatim") {
          const subStart = Math.max(0, start - pos);
          const subEnd = Math.min(len, end - pos);
          if (subStart === 0 && subEnd === len) {
            parts.push(inputPart);
          } else if (subStart < subEnd) {
            // TODO: handle verbatim newlines in template literals
            parts.push({
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
            });
          }
        } else if (
          inputPart.type === "UnknownJSStringPart" ||
          inputPart.type === "JSEmptyEscape" ||
          inputPart.type === "JSQuoteOpen" ||
          inputPart.type === "JSQuoteClose" ||
          inputPart.type === "JSConcat"
        ) {
          parts.push(inputPart);
        } else {
          const subStart = Math.max(0, start - pos);
          const subEnd = Math.min(len, end - pos);
          parts.push({
            ...inputPart,
            value: inputPart.value.slice(subStart, subEnd),
          });
        }
      }
      pos += len;
    }
    return parts;
  }
}

type Token = LBraceToken | RBraceToken | EofToken;

type LBraceToken = {
  type: "LBrace";
};
function LBraceToken(): LBraceToken {
  return { type: "LBrace" };
}

type RBraceToken = {
  type: "RBrace";
};
function RBraceToken(): RBraceToken {
  return { type: "RBrace" };
}

type EofToken = {
  type: "Eof";
};
function EofToken(): EofToken {
  return { type: "Eof" };
}
