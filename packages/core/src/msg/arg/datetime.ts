import { DateTimeArg } from "../../msgfmt.ts";
import { wrap, type Message } from "../../opaque.ts";
import {
  coerceNumberOrUndefined,
  coerceStringOrUndefined,
  validateName,
} from "../util.ts";

export type DateTimeArgStyle =
  | DateTimeArgStyleShorthand
  | DateTimeArgShorthandPair
  | ComplexDateTimeArgStyle;
export type DateTimeArgShorthandPair =
  | {
      timeStyle: TimeArgStyleShorthand;
      dateStyle?: DateArgStyleShorthand | undefined;
      era?: undefined;
      year?: undefined;
      month?: undefined;
      day?: undefined;
      dayPeriod?: undefined;
      hour?: undefined;
      minute?: undefined;
      second?: undefined;
      fractionalSecondDigits?: undefined;
      timeZoneName?: undefined;
    }
  | {
      timeStyle?: TimeArgStyleShorthand | undefined;
      dateStyle: DateArgStyleShorthand;
      era?: undefined;
      year?: undefined;
      month?: undefined;
      day?: undefined;
      dayPeriod?: undefined;
      hour?: undefined;
      minute?: undefined;
      second?: undefined;
      fractionalSecondDigits?: undefined;
      timeZoneName?: undefined;
    };
export type DateArgStyleShorthand = "short" | "medium" | "long" | "full";
const validDateArgStyleShorthands: Set<DateArgStyleShorthand> = new Set([
  "short",
  "medium",
  "long",
  "full",
]);
export type TimeArgStyleShorthand = "short" | "medium" | "long" | "full";
const validTimeArgStyleShorthands: Set<TimeArgStyleShorthand> = new Set([
  "short",
  "medium",
  "long",
  "full",
]);
export type DateTimeArgStyleShorthand = DateArgStyleShorthand &
  TimeArgStyleShorthand;
export type ComplexDateTimeArgStyle = {
  timeStyle?: undefined;
  dateStyle?: undefined;
  weekday?: WeekdayStyle | undefined;
  era?: "narrow" | "short" | "long" | undefined;
  year?: YearStyle | undefined;
  month?: MonthStyle | undefined;
  day?: DayStyle | undefined;
  dayPeriod?: DayPeriodStyle | undefined;
  hour?: HourStyle | undefined;
  minute?: MinuteStyle | undefined;
  second?: SecondStyle | undefined;
  fractionalSecondDigits?: FractionalSecondDigits | undefined;
  timeZoneName?: TimeZoneNameStyle | undefined;
};
export type WeekdayStyle = "narrow" | "short" | "long";
const validWeekdayStyles: Set<WeekdayStyle> = new Set([
  "narrow",
  "short",
  "long",
]);
export type EraStyle = "narrow" | "short" | "long";
const validEraStyles: Set<EraStyle> = new Set(["narrow", "short", "long"]);
export type YearStyle = "2-digit" | "numeric";
const validYearStyles: Set<YearStyle> = new Set(["2-digit", "numeric"]);
export type MonthStyle = "2-digit" | "numeric" | "narrow" | "short" | "long";
const validMonthStyles: Set<MonthStyle> = new Set([
  "2-digit",
  "numeric",
  "narrow",
  "short",
  "long",
]);
export type DayStyle = "2-digit" | "numeric";
const validDayStyles: Set<DayStyle> = new Set(["2-digit", "numeric"]);
export type DayPeriodStyle = "narrow" | "short" | "long";
const validDayPeriodStyles: Set<DayPeriodStyle> = new Set([
  "narrow",
  "short",
  "long",
]);
export type HourStyle = "2-digit" | "numeric";
const validHourStyles: Set<HourStyle> = new Set(["2-digit", "numeric"]);
export type MinuteStyle = "2-digit" | "numeric";
const validMinuteStyles: Set<MinuteStyle> = new Set(["2-digit", "numeric"]);
export type SecondStyle = "2-digit" | "numeric";
const validSecondStyles: Set<SecondStyle> = new Set(["2-digit", "numeric"]);
export type FractionalSecondDigits = 1 | 2 | 3;
const validFractionalSecondDigits: Set<FractionalSecondDigits> = new Set([
  1, 2, 3,
]);
export type TimeZoneNameStyle =
  | "short"
  | "long"
  | "shortOffset"
  | "longOffset"
  | "shortGeneric"
  | "longGeneric";
const validTimeZoneNameStyles: Set<TimeZoneNameStyle> = new Set([
  "short",
  "long",
  "shortOffset",
  "longOffset",
  "shortGeneric",
  "longGeneric",
]);

export function dateTimeArg<const Name extends string | number>(
  name: Name,
  argStyle?: DateTimeArgStyle,
): Message<{ [K in Name]: Date } & { timeZone: string }> {
  validateName(name);
  argStyle ??= {};
  let options: Intl.DateTimeFormatOptions;
  if (typeof argStyle === "object" && argStyle !== null) {
    if (argStyle.timeStyle !== undefined || argStyle.dateStyle !== undefined) {
      let { timeStyle, dateStyle } = argStyle;
      timeStyle = coerceStringOrUndefined(timeStyle);
      dateStyle = coerceStringOrUndefined(dateStyle);
      if (timeStyle != null && !validTimeArgStyleShorthands.has(timeStyle)) {
        throw new TypeError(
          `timeStyle must be one of ${Array.from(validTimeArgStyleShorthands).join(", ")}, but got ${timeStyle}`,
        );
      }
      if (dateStyle != null && !validDateArgStyleShorthands.has(dateStyle)) {
        throw new TypeError(
          `dateStyle must be one of ${Array.from(validDateArgStyleShorthands).join(", ")}, but got ${dateStyle}`,
        );
      }
      options = { timeStyle, dateStyle };
    } else {
      let {
        weekday,
        era,
        year,
        month,
        day,
        dayPeriod,
        hour,
        minute,
        second,
        fractionalSecondDigits,
        timeZoneName,
      } = argStyle;
      weekday = coerceStringOrUndefined(weekday);
      era = coerceStringOrUndefined(era);
      year = coerceStringOrUndefined(year);
      month = coerceStringOrUndefined(month);
      day = coerceStringOrUndefined(day);
      dayPeriod = coerceStringOrUndefined(dayPeriod);
      hour = coerceStringOrUndefined(hour);
      minute = coerceStringOrUndefined(minute);
      second = coerceStringOrUndefined(second);
      fractionalSecondDigits = coerceNumberOrUndefined(fractionalSecondDigits);
      timeZoneName = coerceStringOrUndefined(timeZoneName);
      if (weekday != null && !validWeekdayStyles.has(weekday)) {
        throw new TypeError(
          `weekday must be one of ${Array.from(validWeekdayStyles).join(
            ", ",
          )}, but got ${weekday as string}`,
        );
      }
      if (era != null && !validEraStyles.has(era)) {
        throw new TypeError(
          `era must be one of ${Array.from(validEraStyles).join(
            ", ",
          )}, but got ${era as string}`,
        );
      }
      if (year != null && !validYearStyles.has(year)) {
        throw new TypeError(
          `year must be one of ${Array.from(validYearStyles).join(
            ", ",
          )}, but got ${year as string}`,
        );
      }
      if (month != null && !validMonthStyles.has(month)) {
        throw new TypeError(
          `month must be one of ${Array.from(validMonthStyles).join(
            ", ",
          )}, but got ${month as string}`,
        );
      }
      if (day != null && !validDayStyles.has(day)) {
        throw new TypeError(
          `day must be one of ${Array.from(validDayStyles).join(
            ", ",
          )}, but got ${day as string}`,
        );
      }
      if (dayPeriod != null && !validDayPeriodStyles.has(dayPeriod)) {
        throw new TypeError(
          `dayPeriod must be one of ${Array.from(validDayPeriodStyles).join(
            ", ",
          )}, but got ${dayPeriod as string}`,
        );
      }
      if (hour != null && !validHourStyles.has(hour)) {
        throw new TypeError(
          `hour must be one of ${Array.from(validHourStyles).join(
            ", ",
          )}, but got ${hour as string}`,
        );
      }
      if (minute != null && !validMinuteStyles.has(minute)) {
        throw new TypeError(
          `minute must be one of ${Array.from(validMinuteStyles).join(
            ", ",
          )}, but got ${minute as string}`,
        );
      }
      if (second != null && !validSecondStyles.has(second)) {
        throw new TypeError(
          `second must be one of ${Array.from(validSecondStyles).join(
            ", ",
          )}, but got ${second as string}`,
        );
      }
      if (
        fractionalSecondDigits != null &&
        !validFractionalSecondDigits.has(fractionalSecondDigits)
      ) {
        throw new RangeError(
          `fractionalSecondDigits must be one of ${Array.from(
            validFractionalSecondDigits,
          ).join(", ")}, but got ${fractionalSecondDigits}`,
        );
      }
      if (timeZoneName != null && !validTimeZoneNameStyles.has(timeZoneName)) {
        throw new TypeError(
          `timeZoneName must be one of ${Array.from(
            validTimeZoneNameStyles,
          ).join(", ")}, but got ${timeZoneName as string}`,
        );
      }
      if (
        weekday == null &&
        year == null &&
        month == null &&
        day == null &&
        dayPeriod == null &&
        hour == null &&
        minute == null &&
        second == null &&
        fractionalSecondDigits == null
      ) {
        if (era != null || timeZoneName != null) {
          throw new TypeError(
            `At least one of weekday, year, month, day, dayPeriod, hour, minute, second, fractionalSecondDigits must be specified`,
          );
        } else {
          // Default to full date and time if nothing is specified
          year = "numeric";
          month = "numeric";
          day = "numeric";
          hour = "numeric";
          minute = "numeric";
          second = "numeric";
        }
      }
      options = {
        weekday,
        era,
        year,
        month,
        day,
        dayPeriod,
        hour,
        minute,
        second,
        fractionalSecondDigits,
        timeZoneName,
      };
    }
  } else if (
    validDateArgStyleShorthands.has(argStyle as DateArgStyleShorthand) &&
    validTimeArgStyleShorthands.has(argStyle as TimeArgStyleShorthand)
  ) {
    options = { dateStyle: argStyle, timeStyle: argStyle };
  } else {
    throw new TypeError(`Unknown number argStyle: ${argStyle as string}`);
  }
  return wrap(DateTimeArg(name, options));
}
