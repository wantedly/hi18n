export type MF1Node =
  /* plain message. Quotations such as "It''s awsesome" are already unescaped. */
  | MF1TextNode
  /* concatenation */
  | MF1ConcatNode
  /* interpolation for noneArg or simpleArg ("{foo}") */
  | MF1VarArgNode
  | MF1InvalidArgNode
  /* plural form selection */
  | MF1PluralArgNode
  | MF1InvalidPluralArgNode
  /* component interpolation (<0>foo</0>) */
  | MF1ElementArgNode
  | MF1InvalidElementArgNode;

export type MF1TextNode = {
  type: "Text";
  value: string;
  range: Range | undefined;
};
export type MF1TextNodeOptions = {
  range?: Range;
};
export function MF1TextNode(
  value: string,
  options: MF1TextNodeOptions = {},
): MF1TextNode {
  const { range } = options;
  return { type: "Text", value, range };
}

export type MF1ConcatNode = {
  type: "Concat";
  subnodes: readonly MF1Node[];
  range: Range | undefined;
};
export type MF1ConcatNodeOptions = {
  range?: Range;
};
export function MF1ConcatNode(
  subnodes: readonly MF1Node[],
  options: MF1ConcatNodeOptions = {},
): MF1ConcatNode {
  const { range } = options;
  return { type: "Concat", subnodes, range };
}

export type MF1VarArgNode =
  | MF1StringArgNode
  | MF1NumberArgNode
  | MF1DateTimeArgNode;

export type MF1StringArgNode = {
  type: "Var";
  name: string | number;
  argType: "string";
  range: Range | undefined;
};
export type MF1StringArgNodeOptions = {
  range?: Range;
};
export function MF1StringArgNode(
  name: string | number,
  options: MF1StringArgNodeOptions = {},
): MF1StringArgNode {
  const { range } = options;
  return { type: "Var", name, argType: "string", range };
}

export type MF1NumberArgNode = {
  type: "Var";
  name: string | number;
  argType: "number";
  argStyle: Intl.NumberFormatOptions;
  subtract: number;
  range: Range | undefined;
};
export type MF1NumberArgNodeInternalOptions = {
  subtract?: number;
  range?: Range;
};
export function MF1NumberArgNode(
  name: string | number,
  argStyle: Intl.NumberFormatOptions,
  options: MF1NumberArgNodeInternalOptions = {},
): MF1NumberArgNode {
  const { subtract = 0, range } = options;
  return { type: "Var", name, argType: "number", argStyle, subtract, range };
}

export type MF1DateTimeArgNode = {
  type: "Var";
  name: string | number;
  argType: "datetime";
  argStyle: Intl.DateTimeFormatOptions;
  range: Range | undefined;
};
export type MF1DateTimeArgNodeOptions = {
  range?: Range;
};
export function MF1DateTimeArgNode(
  name: string | number,
  argStyle: Intl.DateTimeFormatOptions,
  options: MF1DateTimeArgNodeOptions = {},
): MF1DateTimeArgNode {
  const { range } = options;
  return { type: "Var", name, argType: "datetime", argStyle, range };
}

export type MF1InvalidArgNode = {
  type: "InvalidArg";
  name: string | number | undefined;
  range: Range | undefined;
};
export type MF1InvalidArgNodeOptions = {
  range?: Range;
};
export function MF1InvalidArgNode(
  name: string | number | undefined,
  options: MF1InvalidArgNodeOptions = {},
): MF1InvalidArgNode {
  const { range } = options;
  return { type: "InvalidArg", name, range };
}

export type MF1PluralArgNode = {
  type: "Plural";
  name: string | number;
  subtract: number;
  branches: MF1PluralBranch[];
  fallback: MF1Node;
  range: Range | undefined;
};
export type PluralArgNodeInternalOptions = {
  subtract?: number;
  range?: Range;
};
export function MF1PluralArgNode(
  name: string | number,
  branches: MF1PluralBranch[],
  fallback: MF1Node,
  options: PluralArgNodeInternalOptions = {},
): MF1PluralArgNode {
  const { subtract = 0, range } = options;
  return { type: "Plural", name, subtract, branches, fallback, range };
}

export type MF1InvalidPluralArgNode = {
  type: "InvalidPlural";
  name: string | number | undefined;
  range: Range | undefined;
};
export type MF1InvalidPluralArgNodeOptions = {
  range?: Range;
};
export function MF1InvalidPluralArgNode(
  name: string | number | undefined,
  options: MF1InvalidPluralArgNodeOptions = {},
): MF1InvalidPluralArgNode {
  const { range } = options;
  return { type: "InvalidPlural", name, range };
}

export type MF1PluralBranch = {
  selector: number | string;
  message: MF1Node;
  range: Range | undefined;
};
export type MF1PluralBranchOptions = {
  range?: Range;
};
export function MF1PluralBranch(
  selector: number | string,
  message: MF1Node,
  options: MF1PluralBranchOptions = {},
): MF1PluralBranch {
  const { range } = options;
  return { selector, message, range };
}

export type MF1ElementArgNode = {
  type: "Element";
  name: string | number;
  message: MF1Node | undefined;
  range: Range | undefined;
};
export type MF1ElementArgNodeOptions = {
  range?: Range;
};
export function MF1ElementArgNode(
  name: string | number,
  message?: MF1Node,
  options: MF1ElementArgNodeOptions = {},
): MF1ElementArgNode {
  const { range } = options;
  return { type: "Element", name, message, range };
}

export type MF1InvalidElementArgNode = {
  type: "InvalidElement";
  name: string | number | undefined;
  range: Range | undefined;
};
export type MF1InvalidElementArgNodeOptions = {
  range?: Range;
};
export function MF1InvalidElementArgNode(
  name: string | number | undefined,
  options: MF1InvalidElementArgNodeOptions = {},
): MF1InvalidElementArgNode {
  const { range } = options;
  return { type: "InvalidElement", name, range };
}

export type Range = [start: number, end: number];
