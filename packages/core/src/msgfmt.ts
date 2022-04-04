export type CompiledMessage =
  /* plain message. Quotations such as "It''s awsesome" are already unescaped. */
  | string
  /* concatenation */
  | CompiledMessage[]
  /* interpolation for noneArg ("{foo}") */
  | { type: "Var", name: string }
  ;

export function evaluateMessage(msg: CompiledMessage, params: Record<string, unknown>): string {
  if (typeof msg === "string") {
    return msg;
  } else if (Array.isArray(msg)) {
    return msg.map((part) => evaluateMessage(part, params)).join("");
  } else if (msg.type === "Var") {
    return `${params[msg.name]}`;
  }
  throw new Error("Invalid message");
}
