import type { Rule } from "eslint";
import { getStaticKey } from "../util";
import { Tracker } from "../tracker";

export const meta: Rule.RuleMetaData = {
  type: "suggestion",
  fixable: "code",
  docs: {
    description: "removes the unused translations and generates the skeletons for the undeclared translation ids",
    recommended: true,
  },
  messages: {
    "unused-translation-id": "unused translation id",
  },
};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember("import(\"@hi18n/core\")", "LocalCatalog");
  tracker.watchConstruct("import(\"@hi18n/core\").LocalCatalog", [
    {
      captureAs: "catalogData",
      path: ["0"],
    },
  ]);
  tracker.listen("new import(\"@hi18n/core\").LocalCatalog()", (_node, captured) => {
    const usedIds: unknown = context.settings["usedIds"];
    if (!Array.isArray(usedIds)) return;
    if (!usedIds.every((k): k is string => typeof k === "string")) return;
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
};

function commentOut(text: string, indent: number): string {
  return text.split(/^/m).map((line, i) => {
    if (i === 0) {
      return `// ${line}`;
    } else {
      const spaces = /^\s*/.exec(line)![0]!.length;
      const cutAt = Math.min(spaces, indent);
      return `${line.substring(0, cutAt)}// ${line.substring(cutAt)}`;
    }
  }).join("");
}