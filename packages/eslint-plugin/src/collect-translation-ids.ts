import type { Rule, Scope } from "eslint";
import { ImportDeclaration } from "estree";
import { Tracker } from "./tracker";

export type TranslationUsage = {
  id: string;
  catalogSource: string;
  filename: string;
};
export type CollectTranslationIdsCallback = (record: TranslationUsage) => void;

export function createCollectTranslationIds(cb: CollectTranslationIdsCallback): Rule.RuleModule {
  const meta: Rule.RuleMetaData = {
    type: "problem",
    docs: {
      description: "a dummy rule to collect used translation ids",
      recommended: true,
    },
  };

  function create(context: Rule.RuleContext): Rule.RuleListener {
    const tracker = new Tracker();
    tracker.watchImport("@hi18n/core");
    tracker.watchImport("@hi18n/react");
    tracker.watchMember("import(\"@hi18n/core\")", "getI18n");
    tracker.watchCall("import(\"@hi18n/core\").getI18n", [
      {
        captureAs: "catalog",
        path: ["0"],
      },
    ], "i18n");
    tracker.watchMember("import(\"@hi18n/react\")", "useI18n");
    tracker.watchCall("import(\"@hi18n/react\").useI18n", [
      {
        captureAs: "catalog",
        path: ["0"],
      },
    ], "i18n");
    tracker.watchMember("i18n", "t");
    tracker.watchCall("i18n.t", [
      {
        captureAs: "id",
        path: ["0"],
      },
    ]);
    tracker.watchMember("import(\"@hi18n/react\")", "Translate");
    tracker.watchJSXElement("import(\"@hi18n/react\").Translate", [
      {
        captureAs: "catalog",
        path: ["catalog"],
      },
      {
        captureAs: "id",
        path: ["id"],
      },
    ], "i18n.t()");
    tracker.listen("i18n.t()", (_node, captured) => {
      const idNode = captured["id"]!;
      if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
        return;
      }
      const id: string = idNode.value;

      const catalogNode = captured["catalog"]!;
      if (catalogNode.type !== "Identifier") {
        return;
      }
      const scope = nearestScope(context.getSourceCode().scopeManager, catalogNode as Rule.Node);
      const catalogVar = findVariable(scope, catalogNode.name);
      if (!catalogVar) return;
      const catalogDef = catalogVar.defs.find((def) => def.parent && def.parent.type === "ImportDeclaration");
      if (!catalogDef) return;
      const catalogSource: string = `${(catalogDef.parent as ImportDeclaration).source.value}`;
      cb({
        id,
        catalogSource,
        filename: context.getFilename(),
      });
    });
    return {
      ImportDeclaration(node) {
        tracker.trackImport(context, node);
      },
    };
  };

  return { meta, create };
}

function findVariable(scope: Scope.Scope, name: string): Scope.Variable | undefined {
  let currentScope: Scope.Scope | null = scope;
  while (currentScope) {
    const v = currentScope.variables.find((v) => v.name === name);
    if (v) return v;
    currentScope = currentScope.upper;
  }
  return undefined;
}

function nearestScope(scopeManager: Scope.ScopeManager, node: Rule.Node): Scope.Scope {
  let currentNode = node;
  while (currentNode) {
    const innerScope = scopeManager.acquire(currentNode, true);
    if (innerScope) return innerScope;
    const outerScope = scopeManager.acquire(currentNode, false);
    if (outerScope) return outerScope;
    currentNode = currentNode.parent;
  }
  throw new Error("No scope found");
}
