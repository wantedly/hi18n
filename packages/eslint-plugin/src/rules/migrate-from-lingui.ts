import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { linguiTracker } from "../common-trackers";
import { capturedRoot } from "../tracker";

type MessageIds = "migrate-trans-jsx";

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  fixable: "code",
  docs: {
    description:
      "disallow dynamic keys where hi18n cannot correctly detect used keys",
    recommended: "error",
  },
  messages: {
    "migrate-trans-jsx": "Migrate <Trans> to hi18n",
  },
  schema: {},
};

const MIGRATABLE_PROP_NAMES = [
  "id",
  // Old name for "message"
  "defaults",
  // Default message
  "message",
  // // Old name for "comment"
  // "description",
  // // Comment inserted in the message catalog
  // "comment",
  // value interpolation parameters,
  "values",
  // The render props
  "render",
  // Like render but accepts an element
  "component",
  // Component interpolation parameters
  "components",
];

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): TSESLint.RuleListener {
  const tracker = linguiTracker();
  tracker.listen("translationJSX", (node, captured) => {
    const propsNode = captured["props"]!;
    const justReport = () => {
      context.report({
        node: capturedRoot(propsNode),
        messageId: "migrate-trans-jsx",
      });
    };
    if (propsNode.type !== "PropsOf") {
      return justReport();
    }
    for (const attr of propsNode.node.openingElement.attributes) {
      if (attr.type === "JSXSpreadAttribute") {
        return justReport();
      }
      if (
        attr.name.type !== "JSXIdentifier" ||
        !MIGRATABLE_PROP_NAMES.includes(attr.name.name)
      ) {
        return justReport();
      }
    }

    const idNode = captured["id"]!;
    if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
      return justReport();
    }
    const id: string = idNode.value;
    if (id.includes('"')) return justReport();

    let renderInElement: string | undefined = undefined;
    const renderNode = captured["render"]!;
    if (renderNode.type === "JSXElement") {
      // Lingui v2 component-like use of render
      renderInElement = context.getSourceCode().getText(renderNode);
    } else if (renderNode.type !== "CaptureFailure") {
      return justReport();
    }
    const componentNode = captured["component"]!;
    if (componentNode.type === "JSXElement") {
      renderInElement = context.getSourceCode().getText(componentNode);
    } else if (componentNode.type !== "CaptureFailure") {
      return justReport();
    }

    context.report({
      node: capturedRoot(propsNode),
      messageId: "migrate-trans-jsx",
      *fix(fixer) {
        const [importFixes, translateComponentName] = getOrInsertImport(
          context.getSourceCode(),
          context.getSourceCode().scopeManager!,
          fixer,
          "@hi18n/react",
          "Translate",
          ["@lingui/react", "@lingui/macro"]
        );
        yield* importFixes;

        const attrs: string[] = [];
        attrs.push(`id="${id}"`);
        if (renderInElement !== undefined) {
          attrs.push(`renderInElement={${renderInElement}}`);
        }

        yield fixer.replaceText(
          node,
          `<${translateComponentName}${attrs.map((s) => ` ${s}`).join("")} />`
        );
      },
    });
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}

function getOrInsertImport(
  sourceCode: TSESLint.SourceCode,
  scopeManager: TSESLint.Scope.ScopeManager,
  fixer: TSESLint.RuleFixer,
  source: string,
  importName: string,
  positionHintSources: string[]
): [TSESLint.RuleFix[], string] {
  const program = scopeManager.globalScope!.block;
  const programScope = scopeManager.acquire(program, true)!;
  let positionHintNode: TSESTree.ImportDeclaration | undefined = undefined;
  let importNode: TSESTree.ImportDeclaration | undefined = undefined;
  for (const stmt of program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    if (stmt.source.value === source) {
      if (stmt.importKind === "type") continue;
      let eligibleForNamedImport = true;
      for (const spec of stmt.specifiers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        if ((spec as any).importKind === "type") continue;
        if (
          (spec.type === "ImportDefaultSpecifier" &&
            importName === "default") ||
          (spec.type === "ImportSpecifier" && spec.imported.name === importName)
        ) {
          return [[], spec.local.name];
        }
        if (spec.type === "ImportNamespaceSpecifier") {
          eligibleForNamedImport = false;
        }
      }
      if (!importNode && eligibleForNamedImport) importNode = stmt;
    } else if (
      !positionHintNode &&
      positionHintSources.includes(stmt.source.value)
    ) {
      positionHintNode = stmt;
    }
  }
  let newName = importName;
  if (programScope.variables.some((v) => v.name === newName)) {
    const definedNames = new Set(programScope.variables.map((v) => v.name));
    for (let i = 0; ; i++) {
      newName = `${importName}${i}`;
      if (!definedNames.has(newName)) break;
    }
  }
  const specText =
    newName === importName ? importName : `${importName} as ${newName}`;
  if (importNode) {
    if (importNode.specifiers.some((spec) => spec.type === "ImportSpecifier")) {
      // import foo, { bar, baz } from "";
      // => import foo, { bar, baz, NEW } from "";
      // import { bar, baz } from "";
      // => import { bar, baz, NEW } from "";
      const lastSpecifier =
        importNode.specifiers[importNode.specifiers.length - 1]!;
      return [[fixer.insertTextAfter(lastSpecifier, `, ${specText}`)], newName];
    } else if (
      importNode.specifiers.some(
        (spec) => spec.type === "ImportDefaultSpecifier"
      )
    ) {
      const defaultSpec = importNode.specifiers.find(
        (spec) => spec.type === "ImportDefaultSpecifier"
      )!;
      const tokens = sourceCode.getTokensAfter(defaultSpec, 2);
      if (
        tokens.length === 2 &&
        tokens[0]!.type === "Punctuator" &&
        tokens[0]!.value === "," &&
        tokens[1]!.type === "Punctuator" &&
        tokens[1]!.value === "{"
      ) {
        // import foo, {} from "";
        // => import foo, { NEW } from "";
        return [[fixer.insertTextAfter(tokens[1]!, ` ${specText} `)], newName];
      } else if (
        tokens.length >= 1 &&
        tokens[0]!.type === "Identifier" &&
        tokens[0]!.value === "from"
      ) {
        // import foo from "";
        // => import foo, { NEW } from "";
        return [
          [fixer.insertTextAfter(tokens[0]!, `, { ${specText} }`)],
          newName,
        ];
      }
    } else {
      const token = sourceCode.getTokenBefore(importNode.source);
      if (token?.type === "Identifier" && token.value === "import") {
        // import "";
        // => import { NEW } from "";
        return [
          [fixer.insertTextAfter(token, ` { ${specText} } from`)],
          newName,
        ];
      } else if (token?.type === "Identifier" && token.value === "from") {
        // import {} from "";
        // => import { NEW } from "";
        const openBraceToken = sourceCode.getTokenBefore(importNode.source, {
          skip: 2,
        });
        if (
          openBraceToken?.type === "Punctuator" &&
          openBraceToken.value === "{"
        ) {
          return [
            [fixer.insertTextAfter(openBraceToken, ` ${specText} `)],
            newName,
          ];
        }
      }
    }
  }
  const insertBefore = positionHintNode ?? program;
  const indent = " ".repeat(insertBefore.loc.start.column);
  return [
    [
      fixer.insertTextBefore(
        insertBefore,
        `import { ${specText} } from ${JSON.stringify(source)};\n${indent}`
      ),
    ],
    newName,
  ];
}
