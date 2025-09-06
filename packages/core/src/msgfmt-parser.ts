import { ParseError } from "./errors.js";
import {
  ArgType,
  CompiledMessage,
  ElementArg,
  PluralArg,
  PluralBranch,
  VarArg,
} from "./msgfmt.js";

const SIMPLE_MESSAGE = /^[^'{}<]*$/;

export function parseMessage(msg: string): CompiledMessage {
  if (SIMPLE_MESSAGE.test(msg)) return msg;
  return parseMessageEOF.call(createParser(msg));
}

const ARG_TYPES = ["number", "date", "time", "spellout", "ordinal", "duration"];
const ARG_STYLES: Record<ArgType, string[]> = {
  number: ["integer", "currency", "percent"],
  date: ["short", "medium", "long", "full"],
  time: ["short", "medium", "long", "full"],
  spellout: [],
  ordinal: [],
  duration: [],
};

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
    throw new ParseError(`Found an unmatching ${this.src[this.pos]!}`);
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
          `Bug: invalid syntax character: ${this.src[this.pos]!}`,
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
    throw new ParseError("Unclosed quoted string");
  }
  return buf;
}
// Eats up the text until it encounters a syntax character ('{', '}', '#', '<'), a quote ("'"), or EOF.
// In quoted mode, the four syntax characters ('{', '}', '#', '<') are considered part of the text.
function parseRawMessageText(this: Parser, inQuote: boolean): string {
  const re = inQuote ? this.reQuotedText : this.reText;
  re.lastIndex = this.pos;
  const text = re.exec(this.src)![0];
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
      const argType_ = nextToken.call(this, ["identifier"] as const)[1];
      switch (argType_) {
        case "choice":
          throw new ParseError("choice is not supported");
          break;
        case "plural":
          return parsePluralArgument.call(this, name);
        case "select":
        case "selectordinal":
          throw new Error("Unimplemented: selectArg");
          break;
        default: {
          if (ARG_TYPES.indexOf(argType_) === -1) {
            throw new ParseError(`Invalid argType: ${argType_}`);
          }
          const argType = argType_ as ArgType;
          switch (
            nextToken.call<Parser, [readonly ["}", ","]], ["}" | ",", string]>(
              this,
              ["}", ","] as const,
            )[0]
          ) {
            case "}":
              return { type: "Var", name, argType };
            case ",": {
              const argStyleToken = nextToken.call<
                Parser,
                [readonly ["identifier", "::"]],
                ["identifier" | "::", string]
              >(this, ["identifier", "::"] as const);
              switch (argStyleToken[0]) {
                case "identifier": {
                  const argStyle = argStyleToken[1];
                  if (ARG_STYLES[argType].indexOf(argStyle) === -1) {
                    throw new ParseError(
                      `Invalid argStyle for ${argType}: ${argStyle}`,
                    );
                  }
                  nextToken.call(this, ["}"] as const);
                  return {
                    type: "Var",
                    name,
                    argType,
                    argStyle,
                  } as VarArg;
                }
                case "::": {
                  if (argType !== "date") {
                    throw new ParseError(`Invalid argStyle for ${argType}: ::`);
                  }
                  const skeletonText = nextToken.call(this, [
                    "identifier",
                  ] as const)[1];
                  const dateTimeFormat = parseDateSkeleton(skeletonText);
                  nextToken.call(this, ["}"] as const);
                  return {
                    type: "Var",
                    name,
                    argType,
                    argStyle: dateTimeFormat,
                  } as VarArg;
                }
              }
            }
          }
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
  if (branches.length === 0) throw new ParseError("No branch found");
  if (branches[branches.length - 1]!.selector !== "other")
    throw new ParseError("Last selector should be other");
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
    throw new ParseError(
      `Tag ${name} closed with a different name: ${closingName}`,
    );
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
    noSpace ? ["number", "identifier"] : undefined,
  );
  if (kind === "number") return parseNumber(token);
  return token;
}

function nextToken<E extends readonly string[]>(
  this: Parser,
  expected: E,
  noWhitespace?: string[],
): [E[number], string] {
  const [kind, token, foundWhitespace] = nextTokenImpl.call(this);
  if (expected.indexOf(kind) === -1)
    throw new ParseError(
      `Unexpected token ${kind} (expected ${expected.join(", ")})`,
    );
  if (noWhitespace && foundWhitespace && noWhitespace.indexOf(kind) !== -1)
    throw new ParseError("No space allowed here");
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
  } else if (this.src.startsWith("::", this.pos)) {
    kind = "::";
    this.pos += "::".length;
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
    throw new ParseError(`Invalid number: ${token}`);
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

function parseDateSkeleton(skeleton: string) {
  const options: Record<string, string | number | undefined> = {};
  // for (const match of skeleton.matchAll(/(.)\1*/g)) {
  for (const match of skeletonTokens(skeleton)) {
    if (Object.prototype.hasOwnProperty.call(dateTokenMap, match[1]!)) {
      const array = dateTokenMap[match[1]!]!;
      const value = array[match[0]!.length];
      if (value !== "undefined") {
        options[array[0]] = value;
        if (/[hHkK]/.test(match[1]!)) {
          options["hourCycle"] =
            hourCycleMap[match[1] as "h" | "H" | "k" | "K"];
        }
        continue;
      }
    }
    throw new ParseError(`Invalid date skeleton: ${match[0]!}`);
  }
  if (requiredDateFields.every((f) => options[f] === undefined)) {
    throw new ParseError(
      `Insufficient fields in the date skeleton: ${skeleton}`,
    );
  }
  return options as Intl.DateTimeFormatOptions;
}

function skeletonTokens(skeleton: string): [string?, string?][] {
  const tokens: [string?, string?][] = [];
  for (let i = 0; i < skeleton.length; ) {
    const start = i;
    const ch = skeleton[i]!;
    for (; i < skeleton.length && skeleton[i] === ch; i++);
    tokens.push([skeleton.substring(start, i), ch]);
  }
  return tokens;
}

const requiredDateFields = [
  "weekday",
  "year",
  "month",
  "day",
  "dayPeriod",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
];

const dateTokenMap: Record<
  string,
  [string, ...(string | number | undefined)[]]
> = {
  G: ["era", "short", undefined, undefined, "long", "narrow"],
  y: ["year", "numeric", "2-digit"],
  M: ["month", "numeric", "2-digit", "short", "long", "narrow"],
  d: ["day", "numeric", "2-digit"],
  E: ["weekday", "short", undefined, undefined, "long", "narrow"],
  a: ["dayPeriod", "short", undefined, undefined, "long", "narrow"],
  h: ["hour", "numeric", "2-digit"],
  H: ["hour", "numeric", "2-digit"],
  k: ["hour", "numeric", "2-digit"],
  K: ["hour", "numeric", "2-digit"],
  j: ["hour", "numeric", "2-digit"],
  m: ["minute", "numeric", "2-digit"],
  s: ["second", "numeric", "2-digit"],
  S: ["fractionalSecondDigits", 1, 2, 3],
  z: ["timeZoneName", "short", undefined, undefined, "long"],
  O: ["timeZoneName", "shortOffset", undefined, undefined, "longOffset"],
  v: ["timeZoneName", "shortGeneric", undefined, undefined, "longGeneric"],
};

const hourCycleMap = {
  h: "h12",
  H: "h23",
  k: "h24",
  K: "h11",
};
