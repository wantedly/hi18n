import type { Rule, Scope } from "eslint";
import { getStaticKey, resolveTypeLevelVariable } from "../util";
import { bookTracker } from "../common-trackers";
import { Node } from "estree";
import {
  NewExpressionExt,
  TSInterfaceBody,
  TSPropertySignature,
  TSSignature,
  TSTypeLiteral,
} from "../estree-ts";
import { extractAsObjectType, findTypeParameter } from "./no-nonstandard-books";
import { commentOut } from "./no-unused-translation-ids";

export const meta: Rule.RuleMetaData = {
  type: "problem",
  fixable: "code",
  docs: {
    description:
      "removes the unused translations and generates the skeletons for the undeclared translation ids",
    recommended: false,
  },
  messages: {
    "unused-translation-id": "unused translation id",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = bookTracker();
  tracker.listen("book", (node, _captured) => {
    const usedIds: unknown = context.settings["@hi18n/used-translation-ids"];
    if (usedIds === undefined)
      throw new Error(
        'settings["@hi18n/used-translation-ids"] not found\nNote: this rule is for an internal use.'
      );
    if (
      !Array.isArray(usedIds) ||
      !usedIds.every((k): k is string => typeof k === "string")
    )
      throw new Error("Invalid usedIds");
    const usedIdsSet = new Set(usedIds);

    const objinfo = findTypeDefinition(
      context.getSourceCode().scopeManager,
      node as Rule.Node
    );
    if (!objinfo) return;

    for (const signature of objinfo.signatures) {
      if (signature.type !== "TSPropertySignature") continue;
      const key = getStaticKey(signature);
      if (key === null) continue;
      if (!usedIdsSet.has(key)) {
        context.report({
          node: signature as Node | TSPropertySignature as Node,
          // node: node as Node,
          messageId: "unused-translation-id",
          *fix(fixer) {
            const indent = signature.loc!.start.column;
            const text = context
              .getSourceCode()
              .getText(signature as Node | TSPropertySignature as Node);
            yield fixer.replaceText(
              signature as Node | TSPropertySignature as Node,
              commentOut(text, indent)
            );
          },
        });
      }
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager, node);
    },
  };
}

export function findTypeDefinition(
  scopeManager: Scope.ScopeManager,
  node: Rule.Node
): { body: TSInterfaceBody | TSTypeLiteral; signatures: TSSignature[] } | null {
  const typeParameters = (node as NewExpressionExt).typeParameters;
  if (!typeParameters) return null;

  const typeParam = findTypeParameter(node);
  if (!typeParam) return null;
  const resolved = resolveTypeLevelVariable(scopeManager, typeParam.typeName);
  if (!resolved) return null;
  const objinfo = extractAsObjectType(resolved);
  if (!objinfo) return null;
  return objinfo;
}
