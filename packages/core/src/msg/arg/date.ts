import type { Message } from "../../opaque.ts";
import {
  dateTimeArg,
  type ComplexDateTimeArgStyle,
  type DateArgStyleShorthand,
} from "./datetime.ts";

export type DateArgStyle = DateArgStyleShorthand | ComplexDateArgStyle;
export type ComplexDateArgStyle = Pick<
  ComplexDateTimeArgStyle,
  "weekday" | "era" | "year" | "month" | "day"
>;

export function dateArg<const Name extends string | number>(
  name: Name,
  argStyle?: DateArgStyle,
): Message<{ [K in Name]: Date } & { timeZone: string }> {
  argStyle ??= {};
  if (typeof argStyle === "string") {
    return dateTimeArg(name, { dateStyle: argStyle });
  } else if (typeof argStyle === "object" && argStyle !== null) {
    const { weekday, era, year, month, day } = argStyle;

    if (
      weekday == null &&
      era == null &&
      year == null &&
      month == null &&
      day == null
    ) {
      return dateTimeArg(name, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    }
    return dateTimeArg(name, { weekday, era, year, month, day });
  }
  throw new TypeError(`Unknown date argStyle: ${argStyle as string}`);
}
