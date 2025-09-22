import type { TSESTree } from "@typescript-eslint/utils";

export type Diagnostic = {
  type: DiagnosticType;
  loc: TSESTree.SourceLocation;
};

export type DiagnosticType =
  | "OctalEscapeInTemplateString"
  | "NonOctalEscapeInTemplateString"
  | "IncompleteHexEscapeInTemplateString"
  | "IncompleteUnicodeEscapeInTemplateString"
  | "CodePointOutOfRangeInTemplateString"
  | "UnterminatedArgumentInMF1"
  | "InvalidArgumentInMF1"
  | "InvalidNumberInMF1"
  | "UnknownJSStringInMF1";
