import { TSESTree, type TSESLint } from "@typescript-eslint/utils";
import { catalogTracker, getCatalogData } from "../common-trackers.ts";
import { createRule, type PluginDocs } from "./create-rule.ts";
import { parseJSAsMessage } from "../msg-parser/jsdsl-parser.ts";
import { extJSStringLoc, type MessageNode } from "../msg-parser/ast.ts";
import { formatMessageAsJSOrUndefined } from "../msg-parser/formatter.ts";

export type MessageIds = "prefer-js-style" | "prefer-mf1-style";
export type Options = {
  simpleMessageStyle?: "no-preference" | "js" | "mf1" | undefined;
};
export type OptionList = [Options?];

export const rule: TSESLint.RuleModule<
  MessageIds,
  OptionList,
  PluginDocs,
  TSESLint.RuleListener
> = createRule<OptionList, MessageIds>({
  name: "prefer-message-style",
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description:
        "disallow dynamic keys where hi18n cannot correctly detect used keys",
      recommended: true,
    },
    messages: {
      "prefer-js-style": "Use JS DSL-style message for simple messages.",
      "prefer-mf1-style":
        "Use MessageFormat 1.0-style message for simple messages.",
    },
    schema: [
      {
        type: "object",
        properties: {
          simpleMessageStyle: {
            type: "string",
            enum: ["js", "mf1", "no-preference"],
            description: "Which style to prefer for simple messages.",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        simpleMessageStyle: "js",
      },
    ],
  },

  defaultOptions: [
    {
      simpleMessageStyle: "js",
    },
  ],

  create(context): TSESLint.RuleListener {
    const { simpleMessageStyle = "js" } = context.options[0] ?? {};
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
        // This cast is not fully safe, but parseJSAsMessage will handle unknown node types.
        const msg = parseJSAsMessage(prop.value as TSESTree.Expression, []);
        if (msg.type === "Plaintext") {
          if (simpleMessageStyle === "js" && msg.style !== "js") {
            const newMsg: MessageNode = { ...msg, style: "js" };
            const newMsgCode = formatMessageAsJSOrUndefined(newMsg);
            if (newMsgCode != null) {
              context.report({
                messageId: "prefer-js-style",
                node: prop.value,
                loc: extJSStringLoc(msg.parts) ?? prop.value.loc,
                fix(fixer) {
                  return fixer.replaceText(prop.value, newMsgCode);
                },
              });
            } else {
              context.report({
                messageId: "prefer-js-style",
                node: prop.value,
                loc: extJSStringLoc(msg.parts) ?? prop.value.loc,
              });
            }
          } else if (simpleMessageStyle === "mf1" && msg.style !== "mf1") {
            const newMsg: MessageNode = { ...msg, style: "mf1" };
            const newMsgCode = formatMessageAsJSOrUndefined(newMsg, {
              hasBuilderUtils: true,
            });
            if (newMsgCode != null) {
              context.report({
                messageId: "prefer-mf1-style",
                node: prop.value,
                loc: extJSStringLoc(msg.parts) ?? prop.value.loc,
                fix(fixer) {
                  return fixer.replaceText(prop.value, newMsgCode);
                },
              });
            } else {
              context.report({
                messageId: "prefer-mf1-style",
                node: prop.value,
                loc: extJSStringLoc(msg.parts) ?? prop.value.loc,
              });
            }
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
