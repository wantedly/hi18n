import type { Message } from "../opaque.ts";
import { dateArg, type DateArgStyle } from "./arg/date.ts";
import { dateTimeArg, type DateTimeArgStyle } from "./arg/datetime.ts";
import { numberArg, type NumberArgStyle } from "./arg/number.ts";
import { stringArg } from "./arg/string.ts";
import { timeArg, type TimeArgStyle } from "./arg/time.ts";

export type {
  NumberArgStyle,
  SimpleNumberArgStyle,
  ComplexNumberArgStyle,
  RoundingPriority,
  RoundingIncrement,
  RoundingMode,
  TrailingZeroDisplay,
  NumberNotation,
  NumberCompactDisplay,
  UseGrouping,
  SignDisplay,
} from "./arg/number.ts";
export type { DateArgStyle, ComplexDateArgStyle } from "./arg/date.ts";
export type { TimeArgStyle, ComplexTimeArgStyle } from "./arg/time.ts";
export type {
  DateTimeArgStyle,
  DateTimeArgShorthandPair,
  DateArgStyleShorthand,
  TimeArgStyleShorthand,
  DateTimeArgStyleShorthand,
  ComplexDateTimeArgStyle,
  WeekdayStyle,
  EraStyle,
  YearStyle,
  MonthStyle,
  DayStyle,
  DayPeriodStyle,
  HourStyle,
  MinuteStyle,
  SecondStyle,
  FractionalSecondDigits,
  TimeZoneNameStyle,
} from "./arg/datetime.ts";

/**
 * Creates a type-safe message for string interpolation.
 *
 * @param name The name of the string-valued parameter.
 * @param type The type of the parameter.
 *   Valid values:
 *   - **string (default)**
 *   - number
 *   - date
 *   - time
 *   - datetime
 * @returns A (part of) message that can be stored in a Catalog.
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *    greeting: msg`Hello, ${arg("name")}!`,
 *   });
 *   ```
 */
export function arg<const Name extends string | number>(
  name: Name,
  type?: "string",
): Message<{ [K in Name]: string }>;

/**
 * Creates a type-safe message for number interpolation.
 *
 * @param name The name of the number-valued parameter.
 * @param type The type of the parameter.
 *   Valid values:
 *   - string (default)
 *   - **number**
 *   - date
 *   - time
 *   - datetime
 * @returns A (part of) message that can be stored in a Catalog.
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *    greeting: msg`You have ${arg("unreadCount", "number", "integer")} unread messages.`,
 *   });
 *   ```
 */
export function arg<const Name extends string | number>(
  name: Name,
  type: "number",
  argStyle?: NumberArgStyle,
): Message<{ [K in Name]: number | bigint }>;

/**
 * Creates a type-safe message for date interpolation.
 *
 * @param name The name of the date-valued parameter.
 * @param type The type of the parameter.
 *   Valid values:
 *   - string (default)
 *   - number
 *   - **date**
 *   - time
 *   - datetime
 * @returns A (part of) message that can be stored in a Catalog.
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *    greeting: msg`The event is on ${arg("eventDate", "date")}.`,
 *   });
 *   ```
 */
export function arg<const Name extends string | number>(
  name: Name,
  type: "date",
  argStyle?: DateArgStyle,
): Message<{ [K in Name]: Date }>;

/**
 * Creates a type-safe message for time interpolation.
 *
 * @param name The name of the time-valued parameter.
 * @param type The type of the parameter.
 *   Valid values:
 *   - string (default)
 *   - number
 *   - date
 *   - **time**
 *   - datetime
 * @returns A (part of) message that can be stored in a Catalog.
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *    greeting: msg`The meeting is at ${arg("meetingTime", "time")}.`,
 *   });
 *   ```
 */
export function arg<const Name extends string | number>(
  name: Name,
  type: "time",
  argStyle?: TimeArgStyle,
): Message<{ [K in Name]: Date }>;

/**
 * Creates a type-safe message for datetime interpolation.
 *
 * @param name The name of the datetime-valued parameter.
 * @param type The type of the parameter.
 *   Valid values:
 *   - string (default)
 *   - number
 *   - date
 *   - time
 *   - **datetime**
 * @returns A (part of) message that can be stored in a Catalog.
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *    greeting: msg`The appointment is on ${arg("appointmentDateTime", "datetime")}.`,
 *   });
 *   ```
 */
export function arg<const Name extends string | number>(
  name: Name,
  type: "datetime",
  argStyle?: DateTimeArgStyle,
): Message<{ [K in Name]: Date }>;

export function arg(
  name: string | number,
  type: "string" | "number" | "date" | "time" | "datetime" = "string",
  argStyle?: NumberArgStyle | DateArgStyle | TimeArgStyle | DateTimeArgStyle,
): Message<never> {
  switch (type) {
    case "string":
      return stringArg(name);
    case "number":
      return numberArg(name, argStyle as NumberArgStyle | undefined);
    case "date":
      return dateArg(name, argStyle as DateArgStyle | undefined);
    case "time":
      return timeArg(name, argStyle as TimeArgStyle | undefined);
    case "datetime":
      return dateTimeArg(name, argStyle as DateTimeArgStyle | undefined);
    default:
      throw new TypeError(`Unknown argument type: ${type as string}`);
  }
}
