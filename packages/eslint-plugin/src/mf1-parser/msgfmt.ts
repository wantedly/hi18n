/**
 * An AST node representing the structure of an ICU MessageFormat 1.0 message.
 */
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

/**
 * A text part, whether escaped or verbatim.
 */
export type MF1TextNode = {
  type: "Text";
  /**
   * The text content (unescaped).
   */
  value: string;
  /**
   * The range of the text in the message source, or undefined if not tracked.
   */
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

/**
 * A concatenation of multiple sub-messages.
 *
 * The consecutive texts are usually represented in a single Text node,
 * and a concatenation of one subnode is usually simplified to the subnode itself.
 */
export type MF1ConcatNode = {
  type: "Concat";
  /**
   * The sub-nodes.
   */
  subnodes: readonly MF1Node[];
  /**
   * The range of the concatenated message in the message source,
   * or undefined if not tracked.
   */
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

/**
 * An interpolation of a string-typed argument (`{foo}`).
 */
export type MF1StringArgNode = {
  type: "Var";
  /**
   * The argument name. String for identifiers, number for numbered arguments (`{0}`).
   */
  name: string | number;
  /**
   * The argument type.
   */
  argType: "string";
  /**
   * The range of the argument interpolation in the message source,
   * or undefined if not tracked.
   */
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

/**
 * An interpolation of a number-typed argument (`{foo, number}`).
 */
export type MF1NumberArgNode = {
  type: "Var";
  /**
   * The argument name. String for identifiers, number for numbered arguments (`{0, number}`).
   */
  name: string | number;
  /**
   * The argument type.
   */
  argType: "number";
  /**
   * The result of interpreting the style options.
   */
  argStyle: Intl.NumberFormatOptions;
  /**
   * The number to subtract from the argument value before formatting (for offset in plural).
   */
  subtract: number;
  /**
   * The range of the argument interpolation in the message source,
   * or undefined if not tracked.
   */
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

/**
 * An interpolation of a datetime-typed argument (`{foo, date}` or `{foo, time}`).
 */
export type MF1DateTimeArgNode = {
  type: "Var";
  /**
   * The argument name. String for identifiers, number for numbered arguments (`{0, date}`).
   */
  name: string | number;
  /**
   * The argument type.
   */
  argType: "datetime";
  /**
   * The result of interpreting the style options.
   */
  argStyle: Intl.DateTimeFormatOptions;
  /**
   * The range of the argument interpolation in the message source,
   * or undefined if not tracked.
   */
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

/**
 * A placeholder that is sometimes generated on recovery from a parsing error.
 */
export type MF1InvalidArgNode = {
  type: "InvalidArg";
  /**
   * The argument name, if it could be parsed.
   */
  name: string | number | undefined;
  /**
   * The range of the argument interpolation in the message source,
   * or undefined if not tracked.
   */
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

/**
 * A plural form selection (`{foo, plural, ...}`).
 */
export type MF1PluralArgNode = {
  type: "Plural";
  /**
   * The argument name. String for identifiers, number for numbered arguments (`{0, plural, ...}`).
   */
  name: string | number;
  /**
   * The number to subtract from the argument value before selecting a branch (offset).
   *
   * The offset is not applied when evaluating the `=` selectors in the branches.
   */
  subtract: number;
  /**
   * The branches (cases) of the plural selection, other than the fallback `other` branch.
   */
  branches: MF1PluralBranch[];
  /**
   * The `other` branch, which must be present.
   */
  fallback: MF1Node;
  /**
   * The range of the plural selection in the message source,
   * or undefined if not tracked.
   */
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

/**
 * A placeholder that is sometimes generated on recovery from a parsing error.
 */
export type MF1InvalidPluralArgNode = {
  type: "InvalidPlural";
  /**
   * The argument name, if it could be parsed.
   */
  name: string | number | undefined;
  /**
   * The range of the plural selection in the message source,
   * or undefined if not tracked.
   */
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

/**
 * A branch (case) of a plural selection.
 */
export type MF1PluralBranch = {
  /**
   * The selector of the branch. Either a number for `=` selectors, or a string
   * for category selectors such as `one`, `few`, `other`.
   */
  selector: number | string;
  /**
   * The message for the branch.
   */
  message: MF1Node;
  /**
   * The range of the branch in the message source,
   * or undefined if not tracked.
   */
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

/**
 * A part of message that is wrapped by an abstract element tag (`<0>...</0>`).
 */
export type MF1ElementArgNode = {
  type: "Element";
  /**
   * The element name. Either a number for numbered elements (`<0>...</0>`),
   * or a string for named elements (`<foo>...</foo>`).
   */
  name: string | number;
  /**
   * The sub-message wrapped by the element, or undefined if the tag is self-closing (`<0/>`).
   */
  message: MF1Node | undefined;
  /**
   * The range of the element interpolation in the message source,
   * or undefined if not tracked.
   */
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

/**
 * A placeholder that is sometimes generated on recovery from a parsing error.
 */
export type MF1InvalidElementArgNode = {
  type: "InvalidElement";
  /**
   * The element name, if it could be parsed.
   */
  name: string | number | undefined;
  /**
   * The range of the element interpolation in the message source,
   * or undefined if not tracked.
   */
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
