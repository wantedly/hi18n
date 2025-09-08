import path from "node:path";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { linguiTracker } from "../common-trackers.js";
import { capturedRoot } from "../tracker.js";
import { getStaticKey, nameOf } from "../util.js";
import { createRule, type PluginDocs } from "./create-rule.ts";

type MessageIds = "migrate-trans-jsx" | "migrate-underscore";
type OptionList = [Options];

type Options = {
  bookPath: string;
};

export const rule: TSESLint.RuleModule<
  MessageIds,
  OptionList,
  PluginDocs,
  TSESLint.RuleListener
> = createRule<OptionList, MessageIds>({
  name: "migrate-from-lingui",
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description: "helps migrating from LinguiJS",
      recommended: false,
    },
    messages: {
      "migrate-trans-jsx": "Migrate <Trans> to hi18n",
      "migrate-underscore": "Migrate i18n._ to hi18n",
    },
    schema: [
      {
        type: "object",
        required: ["bookPath"],
        properties: {
          bookPath: {
            type: "string",
            description:
              "The path to the book where the migrated translation should go",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        bookPath: "<book path>",
      },
    ],
  },

  defaultOptions: [
    {
      bookPath: "<book path>",
    },
  ],

  create(context): TSESLint.RuleListener {
    let bookPath = path.relative(
      path.dirname(context.getFilename()),
      context.options[0].bookPath,
    );
    if (!/^\.\.?(?:\/|$)/.test(bookPath)) bookPath = `./${bookPath}`;
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

      let renderInElement: string | undefined = undefined;
      const renderNode = captured["render"]!;
      if (renderNode.type === "JSXElement") {
        // Lingui v2 component-like use of render
        renderInElement = context.getSourceCode().getText(renderNode);
      } else if (renderNode.type !== "CaptureFailure") {
        // render is not supported yet
        return justReport();
      }
      const componentNode = captured["component"]!;
      if (
        (componentNode.type === "Identifier" ||
          componentNode.type === "MemberExpression") &&
        eligibleForJSXTagNameExpression(componentNode)
      ) {
        renderInElement = `<${context
          .getSourceCode()
          .getText(componentNode)} />`;
      } else if (componentNode.type !== "CaptureFailure") {
        // render/renderInComponent is not supported yet
        return justReport();
      }

      const params = new Map<string, string>();
      for (const valuesNode of [captured["values"]!, captured["components"]!]) {
        if (valuesNode.type === "ObjectExpression") {
          for (const prop of valuesNode.properties) {
            if (prop.type !== "Property") return justReport();
            const key = getStaticKey(prop);
            if (key === null) return justReport();
            if (params.has(key)) return justReport();
            params.set(key, context.getSourceCode().getText(prop.value));
          }
        } else if (valuesNode.type === "ArrayExpression") {
          let i = 0;
          for (const elem of valuesNode.elements) {
            if (elem == null) return justReport();
            if (elem.type === "SpreadElement") return justReport();
            const key = `${i}`;
            if (params.has(key)) return justReport();
            params.set(key, context.getSourceCode().getText(elem));
            i++;
          }
        } else if (valuesNode.type !== "CaptureFailure") {
          return justReport();
        }
      }

      context.report({
        node: capturedRoot(propsNode),
        messageId: "migrate-trans-jsx",
        *fix(fixer) {
          const [translateImportFixes, translateComponentName] =
            getOrInsertImport(
              context.getSourceCode(),
              context.getSourceCode().scopeManager!,
              fixer,
              "@hi18n/react",
              "Translate",
              ["@lingui/react", "@lingui/macro"],
            );
          yield* translateImportFixes;

          const [bookImportFixes, bookName] = getOrInsertImport(
            context.getSourceCode(),
            context.getSourceCode().scopeManager!,
            fixer,
            bookPath,
            "book",
            [],
            true,
          );
          yield* bookImportFixes;

          const attrs: string[] = [];
          attrs.push(`book={${bookName}}`);
          attrs.push(`id=${jsxAttributeString(id)}`);
          if (renderInElement !== undefined) {
            attrs.push(`renderInElement={${renderInElement}}`);
          }
          for (const [paramKey, paramValue] of params) {
            if (
              /^[\p{ID_Start}$_][-\p{ID_Continue}$\u200C\u200D]*$/u.test(
                paramKey,
              )
            ) {
              attrs.push(`${paramKey}={${paramValue}}`);
            } else if (/^(?:0|[1-9][0-9]*)$/.test(paramKey)) {
              attrs.push(`{...{ ${paramKey}: ${paramValue} }}`);
            } else {
              attrs.push(`{...{ ${JSON.stringify(paramKey)}: ${paramValue} }}`);
            }
          }

          if (node.type === "JSXElement" && node.closingElement) {
            yield fixer.replaceText(
              node.openingElement,
              `<${translateComponentName}${attrs.map((s) => ` ${s}`).join("")}>`,
            );
            yield fixer.replaceText(
              node.closingElement,
              `</${translateComponentName}>`,
            );
          } else {
            yield fixer.replaceText(
              node,
              `<${translateComponentName}${attrs
                .map((s) => ` ${s}`)
                .join("")} />`,
            );
          }
        },
      });
    });
    return {
      ImportDeclaration(node) {
        tracker.trackImport(context.getSourceCode().scopeManager!, node);
      },
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "i18n" &&
          !node.callee.computed &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "_"
        ) {
          // i18n._(...)
          const justReport = () => {
            context.report({
              node,
              messageId: "migrate-underscore",
            });
          };
          if (
            !node.arguments.every(
              (arg): arg is TSESTree.Expression => arg.type !== "SpreadElement",
            )
          ) {
            return justReport();
          }
          if (node.arguments.length <= 0 || node.arguments.length >= 3) {
            return justReport();
          }

          const messageIdNode = node.arguments[0]!;
          let messageIdSource_: string | undefined = undefined;
          if (
            messageIdNode.type === "Literal" &&
            typeof messageIdNode.value === "string"
          ) {
            // i18n._("foo")
            messageIdSource_ = context.getSourceCode().getText(messageIdNode);
          } else if (
            messageIdNode.type === "CallExpression" &&
            messageIdNode.callee.type === "Identifier" &&
            messageIdNode.callee.name === "i18nMark" &&
            messageIdNode.arguments.length === 1 &&
            messageIdNode.arguments[0]!.type === "Literal" &&
            typeof (messageIdNode.arguments[0]! as TSESTree.Literal).value ===
              "string"
          ) {
            // i18n._(i18nMark("foo"))
            messageIdSource_ = context
              .getSourceCode()
              .getText(messageIdNode.arguments[0]);
          }
          if (messageIdSource_ === undefined) {
            return justReport();
          }
          const messageIdSource: string = messageIdSource_;

          const valuesNode = node.arguments[1];
          let valuesSource: string | undefined = undefined;
          if (valuesNode) {
            if (valuesNode.type !== "ObjectExpression") {
              return justReport();
            }
            valuesSource = context.getSourceCode().getText(valuesNode);
          }

          const hooksScope = findNearestHooksScope(node);
          if (!hooksScope) {
            return justReport();
          }

          context.report({
            node,
            messageId: "migrate-underscore",
            *fix(fixer) {
              const [useI18nImportFixes, useI18nName] = getOrInsertImport(
                context.getSourceCode(),
                context.getSourceCode().scopeManager!,
                fixer,
                "@hi18n/react",
                "useI18n",
                ["@lingui/react", "@lingui/macro"],
              );
              yield* useI18nImportFixes;

              const [bookImportFixes, bookName] = getOrInsertImport(
                context.getSourceCode(),
                context.getSourceCode().scopeManager!,
                fixer,
                bookPath,
                "book",
                [],
                true,
              );
              yield* bookImportFixes;

              const [useI18nCallFixes, tName] = getOrInsertUseI18n(
                context.getSourceCode(),
                fixer,
                hooksScope,
                useI18nName,
                bookName,
              );
              yield* useI18nCallFixes;

              if (valuesSource) {
                yield fixer.replaceText(
                  node,
                  `${tName}(${messageIdSource}, ${valuesSource})`,
                );
              } else {
                yield fixer.replaceText(node, `${tName}(${messageIdSource})`);
              }
            },
          });
        }
      },
    };
  },
});

const MIGRATABLE_PROP_NAMES = [
  "id",
  // // Old name for "message"
  // "defaults",
  // // Default message
  // "message",
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

function getOrInsertImport(
  sourceCode: TSESLint.SourceCode,
  scopeManager: TSESLint.Scope.ScopeManager,
  fixer: TSESLint.RuleFixer,
  source: string,
  importName: string,
  positionHintSources: string[],
  doInsertAfter?: boolean,
): [TSESLint.RuleFix[], string] {
  const program = scopeManager.globalScope!.block;
  const programScope = scopeManager.acquire(program, true)!;
  let positionHintNode: TSESTree.ImportDeclaration | undefined = undefined;
  let importNode: TSESTree.ImportDeclaration | undefined = undefined;
  let lastImport: TSESTree.ImportDeclaration | undefined = undefined;
  for (const stmt of program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    lastImport = stmt;
    if (stmt.source.value === source) {
      if (stmt.importKind === "type") continue;
      let eligibleForNamedImport = true;
      for (const spec of stmt.specifiers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        if ((spec as any).importKind === "type") continue;
        if (
          (spec.type === "ImportDefaultSpecifier" &&
            importName === "default") ||
          (spec.type === "ImportSpecifier" &&
            nameOf(spec.imported) === importName)
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
        (spec) => spec.type === "ImportDefaultSpecifier",
      )
    ) {
      const defaultSpec = importNode.specifiers.find(
        (spec) => spec.type === "ImportDefaultSpecifier",
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
  if (doInsertAfter && lastImport) {
    const indent = " ".repeat(lastImport.loc.start.column);
    return [
      [
        fixer.insertTextAfter(
          lastImport,
          `\n${indent}import { ${specText} } from ${JSON.stringify(source)};`,
        ),
      ],
      newName,
    ];
  }
  const insertBefore = positionHintNode ?? program;
  const indent = " ".repeat(insertBefore.loc.start.column);
  return [
    [
      fixer.insertTextBefore(
        insertBefore,
        `import { ${specText} } from ${JSON.stringify(source)};\n${indent}`,
      ),
    ],
    newName,
  ];
}

function isHooksScopeName(name: string): boolean {
  return /^[A-Z]|^use[A-Z]/.test(name);
}

function findNearestHooksScope(
  startNode: TSESTree.Node,
): TSESTree.BlockStatement | undefined {
  let node: TSESTree.Node = startNode;
  while (true) {
    if (
      node.type === "BlockStatement" &&
      (node.parent?.type === "ArrowFunctionExpression" ||
        node.parent?.type === "FunctionExpression") &&
      !node.parent.async &&
      !node.parent.generator &&
      node.parent.parent?.type === "VariableDeclarator" &&
      node.parent.parent.id.type === "Identifier" &&
      isHooksScopeName(node.parent.parent.id.name)
    ) {
      // const MyComponent = () => { ... };
      return node;
    }
    if (
      node.type === "BlockStatement" &&
      node.parent?.type === "FunctionDeclaration" &&
      !node.parent.async &&
      !node.parent.generator &&
      node.parent.id?.type === "Identifier" &&
      isHooksScopeName(node.parent.id.name)
    ) {
      // function MyComponent() { ... };
      return node;
    }
    if (!node.parent) break;
    node = node.parent;
  }
  return undefined;
}

function getOrInsertUseI18n(
  sourceCode: TSESLint.SourceCode,
  // scopeManager: TSESLint.Scope.ScopeManager,
  fixer: TSESLint.RuleFixer,
  block: TSESTree.BlockStatement,
  useI18nName: string,
  bookName: string,
  // source: string,
  // importName: string,
  // positionHintSources: string[],
  // doInsertAfter?: boolean
): [TSESLint.RuleFix[], string] {
  for (const stmt of block.body) {
    if (stmt.type !== "VariableDeclaration") continue;
    for (const decl of stmt.declarations) {
      if (!decl.init) continue;
      if (
        decl.init.type === "CallExpression" &&
        decl.init.callee.type === "Identifier" &&
        decl.init.callee.name === useI18nName &&
        decl.init.arguments.length === 1
      ) {
        const arg = decl.init.arguments[0]!;
        if (arg.type === "Identifier" && arg.name === bookName) {
          if (decl.id.type === "ObjectPattern") {
            for (const pat of decl.id.properties) {
              if (
                pat.type === "Property" &&
                !pat.computed &&
                pat.key.type === "Identifier" &&
                pat.key.name === "t" &&
                pat.value.type === "Identifier"
              ) {
                // const { t } = useI18n(book);
                return [[], pat.value.name];
              }
            }
          }
        }
      }
    }
  }
  const openBraceToken = sourceCode.getFirstToken(block)!;
  let indent = "";
  if (block.body.length > 0) {
    indent = " ".repeat(block.body[0]!.loc.start.column);
  }
  return [
    [
      fixer.insertTextAfter(
        openBraceToken,
        `\n${indent}const { t } = ${useI18nName}(${bookName});`,
      ),
    ],
    "t",
  ];
}

function eligibleForJSXTagNameExpression(
  node: TSESTree.Expression,
  whole = true,
): boolean {
  switch (node.type) {
    case "Identifier":
      if (whole && /^[a-z]/.test(node.name)) return false;
      return true;
    case "MemberExpression":
      return (
        !node.computed &&
        eligibleForJSXTagNameExpression(node.object, false) &&
        node.property.type === "Identifier"
      );
    default:
      return false;
  }
}

function jsxAttributeString(text: string): string {
  // JSX allows literal newlines but here we fallback to the expression container to keep better layout.
  if (!/[\r\n\u2028\u2029"]/.test(text)) {
    return `"${text}"`;
  } else if (!/[\r\n\u2028\u2029']/.test(text)) {
    return `'${text}'`;
  } else {
    return `{${JSON.stringify(text)}}`;
  }
}
