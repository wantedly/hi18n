import { NumberArg } from "../../msgfmt.ts";
import { wrap, type Message } from "../../opaque.ts";
import {
  coerceNumberOrUndefined,
  coerceStringOrUndefined,
  validateName,
} from "../util.ts";

export type NumberArgStyle = SimpleNumberArgStyle | ComplexNumberArgStyle;
export type SimpleNumberArgStyle = "number" | "integer" | "percent";
export type ComplexNumberArgStyle = {
  subtract?: number;
  style?: "decimal" | "percent" | undefined;
  minimumIntegerDigits?: number | undefined;
  minimumFractionDigits?: number | undefined;
  maximumFractionDigits?: number | undefined;
  minimumSignificantDigits?: number | undefined;
  maximumSignificantDigits?: number | undefined;
  roundingPriority?: RoundingPriority | undefined;
  roundingIncrement?: RoundingIncrement | undefined;
  roundingMode?: RoundingMode | undefined;
  trailingZeroDisplay?: TrailingZeroDisplay | undefined;
  notation?: NumberNotation | undefined;
  compactDisplay?: NumberCompactDisplay | undefined;
  useGrouping?: UseGrouping | undefined;
  signDisplay?: SignDisplay | undefined;
};
export type RoundingPriority = "auto" | "morePrecision" | "lessPrecision";
export type RoundingIncrement =
  | 1
  | 2
  | 5
  | 10
  | 20
  | 25
  | 50
  | 100
  | 200
  | 250
  | 500
  | 1000
  | 2000
  | 2500
  | 5000;
const validRoundingIncrements: Set<RoundingIncrement> = new Set([
  1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000,
]);

export type RoundingMode =
  | "ceil"
  | "floor"
  | "expand"
  | "trunc"
  | "halfCeil"
  | "halfFloor"
  | "halfExpand"
  | "halfTrunc"
  | "halfEven";
const validRoundingModes: Set<RoundingMode> = new Set([
  "ceil",
  "floor",
  "expand",
  "trunc",
  "halfCeil",
  "halfFloor",
  "halfExpand",
  "halfTrunc",
  "halfEven",
]);

export type TrailingZeroDisplay = "auto" | "stripIfInteger";
const validTrailingZeroDisplays: Set<TrailingZeroDisplay> = new Set([
  "auto",
  "stripIfInteger",
]);

export type NumberNotation =
  | "standard"
  | "scientific"
  | "engineering"
  | "compact";
const validNumberNotations: Set<NumberNotation> = new Set([
  "standard",
  "scientific",
  "engineering",
  "compact",
]);

export type NumberCompactDisplay = "short" | "long";
const validNumberCompactDisplays: Set<NumberCompactDisplay> = new Set([
  "short",
  "long",
]);
export type UseGrouping = boolean | "min2" | "auto" | "always";
const validUseGroupings: Set<UseGrouping> = new Set([
  true,
  false,
  "min2",
  "auto",
  "always",
]);

export type SignDisplay =
  | "auto"
  | "never"
  | "always"
  | "exceptZero"
  | "negative";
const validSignDisplays: Set<SignDisplay> = new Set([
  "auto",
  "never",
  "always",
  "exceptZero",
  "negative",
]);

export function numberArg<const Name extends string | number>(
  name: Name,
  argStyle: NumberArgStyle = "number",
): Message<{ [K in Name]: number | bigint }> {
  validateName(name);
  let subtract: number = 0;
  let options: Intl.NumberFormatOptions;
  if (typeof argStyle === "object" && argStyle !== null) {
    let {
      style = "decimal",
      minimumIntegerDigits,
      minimumFractionDigits,
      maximumFractionDigits,
      minimumSignificantDigits,
      maximumSignificantDigits,
      roundingPriority,
      roundingIncrement,
      roundingMode,
      trailingZeroDisplay,
      notation,
      compactDisplay,
      useGrouping,
      signDisplay,
    } = argStyle;

    subtract = +(argStyle.subtract ?? 0);
    style = `${style}`;
    minimumIntegerDigits = coerceNumberOrUndefined(minimumIntegerDigits);
    minimumFractionDigits = coerceNumberOrUndefined(minimumFractionDigits);
    maximumFractionDigits = coerceNumberOrUndefined(maximumFractionDigits);
    minimumSignificantDigits = coerceNumberOrUndefined(
      minimumSignificantDigits,
    );
    maximumSignificantDigits = coerceNumberOrUndefined(
      maximumSignificantDigits,
    );
    roundingPriority = coerceStringOrUndefined(roundingPriority);
    roundingIncrement = coerceNumberOrUndefined(roundingIncrement);
    roundingMode = coerceStringOrUndefined(roundingMode);
    trailingZeroDisplay = coerceStringOrUndefined(trailingZeroDisplay);
    notation = coerceStringOrUndefined(notation);
    compactDisplay = coerceStringOrUndefined(compactDisplay);
    if (typeof useGrouping !== "boolean") {
      useGrouping = coerceStringOrUndefined(useGrouping);
    }
    signDisplay = coerceStringOrUndefined(signDisplay);

    if (!Number.isInteger(subtract) || subtract < 0) {
      throw new RangeError(
        `subtract must be a non-negative integer, but got ${subtract}`,
      );
    }
    if (style !== "decimal" && style !== "percent") {
      throw new TypeError(
        `style must be "decimal" or "percent", but got ${style as string}`,
      );
    }
    if (
      minimumIntegerDigits != null &&
      (minimumIntegerDigits < 1 || minimumIntegerDigits > 21)
    ) {
      throw new RangeError(
        `minimumIntegerDigits must be between 1 and 21, but got ${minimumIntegerDigits}`,
      );
    }
    if (
      roundingIncrement != null &&
      !validRoundingIncrements.has(roundingIncrement)
    ) {
      throw new RangeError(
        `roundingIncrement must be one of ${Array.from(
          validRoundingIncrements,
        ).join(", ")}, but got ${roundingIncrement}`,
      );
    }
    if (roundingMode != null && !validRoundingModes.has(roundingMode)) {
      throw new RangeError(
        `roundingMode must be one of ${Array.from(validRoundingModes).join(
          ", ",
        )}, but got ${roundingMode as string}`,
      );
    }
    if (
      trailingZeroDisplay != null &&
      !validTrailingZeroDisplays.has(trailingZeroDisplay)
    ) {
      throw new RangeError(
        `trailingZeroDisplay must be one of ${Array.from(
          validTrailingZeroDisplays,
        ).join(", ")}, but got ${trailingZeroDisplay as string}`,
      );
    }
    if (notation != null && !validNumberNotations.has(notation)) {
      throw new RangeError(
        `notation must be one of ${Array.from(validNumberNotations).join(
          ", ",
        )}, but got ${notation as string}`,
      );
    }
    if (
      compactDisplay != null &&
      !validNumberCompactDisplays.has(compactDisplay)
    ) {
      throw new RangeError(
        `compactDisplay must be one of ${Array.from(
          validNumberCompactDisplays,
        ).join(", ")}, but got ${compactDisplay as string}`,
      );
    }
    if (useGrouping != null && !validUseGroupings.has(useGrouping)) {
      throw new RangeError(
        `useGrouping must be one of ${Array.from(validUseGroupings).join(
          ", ",
        )}, but got ${useGrouping as string}`,
      );
    }
    if (signDisplay != null && !validSignDisplays.has(signDisplay)) {
      throw new RangeError(
        `signDisplay must be one of ${Array.from(validSignDisplays).join(
          ", ",
        )}, but got ${signDisplay as string}`,
      );
    }
    options = {
      style,
      minimumIntegerDigits,
      minimumFractionDigits,
      maximumFractionDigits,
      minimumSignificantDigits,
      maximumSignificantDigits,
      roundingPriority,
      roundingIncrement,
      roundingMode,
      trailingZeroDisplay,
      notation,
      compactDisplay,
      useGrouping,
      signDisplay,
    };
  } else if (argStyle === "number" || argStyle == null) {
    options = {};
  } else if (argStyle === "integer") {
    options = { maximumFractionDigits: 0 };
  } else if (argStyle === "percent") {
    options = { style: "percent" };
  } else {
    throw new TypeError(`Unknown number argStyle: ${argStyle as string}`);
  }
  return wrap(NumberArg(name, options, { subtract }));
}
