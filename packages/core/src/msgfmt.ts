export type CompiledMessage =
  /* plain message. Quotations such as "It''s awsesome" are already unescaped. */
  | string
  /* concatenation */
  | CompiledMessage[]
  /* interpolation for noneArg ("{foo}") */
  | { type: "Var", name: string | number }
  ;

export function evaluateMessage(msg: CompiledMessage, key: string, params: Record<string, unknown>): string {
  if (typeof msg === "string") {
    return msg;
  } else if (Array.isArray(msg)) {
    return msg.map((part) => evaluateMessage(part, key, params)).join("");
  } else if (msg.type === "Var") {
    const value = params[msg.name];
    if (value === undefined) throw new Error(`Missing argument for ${key}: ${msg.name}`);
    if (typeof value !== "string") throw new Error(`Invalid argument for ${key}: ${msg.name}: ${value}`);
    return value;
  }
  throw new Error("Invalid message");
}
