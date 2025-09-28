import type { Range } from "./msgfmt.ts";

export type Diagnostic =
  | UnexpectedTokenDiagnostic
  | UnexpectedArgStyleDiagnostic
  | UnexpectedArgTypeDiagnostic
  | InvalidDateSkeletonDiagnostic
  | OtherDiagnostic;

export type UnexpectedTokenDiagnostic = {
  type: "UnexpectedToken";
  tokenDesc: string;
  expected: readonly string[];
  range: Range;
};

export type UnexpectedArgTypeDiagnostic = {
  type: "UnexpectedArgType";
  argType: string;
  expected: readonly string[];
  range: Range;
};

export type UnexpectedArgStyleDiagnostic = {
  type: "UnexpectedArgStyle";
  argType: string;
  argStyle: string;
  expected: readonly string[];
  range: Range;
};

export type InvalidDateSkeletonDiagnostic = {
  type: "InvalidDateSkeleton";
  component: string;
  range: Range;
};

export type OtherDiagnostic = {
  type: DiagnosticType;
  range: Range;
};

export type DiagnosticType =
  | "UnclosedQuotedString"
  | "InvalidSpaces"
  | "InvalidCharacter"
  | "InvalidIdentifier"
  | "InvalidNumber"
  | "InsufficientFieldsInDateSkeleton";

export function diagnosticDescription(d: Diagnostic): string {
  switch (d.type) {
    case "UnclosedQuotedString":
      return "Unclosed quoted string";
    case "UnexpectedToken":
      return `Unexpected token ${d.tokenDesc} (expected ${d.expected.join(", ")})`;
    case "UnexpectedArgType":
      if (d.argType === "choice") {
        return `${d.argType} is not supported (expected ${d.expected.join(", ")})`;
      } else if (d.argType === "select" || d.argType === "selectordinal") {
        return `${d.argType} is not implemented yet (expected ${d.expected.join(", ")})`;
      }
      return `Unexpected argument type ${d.argType} (expected ${d.expected.join(", ")})`;
    case "UnexpectedArgStyle":
      return `Unexpected argument style ${d.argStyle} for argument type ${d.argType} (expected ${d.expected.join(", ")})`;
    case "InvalidSpaces":
      return "No spaces allowed here";
    case "InvalidCharacter":
      return "Invalid character";
    case "InvalidIdentifier":
      return "Invalid identifier";
    case "InvalidNumber":
      return "Invalid number";
    case "InvalidDateSkeleton":
      return `Invalid date skeleton: ${d.component}`;
    case "InsufficientFieldsInDateSkeleton":
      return "Insufficient fields in the date skeleton";
  }
}
