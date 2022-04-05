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
    if (this.pos >= this.src.length) {
      throw new Error("Unclosed argument")
    } else if (this.src[this.pos] === "}") {
      this.pos++;
      return { type: "Var", name };
    } else if (this.src[this.pos] === ",") {
      this.pos++;
      this.skipWhitespace();
      const argType = this.parseWord();
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
        case "":
          throw new Error("Missing argType");
        default:
          if (!ARG_TYPES.includes(argType)) {
            throw new Error(`Invalid argType: ${argType}`);
          }
          if (this.pos >= this.src.length) {
            throw new Error("Unclosed argument")
          } else if (this.src[this.pos] === "}") {
            this.pos++;
            return { type: "Var", name, argType: argType as ArgType };
          } else if (this.src[this.pos] === ",") {
            throw new Error("Unimplemented: argStyle");
          } else {
            throw new Error("Invalid character after argument type");
          }
      }
      throw new Error("Unimplemented: simpleArg and complexArg");
    } else {
      throw new Error("Invalid character after argument name");
    }
  }

  // pluralStyle = [offsetValue] (selector '{' message '}')+
  // offsetValue = "offset:" number
  // selector = explicitValue | keyword
  // explicitValue = '=' number  // adjacent, no white space in between
  // keyword = [^[[:Pattern_Syntax:][:Pattern_White_Space:]]]+
  private parsePluralArgument(name: string | number): PluralArg {
    if (this.pos >= this.src.length) {
      throw new Error("Unclosed argument")
    } else if (this.src[this.pos] !== ",") {
      throw new Error("Invalid character after plural");
    }
    this.pos++;
    this.skipWhitespace();

    let offset: number | undefined = undefined;
    if (this.src.startsWith("offset:", this.pos)) {
      this.pos += "offset:".length;
      this.skipWhitespace();
      const num = this.parseArgNameOrNumber();
      if (typeof num !== "number") throw new Error("Offset must be a number");
      offset = num;
    }
    const branches: PluralBranch[] = [];
    while (this.pos < this.src.length && this.src[this.pos] !== "}") {
      let selector: number | string;
      if (this.src[this.pos] === "=") {
        this.pos++;
        if (this.pos < this.src.length && /\s/.test(this.src[this.pos]!)) throw new Error("= must not precede a whitespace");
        const num = this.parseArgNameOrNumber();
        if (typeof num !== "number") throw new Error("=selector must be a number");
        selector = num;
      } else {
        const keyword = this.parseArgNameOrNumber();
        if (typeof keyword === "number") throw new Error("selector keyword must not be a number");
        if (keyword === "") throw new Error("Invalid selector");
        selector = keyword;
      }
      if (this.pos >= this.src.length) throw new Error("Unclosed argument");
      if (this.src[this.pos] !== "{") throw new Error("Plural branch must start with {");
      this.pos++;
      const message = this.parseMessage();
      if (this.pos >= this.src.length) throw new Error("Unclosed argument");
      if (this.src[this.pos] !== "}") throw new Error("Bug: invalid syntax character");
      this.pos++;
      this.skipWhitespace();
      branches.push({ selector, message });
    }
    if (this.pos >= this.src.length) throw new Error("Unclosed argument");
    this.pos++;
    if (branches.length === 0) throw new Error("No branch found");
    if (branches[branches.length - 1]!.selector !== "other") throw new Error("Last selector should be other");
    return { type: "Plural", name, offset, branches };
  }

  // argNameOrNumber = argName | argNumber
  // argName = [^[[:Pattern_Syntax:][:Pattern_White_Space:]]]+
  // argNumber = '0' | ('1'..'9' ('0'..'9')*)
  private parseArgNameOrNumber(): number | string {
    const start = this.pos;
    // It should be /[\p{Pattern_Syntax}\p{Pattern_White_Space}]/u
    // but for compatibility reasons I'm not yet sure we can use it now.
    while (this.pos < this.src.length && /[0-9A-Z_a-z]/.test(this.src[this.pos]!)) {
      this.pos++;
    }
    const token = this.src.substring(start, this.pos);
    if (token === "") {
      throw new Error("Unexpected token after {");
    } else if (/^[0-9]/.test(token)) {
      if (!/^[0-9]+$/.test(token)) {
        throw new Error("Invalid character in a number");
      } else if (token.startsWith("0") && token !== "0") {
        throw new Error("Numbers cannot start with 0");
      } else {
        this.skipWhitespace();
        return parseInt(token);
      }
    }
    this.skipWhitespace();
    return token;
  }

  private parseWord(): string {
    const start = this.pos;
    while (this.pos < this.src.length && /[0-9A-Z_a-z]/.test(this.src[this.pos]!)) {
      this.pos++;
    }
    const token = this.src.substring(start, this.pos);
    this.skipWhitespace();
    return token;
  }

  private skipWhitespace() {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos]!)) this.pos++;
  }
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
