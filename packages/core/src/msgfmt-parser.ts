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
    return this.parseMessage();
  }

  // message = messageText (argument messageText)*
  private parseMessage(): CompiledMessage {
    const buf: CompiledMessage[] = [];
    pushString(buf, this.parseMessageText(true, true));
    if (this.pos < this.src.length) {
      throw new Error(`Unimplemented: syntax: ${this.src[this.pos]}`);
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
