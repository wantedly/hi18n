import { CompiledMessage } from "./msgfmt";

const SIMPLE_MESSAGE = /^[^'{}]*$/;

export function parseMessage(msg: string): CompiledMessage {
  if (SIMPLE_MESSAGE.test(msg)) return msg;
  return new Parser(msg).parseMessageEOF();
}

class Parser {
  private pos = 0;
  private reText = /[^'{}#|]*/y;
  private reQuotedText = /[^']*/y;
  constructor(public readonly src: string) {}

  public parseMessageEOF(): CompiledMessage {
    return this.parseMessage();
  }
  private parseMessage(): CompiledMessage {
    const buf: CompiledMessage[] = [];
    pushString(buf, this.parseMessageText(true, true));
    if (this.pos < this.src.length) {
      throw new Error(`Unimplemented: syntax: ${this.src[this.pos]}`);
    }
    return reduceMessage(buf);
  }
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
        buf += "#";
        this.pos++;
      } else if (this.src[this.pos] === "|" && allowBar) {
        buf += "|";
        this.pos++;
      } else {
        // Syntax character ({, }, #, |)
        break;
      }
      buf += this.parseRawMessageText(inQuote);
    }
    return buf;
  }
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
