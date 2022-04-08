import { ArgType, CompiledMessage, PluralArg, PluralBranch } from "./msgfmt";

const SIMPLE_MESSAGE = /^[^'{}]*$/;

export function parseMessage(msg: string): CompiledMessage {
  if (SIMPLE_MESSAGE.test(msg)) return msg;
  return new Parser(msg).parseMessageEOF();
}

const ARG_TYPES = ["number", "date", "time", "spellout", "ordinal", "duration"];

// References for ICU MessageFormat syntax:
// https://unicode-org.github.io/icu-docs/apidoc/released/icu4j/com/ibm/icu/text/MessageFormat.html
// https://unicode-org.github.io/icu/userguide/format_parse/messages/
class Parser {
  private pos = 0;
  private reText = /[^'{}#]*/y;
  private reQuotedText = /[^']*/y;
  constructor(public readonly src: string) {}

  public parseMessageEOF(): CompiledMessage {
    const msg = this.parseMessage();
    if (this.pos < this.src.length) {
      throw new Error("Found an unmatching }");
    }
    return msg;
  }

  // message = messageText (argument messageText)*
  // The grammar doesn't mention it but it should also have '#' as a special interpolation.
  private parseMessage(): CompiledMessage {
    const buf: CompiledMessage[] = [];
    pushString(buf, this.parseMessageText(true));
    while (this.pos < this.src.length && this.src[this.pos] !== "}") {
      switch (this.src[this.pos]) {
        case "{":
          buf.push(this.parseArgument());
          break;
        case "#":
          throw new Error(`Unimplemented: syntax: #`);
        default:
          throw new Error(`Bug: invalid syntax character: ${this.src[this.pos]}`);
      }
      pushString(buf, this.parseMessageText(true));
    }
    return reduceMessage(buf);
  }

  // messageText consists of three parts:
  //
  // - plain message text
  // - quoted message text
  // - escaped quotes
  private parseMessageText(allowHash: boolean): string {
    let inQuote = false;
    let buf = this.parseRawMessageText(inQuote);
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
          this.pos + 1 < this.src.length && (
            this.src[this.pos + 1] === "{" ||
            this.src[this.pos + 1] === "}" ||
            (this.src[this.pos + 1] === "#" && allowHash)
          )
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
        // Syntax character ({, }, #, |)
        break;
      }
      buf += this.parseRawMessageText(inQuote);
    }
    if (inQuote) {
      throw new Error("Unclosed quoted string");
    }
    return buf;
  }
  // Eats up the text until it encounters a syntax character ('{', '}', '#'), a quote ("'"), or EOF.
  // In quoted mode, the four syntax characters ('{', '}', '#') are considered part of the text.
  private parseRawMessageText(inQuote: boolean): string {
    const re = inQuote ? this.reQuotedText : this.reText;
    re.lastIndex = this.pos;
    const text = re.exec(this.src)![0]!;
    this.pos += text.length;
    return text;
  }

  // Something enclosed within {}.
  // argument = noneArg | simpleArg | complexArg
  // complexArg = choiceArg | pluralArg | selectArg | selectordinalArg
  private parseArgument(): CompiledMessage {
    this.pos++; // Eat the open brace
    this.skipWhitespace();
    const name = this.parseArgNameOrNumber();
    switch (this.nextToken(["}", ","] as const, ["}"])[0]) {
      case "}":
        return { type: "Var", name };
      case ",": {
        const argType = this.nextToken(["identifier"] as const)[1];
        switch (argType) {
          case "choice":
            throw new Error("choice is not supported");
            break;
          case "plural":
            return this.parsePluralArgument(name);
          case "select":
          case "selectordinal":
            throw new Error("Unimplemented: selectArg");
            break;
          default:
            if (!ARG_TYPES.includes(argType)) {
              throw new Error(`Invalid argType: ${argType}`);
            }
            switch (this.nextToken(["}", ","] as const, ["}"])[0]) {
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
  private parsePluralArgument(name: string | number): PluralArg {
    this.nextToken([","]);
    let token = this.nextToken(["offset:", "identifier", "=number", "}"] as const, ["}"]);
    let offset: number | undefined = undefined;
    if (token[0] === "offset:") {
      offset = parseNumber(this.nextToken(["number"] as const)[1]);
      token = this.nextToken(["identifier", "=number", "}"] as const, ["}"]);
    }
    const branches: PluralBranch[] = [];
    while (token[0] !== "}") {
      const selector = token[0] === "=number" ? parseNumber(token[1].substring(1)) : token[1];
      this.nextToken(["{"], ["{"]);
      const message = this.parseMessage();
      this.nextToken(["}"]);
      branches.push({ selector, message });
      token = this.nextToken(["identifier", "=number", "}"] as const, ["}"]);
    }
    if (branches.length === 0) throw new Error("No branch found");
    if (branches[branches.length - 1]!.selector !== "other") throw new Error("Last selector should be other");
    return { type: "Plural", name, offset, branches };
  }

  // argNameOrNumber = argName | argNumber
  // argName = [^[[:Pattern_Syntax:][:Pattern_White_Space:]]]+
  // argNumber = '0' | ('1'..'9' ('0'..'9')*)
  private parseArgNameOrNumber(): number | string {
    const [kind, token] = this.nextToken(["number", "identifier"] as const);
    if (kind === "number") return parseNumber(token);
    return token;
  }

  private nextToken<E extends readonly string[]>(expected: E, spaceSensitive?: string[]): [E[number], string] {
    const [kind, token] = this.nextTokenImpl();
    if (!expected.includes(kind)) throw new Error(`Unexpected token ${kind} (expected ${expected.join(", ")})`);
    if (!spaceSensitive || !spaceSensitive.includes(kind)) this.skipWhitespace();
    return [kind, token];
  }

  private nextTokenImpl(): [string, string] {
    if (this.pos >= this.src.length) return ["EOF", ""];
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
      while (this.pos < this.src.length && /[0-9A-Z_a-z]/.test(this.src[this.pos]!)) {
        this.pos++;
      }
    } else if (ch === "=" && this.pos + 1 < this.src.length && /[0-9A-Z_a-z]/.test(this.src[this.pos + 1]!)) {
      kind = "=number";
      this.pos++;
      while (this.pos < this.src.length && /[0-9A-Z_a-z]/.test(this.src[this.pos]!)) {
        this.pos++;
      }
    } else {
      kind = ch;
      this.pos++;
    }
    return [kind, this.src.substring(start, this.pos)];
  }

  private skipWhitespace() {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos]!)) this.pos++;
  }
}

function parseNumber(token: string): number {
  if (!/^(?:0|[1-9][0-9]*)$/.test(token)) throw new Error(`Invalid number: ${token}`);
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