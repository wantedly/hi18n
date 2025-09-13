import { StringArg } from "../../msgfmt.ts";
import { wrap, type Message } from "../../opaque.ts";
import { validateName } from "../util.ts";

export function stringArg<const Name extends string | number>(
  name: Name,
): Message<{ [K in Name]: string }> {
  validateName(name);
  return wrap(StringArg(name));
}
