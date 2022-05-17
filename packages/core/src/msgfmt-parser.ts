import {
  ArgType,
  CompiledMessage,
  ElementArg,
  PluralArg,
  PluralBranch,
} from "./msgfmt.js";

const SIMPLE_MESSAGE = /^[^'{}<]*$/;

export function parseMessage(msg: string): CompiledMessage {
  if (SIMPLE_MESSAGE.test(msg)) return msg;
  return parseMessageEOF.call(createParser(msg));
}

const ARG_TYPES = ["number", "date", "time", "spellout", "ordinal", "duration"];

// References for ICU MessageFormat syntax:
// https://unicode-org.github.io/icu-docs/apidoc/released/icu4j/com/ibm/icu/text/MessageFormat.html
// https://unicode-org.github.io/icu/userguide/format_parse/messages/
interface Parser {
  src: string;
  pos: number;
  reText: RegExp;
  reQuotedText: RegExp;
}
function createParser(src: string): Parser {
  return {
    src,
    pos: 0,
    reText: /[^'{}#<]*/y,
    reQuotedText: /[^']*/y,
  };
}

function parseMessageEOF(this: Parser): CompiledMessage {
  const msg = parseMessage_.call(this, false);
  if (this.pos < this.src.length) {
    throw new Error(`Found an unmatching ${this.src[this.pos]!}`);
  }
  return msg;
}

// message = messageText (argument messageText)*
// The grammar doesn't mention it but it should also have '#' as a special interpolation.
function parseMessage_(this: Parser, allowHash: boolean): CompiledMessage {
  const buf: CompiledMessage[] = [];
  pushString(buf, parseMessageText.call(this, allowHash));
  outer: while (this.pos < this.src.length && this.src[this.pos] !== "}") {
    switch (this.src[this.pos]) {
      case "{":
        buf.push(parseArgument.call(this));
        break;
      case "#":
        buf.push({ type: "Number" });
        this.pos++;
        break;
      case "<":
        if (this.pos + 1 < this.src.length && this.src[this.pos + 1] === "/") {
          // </tag>
          break outer;
        } else {
          // <tag> or <tag/>
          buf.push(parseElement.call(this, allowHash));
        }
        break;
      default:
        throw new Error(
          `Bug: invalid syntax character: ${this.src[this.pos]!}`
        );
    }
    pushString(buf, parseMessageText.call(this, allowHash));
  }
  return reduceMessage(buf);
}

// messageText consists of three parts:
//
// - plain message text
// - quoted message text
// - escaped quotes
function parseMessageText(this: Parser, allowHash: boolean): string {
  let inQuote = false;
  let buf = parseRawMessageText.call(this, inQuote);
  while (this.pos < this.src.length) {
    if (this.src[this.pos] === "'") {
      if (this.pos + 1 < this.src.length && this.src[this.pos + 1] === "'") {
        // Self-escaped quotation
        buf += "'";
        this.pos += 2;
      } else if (inQuote) {
        // End of quoted text
        inQuote = false;
        this.pos++;
      } else if (
        this.pos + 1 < this.src.length &&
        /[{}#|<]/.test(this.src[this.pos + 1]!)
      ) {
        // Beginning of quoted text
        inQuote = true;
        this.pos++;
      } else {
        // Literal quote
        buf += "'";
        this.pos++;
      }
    } else if (this.src[this.pos] === "#" && allowHash) {
      // A plain '#' character. It is special only within pluralStyle.
      buf += "#";
      this.pos++;
    } else {
      // Syntax character ({, }, #, <)
      break;
    }
    buf += parseRawMessageText.call(this, inQuote);
  }
  if (inQuote) {
    throw new Error("Unclosed quoted string");
  }
  return buf;
}
// Eats up the text until it encounters a syntax character ('{', '}', '#', '<'), a quote ("'"), or EOF.
// In quoted mode, the four syntax characters ('{', '}', '#', '<') are considered part of the text.
function parseRawMessageText(this: Parser, inQuote: boolean): string {
  const re = inQuote ? this.reQuotedText : this.reText;
  re.lastIndex = this.pos;
  const text = re.exec(this.src)![0]!;
  this.pos += text.length;
  return text;
}

// Something enclosed within {}.
// argument = noneArg | simpleArg | complexArg
// complexArg = choiceArg | pluralArg | selectArg | selectordinalArg
function parseArgument(this: Parser): CompiledMessage {
  this.pos++; // Eat the open brace
  const name = parseArgNameOrNumber.call(this);
  switch (
    nextToken.call<Parser, [readonly ["}", ","]], ["}" | ",", string]>(this, [
      "}",
      ",",
    ] as const)[0]
  ) {
    case "}":
      return { type: "Var", name };
    case ",": {
      const argType = nextToken.call(this, ["identifier"] as const)[1];
      switch (argType) {
        case "choice":
          throw new Error("choice is not supported");
          break;
        case "plural":
          return parsePluralArgument.call(this, name);
        case "select":
        case "selectordinal":
          throw new Error("Unimplemented: selectArg");
          break;
        default:
          if (!ARG_TYPES.includes(argType)) {
            throw new Error(`Invalid argType: ${argType}`);
          }
          switch (
            nextToken.call<Parser, [readonly ["}", ","]], ["}" | ",", string]>(
              this,
              ["}", ","] as const
            )[0]
          ) {
            case "}":
              return { type: "Var", name, argType: argType as ArgType };
            case ",":
              throw new Error("Unimplemented: argStyle");
          }
      }
    }
  }
}

// pluralStyle = [offsetValue] (selector '{' message '}')+
// offsetValue = "offset:" number
// selector = explicitValue | keyword
// explicitValue = '=' number  // adjacent, no white space in between
// keyword = [^[[:Pattern_Syntax:][:Pattern_White_Space:]]]+
function parsePluralArgument(this: Parser, name: string | number): PluralArg {
  nextToken.call(this, [","]);
  let token = nextToken.call(this, [
    "offset:",
    "identifier",
    "=",
    "}",
  ] as const);
  let offset: number | undefined = undefined;
  if (token[0] === "offset:") {
    offset = parseNumber(nextToken.call(this, ["number"] as const)[1]);
    token = nextToken.call(this, ["identifier", "=", "}"] as const);
  }
  const branches: PluralBranch[] = [];
  while (token[0] !== "}") {
    let selector: string | number;
    if (token[0] === "=") {
      selector = parseNumber(nextToken.call(this, ["number"], ["number"])[1]);
    } else {
      selector = token[1];
    }
    nextToken.call(this, ["{"]);
    const message = parseMessage_.call(this, false);
    nextToken.call(this, ["}"]);
    branches.push({ selector, message });
    token = nextToken.call(this, ["identifier", "=", "}"] as const);
  }
  if (branches.length === 0) throw new Error("No branch found");
  if (branches[branches.length - 1]!.selector !== "other")
    throw new Error("Last selector should be other");
  return { type: "Plural", name, offset, branches };
}

// <tag>message</tag> or <tag/>
function parseElement(this: Parser, allowHash: boolean): ElementArg {
  this.pos++; // Eat <
  const name = parseArgNameOrNumber.call(this, true);
  if (nextToken.call(this, ["/", ">"] as const)[0] === "/") {
    // <tag/>
    nextToken.call(this, [">"], [">"]);
    return {
      type: "Element",
      name,
      message: undefined,
    };
  }
  // <tag>message</tag>
  const message = parseMessage_.call(this, allowHash);
  nextToken.call(this, ["<"]);
  nextToken.call(this, ["/"], ["/"]);
  const closingName = parseArgNameOrNumber.call(this, true);
  nextToken.call(this, [">"]);
  if (name !== closingName) {
    throw new Error(`Tag ${name} closed with a different name: ${closingName}`);
  }
  return {
    type: "Element",
    name,
    message,
  };
}

// argNameOrNumber = argName | argNumber
// argName = [^[[:Pattern_Syntax:][:Pattern_White_Space:]]]+
// argNumber = '0' | ('1'..'9' ('0'..'9')*)
function parseArgNameOrNumber(this: Parser, noSpace = false): number | string {
  const [kind, token] = nextToken.call(
    this,
    ["number", "identifier"] as const,
    noSpace ? ["number", "identifier"] : undefined
  );
  if (kind === "number") return parseNumber(token);
  return token;
}

function nextToken<E extends readonly string[]>(
  this: Parser,
  expected: E,
  noWhitespace?: string[]
): [E[number], string] {
  const [kind, token, foundWhitespace] = nextTokenImpl.call(this);
  if (!expected.includes(kind))
    throw new Error(
      `Unexpected token ${kind} (expected ${expected.join(", ")})`
    );
  if (noWhitespace && foundWhitespace && noWhitespace.includes(kind))
    throw new Error("No space allowed here");
  return [kind, token];
}

function nextTokenImpl(this: Parser): [string, string, boolean] {
  const foundWhitespace = skipWhitespace.call(this);
  if (this.pos >= this.src.length) return ["EOF", "", foundWhitespace];
  const ch = this.src[this.pos]!;
  const start = this.pos;
  let kind: string;
  if (this.src.startsWith("offset:", this.pos)) {
    kind = "offset:";
    this.pos += "offset:".length;
    // It should be /[\p{Pattern_Syntax}\p{Pattern_White_Space}]/u
    // but for compatibility reasons I'm not yet sure we can use it now.
  } else if (/[0-9A-Z_a-z]/.test(ch)) {
    kind = /[0-9]/.test(ch) ? "number" : "identifier";
    while (
      this.pos < this.src.length &&
      /[0-9A-Z_a-z]/.test(this.src[this.pos]!)
    ) {
      this.pos++;
    }
  } else {
    kind = ch;
    this.pos++;
  }
  return [kind, this.src.substring(start, this.pos), foundWhitespace];
}

function skipWhitespace(this: Parser): boolean {
  const oldPos = this.pos;
  while (this.pos < this.src.length && /\s/.test(this.src[this.pos]!))
    this.pos++;
  return this.pos > oldPos;
}

function parseNumber(token: string): number {
  if (!/^(?:0|[1-9][0-9]*)$/.test(token))
    throw new Error(`Invalid number: ${token}`);
  return parseInt(token);
}

function reduceMessage(msg: CompiledMessage[]): CompiledMessage {
  if (msg.length === 1) {
    return msg[0]!;
  } else if (msg.length === 0) {
    return "";
  } else {
    return msg;
  }
}

function pushString(buf: CompiledMessage[], msg: string) {
  if (msg !== "") buf.push(msg);
}
