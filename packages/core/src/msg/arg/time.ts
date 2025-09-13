import type { Message } from "../../opaque.ts";
import {
  dateTimeArg,
  type ComplexDateTimeArgStyle,
  type TimeArgStyleShorthand,
} from "./datetime.ts";

export type TimeArgStyle = TimeArgStyleShorthand | ComplexTimeArgStyle;
export type ComplexTimeArgStyle = Pick<
  ComplexDateTimeArgStyle,
  | "dayPeriod"
  | "hour"
  | "minute"
  | "second"
  | "fractionalSecondDigits"
  | "timeZoneName"
>;

export function timeArg<const Name extends string | number>(
  name: Name,
  argStyle?: TimeArgStyle,
): Message<{ [K in Name]: Date } & { timeZone: string }> {
  argStyle ??= {};
  if (typeof argStyle === "string") {
    return dateTimeArg(name, { timeStyle: argStyle });
  } else if (typeof argStyle === "object" && argStyle != null) {
    const {
      dayPeriod,
      hour,
      minute,
      second,
      fractionalSecondDigits,
      timeZoneName,
    } = argStyle;

    if (
      dayPeriod == null &&
      hour == null &&
      minute == null &&
      second == null &&
      fractionalSecondDigits == null &&
      timeZoneName == null
    ) {
      return dateTimeArg(name, {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    }

    return dateTimeArg(name, {
      dayPeriod,
      hour,
      minute,
      second,
      fractionalSecondDigits,
      timeZoneName,
    });
  }
  throw new TypeError(`Unknown time argStyle: ${argStyle as string}`);
}
