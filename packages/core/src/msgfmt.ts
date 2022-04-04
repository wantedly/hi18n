export type CompiledMessage =
  /* plain message */
  | string
  /* concatenation */
  | CompiledMessage[]
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
