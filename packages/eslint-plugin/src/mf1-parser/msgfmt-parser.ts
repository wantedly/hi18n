import { diagnosticDescription, type Diagnostic } from "./diagnostics.ts";
import { ParseError } from "./errors.ts";
import {
  MF1DateTimeArgNode,
  MF1ElementArgNode,
  MF1NumberArgNode,
  MF1PluralArgNode,
  MF1PluralBranch,
  MF1StringArgNode,
  type MF1Node,
  type MF1VarArgNode,
  MF1TextNode,
  MF1ConcatNode,
  type Range,
  MF1InvalidArgNode,
  MF1InvalidElementArgNode,
  MF1InvalidPluralArgNode,
} from "./msgfmt.ts";

const SIMPLE_MESSAGE = /^[^'{}<]*$/;

export function parseMF1Message(msg: string): MF1Node {
  const [result, diagnostics] = parseMF1MessageWithDiagnostics(msg);
  if (diagnostics.length > 0) {
    throw new ParseError(
      diagnostics.map((d) => diagnosticDescription(d)).join(", "),
    );
  }
  return result;
}

export function parseMF1MessageWithDiagnostics(
  msg: string,
): [MF1Node, readonly Diagnostic[]] {
  if (SIMPLE_MESSAGE.test(msg)) {
    return [MF1TextNode(msg, { range: [0, msg.length] }), []];
  }
  const parser = new Parser(msg);
  const result = parser.parseMessageEOF();
  return [result, parser.diagnostics];
}

type ArgType = "number" | "date" | "time";

const ARG_TYPES = ["number", "date", "time"];

const EXPECTED_ARG_STYLES: Record<ArgType, readonly string[]> = {
  number: ["integer", "percent"],
  date: ["short", "medium", "long", "full", "::skeleton"],
  time: ["short", "medium", "long", "full"],
};

// References for ICU MessageFormat syntax:
// https://unicode-org.github.io/icu-docs/apidoc/released/icu4j/com/ibm/icu/text/MessageFormat.html
// https://unicode-org.github.io/icu/userguide/format_parse/messages/
class Parser {
  #src: string;
  #pos: number;
  #reText: RegExp;
  #reQuotedText: RegExp;
  #diagnostics: Diagnostic[] = [];
  #hasReportedEOFError = false;

  constructor(src: string) {
    this.#src = src;
    this.#pos = 0;
    this.#reText = /[^'{}#<]*/y;
    this.#reQuotedText = /[^']*/y;
  }

  get diagnostics(): readonly Diagnostic[] {
    return this.#diagnostics;
  }

  parseMessageEOF(): MF1Node {
    try {
      const msg = this.#parseMessage_("EOF");
      if (this.#pos < this.#src.length) {
        throw new TypeError(
          `Bug: Found an unmatching ${this.#src[this.#pos]!}`,
        );
      }
      return msg;
    } catch (e) {
      if (e instanceof ArgumentParseError) {
        throw new TypeError("Bug: ArgumentParseError should not reach here");
      }
      throw e;
    }
  }

  // message = messageText (argument messageText)*
  // The grammar doesn't mention it but it should also have '#' as a special interpolation.
  #parseMessage_(expectDelim: ExpectDelim, hashSubst?: MF1VarArgNode): MF1Node {
    const start = this.#pos;
    const buf: MF1Node[] = [];
    pushString(buf, this.#parseMessageText(expectDelim, hashSubst == null));
    outer: while (
      this.#pos < this.#src.length &&
      this.#src[this.#pos] !== "}"
    ) {
      switch (this.#src[this.#pos]) {
        case "{":
          buf.push(this.#parseArgument());
          break;
        case "#":
          if (!hashSubst) {
            throw new Error("Bug: # found outside plural argument");
          }
          buf.push({ ...hashSubst, range: [this.#pos, this.#pos + 1] });
          this.#pos++;
          break;
        case "<":
          if (
            this.#pos + 1 < this.#src.length &&
            this.#src[this.#pos + 1] === "/"
          ) {
            // </tag>
            break outer;
          } else {
            // <tag> or <tag/>
            buf.push(this.#parseElement(hashSubst));
          }
          break;
        default:
          throw new Error(
            `Bug: invalid syntax character: ${this.#src[this.#pos]!}`,
          );
      }
      pushString(buf, this.#parseMessageText(expectDelim, hashSubst == null));
    }
    return reduceMessage(buf, [start, this.#pos]);
  }

  // messageText consists of three parts:
  //
  // - plain message text
  // - quoted message text
  // - escaped quotes
  #parseMessageText(expectDelim: ExpectDelim, allowHash: boolean): MF1TextNode {
    const start = this.#pos;
    let inQuote = false;
    let buf = this.#parseRawMessageText(inQuote);
    while (this.#pos < this.#src.length) {
      if (this.#src[this.#pos] === "'") {
        if (
          this.#pos + 1 < this.#src.length &&
          this.#src[this.#pos + 1] === "'"
        ) {
          // Self-escaped quotation
          buf += "'";
          this.#pos += 2;
        } else if (inQuote) {
          // End of quoted text
          inQuote = false;
          this.#pos++;
        } else if (
          this.#pos + 1 < this.#src.length &&
          /[{}#|<]/.test(this.#src[this.#pos + 1]!)
        ) {
          // Beginning of quoted text
          inQuote = true;
          this.#pos++;
        } else {
          // Literal quote
          buf += "'";
          this.#pos++;
        }
      } else if (this.#src[this.#pos] === "#" && allowHash) {
        // A plain '#' character. It is special only within pluralStyle.
        buf += "#";
        this.#pos++;
      } else if (this.#src[this.#pos] === "}" && expectDelim !== "}") {
        this.#diagnostics.push({
          type: "UnexpectedToken",
          tokenDesc: "}",
          expected: expectDelim ? [expectDelim] : ["EOF"],
          range: [this.#pos, this.#pos + 1],
        });
        buf += "}";
        this.#pos++;
      } else if (
        this.#src[this.#pos] === "<" &&
        this.#src[this.#pos + 1] === "/" &&
        expectDelim !== "</"
      ) {
        this.#diagnostics.push({
          type: "UnexpectedToken",
          tokenDesc: "</",
          expected: [expectDelim],
          range: [this.#pos, this.#pos + 2],
        });
        buf += "</";
        this.#pos += 2;
      } else {
        // Syntax character ({, }, #, <)
        break;
      }
      buf += this.#parseRawMessageText(inQuote);
    }
    if (inQuote) {
      this.#reportEOFError({
        type: "UnclosedQuotedString",
        range: [this.#pos, this.#pos],
      });
    }
    return MF1TextNode(buf, { range: [start, this.#pos] });
  }
  // Eats up the text until it encounters a syntax character ('{', '}', '#', '<'), a quote ("'"), or EOF.
  // In quoted mode, the four syntax characters ('{', '}', '#', '<') are considered part of the text.
  #parseRawMessageText(inQuote: boolean): string {
    const re = inQuote ? this.#reQuotedText : this.#reText;
    re.lastIndex = this.#pos;
    const text = re.exec(this.#src)![0];
    this.#pos += text.length;
    return text;
  }

  // Something enclosed within {}.
  // argument = noneArg | simpleArg | complexArg
  // complexArg = choiceArg | pluralArg | selectArg | selectordinalArg
  #parseArgument(): MF1Node {
    const start = this.#pos;
    const state: ArgumentState = { name: undefined };
    try {
      return this.#parseArgumentImpl(state);
    } catch (e) {
      if (!(e instanceof ArgumentParseError)) {
        throw e;
      }
      // Skip to next '}'
      let depth = 1;
      while (this.#pos < this.#src.length && depth > 0) {
        const ch = this.#src[this.#pos]!;
        this.#pos++;
        if (ch === "{") {
          depth++;
        } else if (ch === "}") {
          depth--;
        }
      }
      return MF1InvalidArgNode(state.name, { range: [start, this.#pos] });
    }
  }

  #parseArgumentImpl(state: ArgumentState): MF1Node {
    const start = this.#pos;
    this.#pos++; // Eat the open brace
    const name = this.#parseArgNameOrNumber();
    state.name = name;
    switch (this.#nextToken(["}", ","]).type) {
      case "}":
        return MF1StringArgNode(name, { range: [start, this.#pos] });
      case ",": {
        const argType_ = this.#nextToken(["identifier"]).raw;
        switch (argType_) {
          case "plural":
            return this.#parsePluralArgument(name, start);
          default: {
            if (ARG_TYPES.indexOf(argType_) === -1) {
              this.#diagnostics.push({
                type: "UnexpectedArgType",
                argType: argType_,
                expected: ARG_TYPES,
                range: [this.#pos - argType_.length, this.#pos],
              });
              throw new ArgumentParseError(
                `Unexpected argument type ${argType_}`,
              );
            }
            const argType = argType_ as ArgType;
            switch (this.#nextToken(["}", ","]).type) {
              case "}":
                return this.#fromArgTypeAndStyle(
                  name,
                  argType,
                  undefined,
                  [start, this.#pos],
                  [0, 0],
                );
              case ",": {
                const argStyleToken = this.#nextToken(["identifier", "::"]);
                switch (argStyleToken.type) {
                  case "identifier": {
                    const argStyle = argStyleToken.raw;
                    this.#nextToken(["}"]);
                    return this.#fromArgTypeAndStyle(
                      name,
                      argType,
                      argStyle,
                      [start, this.#pos],
                      argStyleToken.range,
                    );
                  }
                  case "::": {
                    if (argType !== "date") {
                      this.#diagnostics.push({
                        type: "UnexpectedArgStyle",
                        argType,
                        argStyle: "::skeleton",
                        expected: EXPECTED_ARG_STYLES[argType],
                        range: [this.#pos - 2, this.#pos],
                      });
                      throw new ArgumentParseError(
                        `Invalid argStyle for ${argType}: ::`,
                      );
                    }
                    const skeletonToken = this.#nextToken(["identifier"]);
                    const dateTimeFormat = this.#parseDateSkeleton(
                      skeletonToken.raw,
                      skeletonToken.range,
                    );
                    this.#nextToken(["}"]);
                    return MF1DateTimeArgNode(name, dateTimeFormat, {
                      range: [start, this.#pos],
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  #fromArgTypeAndStyle(
    name: string | number,
    argType: ArgType,
    argStyle: string | undefined,
    range: Range,
    argStyleRange: Range,
  ): MF1VarArgNode {
    switch (argType) {
      case "number": {
        let derivedStyle: Intl.NumberFormatOptions;
        switch (argStyle) {
          case undefined:
            derivedStyle = {};
            break;
          case "integer":
            derivedStyle = { maximumFractionDigits: 0 };
            break;
          case "percent":
            derivedStyle = { style: "percent" };
            break;
          default:
            this.#diagnostics.push({
              type: "UnexpectedArgStyle",
              argType,
              argStyle,
              expected: EXPECTED_ARG_STYLES[argType],
              range: argStyleRange,
            });
            throw new ArgumentParseError(
              `Invalid argStyle for number: ${argStyle}`,
            );
        }
        return MF1NumberArgNode(name, derivedStyle, { subtract: 0, range });
      }
      case "date":
        switch (argStyle) {
          case undefined:
          case "short":
          case "medium":
          case "long":
          case "full":
            return MF1DateTimeArgNode(
              name,
              { dateStyle: argStyle ?? "medium" },
              { range },
            );
          default:
            this.#diagnostics.push({
              type: "UnexpectedArgStyle",
              argType,
              argStyle,
              expected: EXPECTED_ARG_STYLES[argType],
              range: argStyleRange,
            });
            throw new ArgumentParseError(
              `Invalid argStyle for date: ${argStyle}`,
            );
        }
      case "time":
        switch (argStyle) {
          case undefined:
          case "short":
          case "medium":
          case "long":
          case "full":
            return MF1DateTimeArgNode(
              name,
              { timeStyle: argStyle ?? "medium" },
              { range },
            );
          default:
            this.#diagnostics.push({
              type: "UnexpectedArgStyle",
              argType,
              argStyle,
              expected: EXPECTED_ARG_STYLES[argType],
              range: argStyleRange,
            });
            throw new ArgumentParseError(
              `Invalid argStyle for time: ${argStyle}`,
            );
        }
      default:
        throw new TypeError(`Unknown argType: ${argType as string}`);
    }
  }

  // pluralStyle = [offsetValue] (selector '{' message '}')+
  // offsetValue = "offset:" number
  // selector = explicitValue | keyword
  // explicitValue = '=' number  // adjacent, no white space in between
  // keyword = [^[[:Pattern_Syntax:][:Pattern_White_Space:]]]+
  #parsePluralArgument(
    name: string | number,
    start: number,
  ): MF1PluralArgNode | MF1InvalidPluralArgNode {
    this.#nextToken([","]);
    let token = this.#nextToken(["offset:", "identifier", "=", "}"]);
    let offset: number | undefined = undefined;
    if (token.type === "offset:") {
      offset = this.#nextToken(["number"]).value;
      token = this.#nextToken(["identifier", "=", "}"]);
    }
    const branches: MF1PluralBranch[] = [];
    while (token.type !== "}") {
      let selector: string | number;
      if (token.type === "=") {
        selector = this.#nextToken(["number"], ["number"]).value;
      } else {
        selector = token.raw;
      }
      this.#nextToken(["{"]);
      const hashSubst = MF1NumberArgNode(name, {}, { subtract: offset ?? 0 });
      const message = this.#parseMessage_("}", hashSubst);
      this.#nextToken(["}"]);
      branches.push(
        MF1PluralBranch(selector, message, {
          range: [token.range[0], this.#pos],
        }),
      );
      token = this.#nextToken(["identifier", "=", "}"]);
    }
    if (branches.length === 0) {
      this.#diagnostics.push({
        type: "PluralLastSelector",
        range: [start, this.#pos],
      });
      return MF1InvalidPluralArgNode(name, { range: [start, this.#pos] });
    } else if (branches[branches.length - 1]!.selector !== "other") {
      this.#diagnostics.push({
        type: "PluralLastSelector",
        range: branches[branches.length - 1]!.range!,
      });
      return MF1InvalidPluralArgNode(name, { range: [start, this.#pos] });
    }
    const fallback = branches.pop()!.message;
    return MF1PluralArgNode(name, branches, fallback, {
      subtract: offset ?? 0,
      range: [start, this.#pos],
    });
  }

  // <tag>message</tag> or <tag/>
  #parseElement(
    hashSubst?: MF1VarArgNode,
  ): MF1ElementArgNode | MF1InvalidElementArgNode {
    const start = this.#pos;
    this.#pos++; // Eat <
    let name: string | number;
    try {
      name = this.#parseArgNameOrNumber(true);
      if (this.#nextToken(["/", ">"]).type === "/") {
        // <tag/>
        this.#nextToken([">"], [">"]);
        return MF1ElementArgNode(name, undefined, {
          range: [start, this.#pos],
        });
      }
    } catch (e) {
      if (!(e instanceof ArgumentParseError)) {
        throw e;
      }
      // Skip to next '>'
      while (this.#pos < this.#src.length && this.#src[this.#pos] !== ">") {
        this.#pos++;
      }
      if (this.#pos < this.#src.length) this.#pos++;
      return MF1InvalidElementArgNode(undefined, {
        range: [start, this.#pos],
      });
    }
    // <tag>message</tag>
    const message = this.#parseMessage_("</", hashSubst);
    try {
      const closeTagStart = this.#pos;
      this.#nextToken(["<"]);
      this.#nextToken(["/"], ["/"]);
      const closingName = this.#parseArgNameOrNumber(true);
      this.#nextToken([">"]);
      if (name !== closingName) {
        this.#diagnostics.push({
          type: "MismatchedTag",
          openTagName: name,
          closeTagName: closingName,
          range: [closeTagStart, this.#pos],
        });
      }
    } catch (e) {
      if (!(e instanceof ArgumentParseError)) {
        throw e;
      }
      // Skip to next '>'
      while (this.#pos < this.#src.length && this.#src[this.#pos] !== ">") {
        this.#pos++;
      }
      if (this.#pos < this.#src.length) this.#pos++;
    }
    return MF1ElementArgNode(name, message, { range: [start, this.#pos] });
  }

  // argNameOrNumber = argName | argNumber
  // argName = [^[[:Pattern_Syntax:][:Pattern_White_Space:]]]+
  // argNumber = '0' | ('1'..'9' ('0'..'9')*)
  #parseArgNameOrNumber(noSpace = false): number | string {
    const token = this.#nextToken(
      ["number", "identifier"],
      noSpace ? ["number", "identifier"] : undefined,
    );
    if (token.type === "number") return token.value;
    return token.raw;
  }

  #nextToken<const E extends readonly string[]>(
    this: Parser,
    expected: E,
    noWhitespace?: string[],
  ): Token & { type: E[number] } {
    const start = this.#pos;
    const [token, space] = this.#nextTokenImpl();
    if (expected.indexOf(token.type) === -1) {
      if (token.type === "EOF") {
        this.#reportEOFError({
          type: "UnexpectedToken",
          tokenDesc: tokenDesc(token),
          expected,
          range: [this.#pos, this.#pos],
        });
      } else {
        this.#diagnostics.push({
          type: "UnexpectedToken",
          tokenDesc: tokenDesc(token),
          expected,
          range: [start, this.#pos],
        });
      }
      this.#pos = start; // Rewind
      throw new ArgumentParseError(
        `Unexpected token ${tokenDesc(token)} (expected ${expected.join(", ")})`,
      );
    }
    if (noWhitespace && space && noWhitespace.indexOf(token.type) !== -1) {
      this.#diagnostics.push({
        type: "InvalidSpaces",
        range: space.range,
      });
    }
    return token;
  }

  #nextTokenImpl(): [Token, Space | undefined] {
    const space = this.#skipWhitespace();
    if (this.#pos >= this.#src.length)
      return [{ type: "EOF", raw: "", range: [this.#pos, this.#pos] }, space];
    const ch = this.#src[this.#pos]!;
    const start = this.#pos;
    let kind: Token["type"];
    if (this.#src.startsWith("offset:", this.#pos)) {
      kind = "offset:";
      this.#pos += "offset:".length;
      return [{ type: kind, raw: "offset:", range: [start, this.#pos] }, space];
    }
    const maybeIdent = this.#maybeReadIdentLike();
    if (maybeIdent) {
      return [maybeIdent, space];
    }
    if (this.#src.startsWith("::", this.#pos)) {
      kind = "::";
      this.#pos += "::".length;
    } else if (
      ch === "{" ||
      ch === "}" ||
      ch === "," ||
      ch === "<" ||
      ch === ">" ||
      ch === "/" ||
      ch === "="
    ) {
      kind = ch;
      this.#pos++;
    } else {
      kind = "unknown";
      this.#pos++;
    }
    return [
      {
        type: kind,
        raw: this.#src.substring(start, this.#pos),
        range: [start, this.#pos],
      },
      space,
    ];
  }

  #maybeReadIdentLike(): Token | null {
    const start = this.#pos;
    const suffix = this.#src.substring(this.#pos);
    const match = /^(?:[^\p{Pattern_Syntax}\p{Pattern_White_Space}]|_)+/u.exec(
      suffix,
    );
    if (!match) {
      return null;
    }
    if (/^\d/.test(match[0])) {
      // Consider it a number
      if (!/^(?:0|[1-9][0-9]*)$/.test(match[0])) {
        this.#diagnostics.push({
          type: "InvalidNumber",
          range: [start, start + match[0].length],
        });
      }
      this.#pos += match[0].length;
      return {
        type: "number",
        value: parseInt(match[0], 10) || 0,
        range: [start, this.#pos],
      };
    } else {
      // Consider it an identifier
      // It should be /[\p{Pattern_Syntax}\p{Pattern_White_Space}]/u
      // but for compatibility reasons I'm not yet sure we can use it now.
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(match[0])) {
        this.#diagnostics.push({
          type: "InvalidIdentifier",
          range: [start, start + match[0].length],
        });
      }
      this.#pos += match[0].length;
      return { type: "identifier", raw: match[0], range: [start, this.#pos] };
    }
  }

  #skipWhitespace(): Space | undefined {
    const start = this.#pos;
    const suffix = this.#src.substring(this.#pos);
    const match = /^[\s\p{Cc}\p{Cf}\p{Cn}]*/u.exec(suffix)!;
    const validMatch = /^\s*/.exec(match[0])!;
    if (validMatch[0].length < match[0].length) {
      const validSuffixMatch = /\s*$/.exec(match[0])!;
      this.#diagnostics.push({
        type: "InvalidCharacter",
        range: [
          start + validMatch[0].length,
          start + match[0].length - validSuffixMatch[0].length,
        ],
      });
      this.#pos += match[0].length;
      // Behave as if there was no space to avoid duplicated errors.
      return undefined;
    }
    this.#pos += match[0].length;
    if (this.#pos > start) {
      return { range: [start, this.#pos] };
    } else {
      return undefined;
    }
  }

  #parseDateSkeleton(
    skeleton: string,
    skeletonRange: Range,
  ): Intl.DateTimeFormatOptions {
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
      this.#diagnostics.push({
        type: "InvalidDateSkeleton",
        component: match[0]!,
        range: skeletonRange,
      });
    }
    if (requiredDateFields.every((f) => options[f] === undefined)) {
      this.#diagnostics.push({
        type: "InsufficientFieldsInDateSkeleton",
        range: skeletonRange,
      });
    }
    return options as Intl.DateTimeFormatOptions;
  }

  #reportEOFError(diagnostic: Diagnostic): void {
    if (this.#hasReportedEOFError) return;
    this.#diagnostics.push(diagnostic);
    this.#hasReportedEOFError = true;
  }
}

type ExpectDelim = "}" | "</" | "EOF";

type ArgumentState = {
  name: string | number | undefined;
};

class ArgumentParseError extends Error {
  static {
    this.prototype.name = "ArgumentParseError";
  }
}

function reduceMessage(msg: MF1Node[], range: Range): MF1Node {
  if (msg.length === 1) {
    return msg[0]!;
  } else if (msg.length === 0) {
    return MF1TextNode("", { range });
  } else {
    return MF1ConcatNode(msg, { range });
  }
}

function pushString(buf: MF1Node[], msg: MF1TextNode) {
  if (msg.value !== "") buf.push(msg);
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

type Token =
  | NumberToken
  | {
      type:
        | "identifier"
        | "offset:"
        | "::"
        | "{"
        | "}"
        | ","
        | "<"
        | ">"
        | "/"
        | "="
        | "EOF"
        | "unknown";
      raw: string;
      range: Range;
    };

type NumberToken = { type: "number"; value: number; range: Range };

type Space = { range: Range };

function tokenDesc(token: Token): string {
  if (token.type === "unknown") {
    return token.raw;
  }
  return token.type;
}
