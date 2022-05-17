export type CompiledMessage =
  /* plain message. Quotations such as "It''s awsesome" are already unescaped. */
  | string
  /* concatenation */
  | CompiledMessage[]
  /* interpolation for noneArg ("{foo}") */
  | { type: "Var"; name: string | number; argType?: ArgType | undefined }
  /* plural form selection */
  | PluralArg
  /* # */
  | NumberSign
  /* component interpolation (<0>foo</0>) */
  | ElementArg;

export type PluralArg = {
  type: "Plural";
  name: string | number;
  offset?: number | undefined;
  branches: PluralBranch[];
};

export type PluralBranch = {
  selector: number | string;
  message: CompiledMessage;
};

export type NumberSign = {
  type: "Number";
};

export type ArgType =
  | "number"
  | "date"
  | "time"
  | "spellout"
  | "ordinal"
  | "duration";

export type ElementArg = {
  type: "Element";
  name: string | number;
  message?: CompiledMessage | undefined;
};
