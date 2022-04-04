import { CompiledMessage } from "./msgfmt";

const SIMPLE_MESSAGE = /^[^'{}]*$/;

export function parseMessage(msg: string): CompiledMessage {
  if (SIMPLE_MESSAGE.test(msg)) return msg;
  return new Parser(msg).parseMessageEOF();
}

// References for ICU MessageFormat syntax:
// https://unicode-org.github.io/icu-docs/apidoc/released/icu4j/com/ibm/icu/text/MessageFormat.html
// https://unicode-org.github.io/icu/userguide/format_parse/messages/
class Parser {
  private pos = 0;
  private reText = /[^'{}#|]*/y;
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
    pushString(buf, this.parseMessageText(true, true));
    while (this.pos < this.src.length && this.src[this.pos] !== "}") {
      switch (this.src[this.pos]) {
        case "{":
          buf.push(this.parseArgument());
          break;
        case "|":
          throw new Error(`Unimplemented: syntax: |`);
        case "#":
          throw new Error(`Unimplemented: syntax: #`);
        default:
          throw new Error(`Bug: invalid syntax character: ${this.src[this.pos]}`);
      }
      pushString(buf, this.parseMessageText(true, true));
    }
    return reduceMessage(buf);
  }

  // messageText consists of three parts:
  //
  // - plain message text
  // - quoted message text
  // - escaped quotes
  private parseMessageText(allowHash: boolean, allowBar: boolean): string {
    let inQuote = false;
    let buf = this.parseRawMessageText(inQuote);
    while (this.pos < this.src.length) {
      if (this.src[this.pos] === "'") {
        if (this.pos + 1 < this.src.length && this.src[this.pos + 1] === "'") {
          // Self-escaped quotation
          buf += "'";
          this.pos += 2;
        } else {
          // Beginning or end of quoted text
          inQuote = !inQuote;
          this.pos++;
        }
      } else if (this.src[this.pos] === "#" && allowHash) {
        // A plain '#' character. It is special only within pluralStyle.
        buf += "#";
        this.pos++;
      } else if (this.src[this.pos] === "|" && allowBar) {
        // A plain '|' character. It is special only within choiceStyle.
        buf += "|";
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
  // Eats up the text until it encounters a syntax character ('{', '}', '#', '|'), a quote ("'"), or EOF.
  // In quoted mode, the four syntax characters ('{', '}', '#', '|') are considered part of the text.
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
      throw new Error("Unimplemented: simpleArg and complexArg");
    } else {
      throw new Error("Invalid character after argument name");
    }
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
