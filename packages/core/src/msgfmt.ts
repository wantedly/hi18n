export type CompiledMessage =
  /* plain message. Quotations such as "It''s awsesome" are already unescaped. */
  | string
  /* concatenation */
  | CompiledMessage[]
  /* interpolation for noneArg ("{foo}") */
  | { type: "Var", name: string | number, argType?: ArgType | undefined }
  /* plural form selection */
  | PluralArg
  ;

export type PluralArg = {
  type: "Plural";
  name: string | number;
  offset?: number | undefined;
  branches: PluralBranch[];
}

export type PluralBranch = {
  selector: number | string;
  message: CompiledMessage;
};

export type ArgType = "number" | "date" | "time" | "spellout" | "ordinal" | "duration";

export function evaluateMessage(msg: CompiledMessage, key: string, params: Record<string, unknown>): string {
  if (typeof msg === "string") {
    return msg;
  } else if (Array.isArray(msg)) {
    return msg.map((part) => evaluateMessage(part, key, params)).join("");
  } else if (msg.type === "Var") {
    const value = params[msg.name];
    if (value === undefined) throw new Error(`Missing argument for ${key}: ${msg.name}`);
    switch (msg.argType ?? "string") {
      case "string":
        if (typeof value !== "string") throw new Error(`Invalid argument for ${key}: ${msg.name}: ${value}`);
        return value;
        break;
      default:
        throw new Error(`Unimplemented: argType=${msg.argType}`);
    }
  } else if (msg.type === "Plural") {
    throw new Error("Unimplemented: plural form interpretation");
  }
  throw new Error("Invalid message");
}
