import type { Rule } from "eslint";
import { getStaticKey } from "../util";
import { catalogTracker } from "../common-trackers";

export const meta: Rule.RuleMetaData = {
  type: "suggestion",
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
  const tracker = catalogTracker();
  tracker.listen('new import("@hi18n/core").Catalog()', (_node, captured) => {
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

    const catalogData = captured["catalogData"]!;
    if (catalogData.type !== "ObjectExpression") return;

    for (const prop of catalogData.properties) {
      if (prop.type !== "Property") continue;
      const key = getStaticKey(prop);
      if (key === null) continue;
      if (!usedIdsSet.has(key)) {
        context.report({
          node: prop,
          messageId: "unused-translation-id",
          *fix(fixer) {
            const indent = prop.loc!.start.column;
            const text = context.getSourceCode().getText(prop);
            yield fixer.replaceText(prop, commentOut(text, indent));
          },
        });
      }
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context, node);
    },
  };
}

export function commentOut(text: string, indent: number): string {
  return text
    .split(/^/m)
    .map((line, i) => {
      if (i === 0) {
        return `// ${line}`;
      } else {
        const spaces = /^\s*/.exec(line)![0]!.length;
        const cutAt = Math.min(spaces, indent);
        return `${line.substring(0, cutAt)}// ${line.substring(cutAt)}`;
      }
    })
    .join("");
}
