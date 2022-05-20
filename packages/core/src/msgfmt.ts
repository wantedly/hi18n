export type CompiledMessage =
  /* plain message. Quotations such as "It''s awsesome" are already unescaped. */
  | string
  /* concatenation */
  | CompiledMessage[]
  /* interpolation for noneArg or simpleArg ("{foo}") */
  | VarArg
  /* plural form selection */
  | PluralArg
  /* # */
  | NumberSign
  /* component interpolation (<0>foo</0>) */
  | ElementArg;

export type VarArg =
  | StringArg
  | NumberArg
  | DateArg
  | TimeArg
  | SpelloutArg
  | OrdinalArg
  | DurationArg;

export type StringArg = {
  type: "Var";
  name: string | number;
  argType?: undefined;
};

export type NumberArg = {
  type: "Var";
  name: string | number;
  argType: "number";
  // TODO: skeleton
  argStyle?: "integer" | "currency" | "percent" | undefined;
};

export type DateArg = {
  type: "Var";
  name: string | number;
  argType: "date";
  argStyle?: "short" | "medium" | "long" | "full" | Intl.DateTimeFormatOptions;
};

export type TimeArg = {
  type: "Var";
  name: string | number;
  argType: "time";
  argStyle?: "short" | "medium" | "long" | "full";
};

export type SpelloutArg = {
  type: "Var";
  name: string | number;
  argType: "spellout";
};

export type OrdinalArg = {
  type: "Var";
  name: string | number;
  argType: "ordinal";
};

export type DurationArg = {
  type: "Var";
  name: string | number;
  argType: "duration";
};

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

export type ArgType = NonNullable<VarArg["argType"]>;

export type ElementArg = {
  type: "Element";
  name: string | number;
  message?: CompiledMessage | undefined;
};
