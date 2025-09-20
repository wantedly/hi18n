import { TSESTree, type TSESLint } from "@typescript-eslint/utils";
import { catalogTracker, getCatalogData } from "../common-trackers.ts";
import { createRule, type PluginDocs } from "./create-rule.ts";
import type { Diagnostic } from "../msg-parser/diagnostic.ts";
import { parseJSAsMessage } from "../msg-parser/jsdsl-parser.ts";

type MessageIds =
  | "no-octal-escape"
  | "no-nonoctal-decimal-escape"
  | "no-incomplete-hex-escape"
  | "no-incomplete-unicode-escape"
  | "no-large-codepoint";
type Options = [];

export const rule: TSESLint.RuleModule<
  MessageIds,
  Options,
  PluginDocs,
  TSESLint.RuleListener
> = createRule<Options, MessageIds>({
  name: "no-invalid-escape",
  meta: {
    type: "problem",
    docs: {
      description:
        "disallow dynamic keys where hi18n cannot correctly detect used keys",
      recommended: true,
    },
    messages: {
      "no-octal-escape": "Octal escape sequences are not allowed.",
      "no-nonoctal-decimal-escape": "This escape sequence is not allowed.",
      "no-incomplete-hex-escape": "Hexadecimal digit expected.",
      "no-incomplete-unicode-escape": "Unterminated Unicode escape sequence.",
      "no-large-codepoint":
        "An extended Unicode escape value must be between 0x0 and 0x10FFFF inclusive.",
    },
    schema: [],
  },

  defaultOptions: [],

  create(context): TSESLint.RuleListener {
    const tracker = catalogTracker();
    tracker.listen('new import("@hi18n/core").Catalog()', (_node, captured) => {
      const catalogDataNode = getCatalogData(captured);
      if (catalogDataNode.type !== "ObjectExpression") {
        return;
      }
      for (const prop of catalogDataNode.properties) {
        if (prop.type !== "Property") {
          continue;
        }
        const diagnostics: Diagnostic[] = [];
        // This cast is not fully safe, but parseJSAsMessage will handle unknown node types.
        parseJSAsMessage(prop.value as TSESTree.Expression, diagnostics);
        for (const diag of diagnostics) {
          switch (diag.type) {
            case "OctalEscapeInTemplateString":
              context.report({
                node: prop.value,
                loc: diag.loc,
                messageId: "no-octal-escape",
              });
              break;
            case "NonOctalEscapeInTemplateString":
              context.report({
                node: prop.value,
                loc: diag.loc,
                messageId: "no-nonoctal-decimal-escape",
              });
              break;
            case "IncompleteHexEscapeInTemplateString":
              context.report({
                node: prop.value,
                loc: diag.loc,
                messageId: "no-incomplete-hex-escape",
              });
              break;
            case "IncompleteUnicodeEscapeInTemplateString":
              context.report({
                node: prop.value,
                loc: diag.loc,
                messageId: "no-incomplete-unicode-escape",
              });
              break;
            case "CodePointOutOfRangeInTemplateString":
              context.report({
                node: prop.value,
                loc: diag.loc,
                messageId: "no-large-codepoint",
              });
              break;
          }
        }
      }
    });
    return {
      ImportDeclaration(node) {
        tracker.trackImport(context.getSourceCode().scopeManager!, node);
      },
    };
  },
});
