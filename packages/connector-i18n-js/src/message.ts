type I18nMessage =
  | string
  | {
      zero?: string | undefined;
      one?: string | undefined;
      two?: string | undefined;
      few?: string | undefined;
      many?: string | undefined;
      other: string;
    };

const pluralKeys = ["zero", "one", "two", "few", "many", "other"] as const;

export function convertMessage(msg: I18nMessage): string {
  if (typeof msg === "string") {
    return convertSingleMessage(msg);
  } else {
    const usedKeys = pluralKeys.filter(
      (k) => typeof msg[k] === "string" && msg[k] !== msg.other
    );
    if (usedKeys.length === 0) {
      return convertSingleMessage(msg.other);
    }
    usedKeys.push("other");
    return `{count, plural, ${usedKeys
      .map((k) => `${k} {${convertSingleMessage(msg[k]!, true)}}`)
      .join(" ")}}`;
  }
}

function convertSingleMessage(msg: string, pluralMode = false): string {
  // https://github.com/fnando/i18n/blob/v4.0.2/src/I18n.ts#L51
  const re = /[%{]\{(.*?)\}\}?/g;
  let result = "";
  let pos = 0;
  while (true) {
    const match = re.exec(msg);

    const start = match?.index ?? msg.length;
    result += escapeMF(msg.substring(pos, start));

    if (!match) break;
    const name = match[1]!;

    if (pluralMode && name === "count") {
      result += `#`;
    } else {
      result += `{${name}}`;
    }
    pos = match.index + match[0]!.length;
  }
  return result;
}

function escapeMF(text: string): string {
  return text.replace(/['{}#<]/g, (part) => {
    if (part === "'") {
      return "''";
    } else {
      return `'${part}'`;
    }
  });
}

export function isMessage(obj: unknown): obj is I18nMessage {
  return (
    typeof obj === "string" ||
    (isObject(obj) &&
      typeof obj["other"] === "string" &&
      pluralKeys.every(
        (k) => obj[k] === undefined || typeof obj[k] === "string"
      ))
  );
}

function isObject(obj: unknown): obj is object & Record<string, unknown> {
  return typeof obj === "object" && obj != null;
}
