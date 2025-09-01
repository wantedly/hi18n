import { ESLintUtils, TSESTree, type TSESLint } from "@typescript-eslint/utils";
import * as ts from "typescript";
import { translationCallTracker } from "../common-trackers";

type MessageIds =
  | "invalid-signature"
  | "missing-component-argument"
  | "extra-component-argument";
type Options = [];

export const meta: TSESLint.RuleMetaData<MessageIds> = {
  type: "problem",
  docs: {
    description: "additional type checking for the <Translate> component",
    recommended: "error",
  },
  messages: {
    "invalid-signature": "Lint failed: invalid signature",
    "missing-component-argument": "missing argument: {{ paramNames }}",
    "extra-component-argument": "unknown component name: {{ argName }}",
  },
  schema: {},
};

export const defaultOptions: Options = [];

export function create(
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): TSESLint.RuleListener {
  const tracker = translationCallTracker();
  // For some reason we visit the node twice. It should ideally be unnecessary.
  const visited: Set<TSESTree.Node> = new Set();
  tracker.listen("translation", (node, captured) => {
    const idNode = captured["id"]!;
    if (idNode.type !== "Literal" || typeof idNode.value !== "string") {
      return;
    }
    if (node.type !== "JSXElement") {
      return;
    }

    if (visited.has(node)) return;
    visited.add(node);

    // Start querying tsc
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    // <Translate> ... </Translate> or <Translate />
    const tscElementNode = parserServices.esTreeNodeToTSNodeMap.get(node);
    // <Translate> or <Translate />
    const tscTagNode = getOpenTag(tscElementNode);

    const expectedParamsResult = getExpectedComponentParams(
      checker,
      tscTagNode
    );
    if (!expectedParamsResult) {
      context.report({
        node,
        messageId: "invalid-signature",
      });
      return;
    }
    const [expectedParams, expectedComponentParams] = expectedParamsResult;

    const argsFromProps = getComponentArgsFromProps(checker, tscTagNode);

    const argsFromChildren = getComponentArgsFromChildren(
      checker,
      tscElementNode
    );

    // Find missing params
    const foundArgNames = new Set(
      argsFromProps.concat(argsFromChildren.map(([key]) => key))
    );
    const missingParamNames: string[] = [];
    for (const expectedParam of expectedComponentParams) {
      if (!foundArgNames.has(expectedParam)) {
        missingParamNames.push(expectedParam);
      }
    }
    if (missingParamNames.length > 0) {
      context.report({
        node: parserServices.tsNodeToESTreeNodeMap.get(tscTagNode),
        messageId: "missing-component-argument",
        data: {
          paramNames: missingParamNames.join(", "),
        },
      });
    }

    // Find extra args
    const expectedParamsSet = new Set(expectedParams);
    for (const [argName, argNode] of argsFromChildren) {
      if (!expectedParamsSet.has(argName)) {
        context.report({
          node: parserServices.tsNodeToESTreeNodeMap.get(argNode),
          messageId: "extra-component-argument",
          data: {
            argName,
          },
        });
      }
    }
  });
  return {
    ImportDeclaration(node) {
      tracker.trackImport(context.getSourceCode().scopeManager!, node);
    },
  };
}

function getExpectedComponentParams(
  checker: ts.TypeChecker,
  tscTagNode: ts.JsxOpeningLikeElement
): [string[], string[]] | undefined {
  // Reference to the Translate component (with its resolved type arguments)
  const sig = checker.getResolvedSignature(tscTagNode);
  if (!sig) {
    return undefined;
  }

  if (sig.parameters.length < 1) {
    return undefined;
  }

  // The Translate component's first argument (= props argument)
  // It is TranslateProps<Vocabulary, Id>
  const propsType = checker.getTypeOfSymbolAtLocation(
    sig.parameters[0]!,
    tscTagNode
  );

  // Get MessageArguments<Vocabulary[Id], React.ReactElement>
  const messageParamsType = getRealMessageParamsFromProps(checker, propsType);
  if (!messageParamsType) {
    return undefined;
  }

  const messageParams = checker.getPropertiesOfType(messageParamsType);
  const componentParams: string[] = [];
  for (const sym of messageParams) {
    const paramType = checker.getTypeOfSymbolAtLocation(sym, tscTagNode);
    if (extractTypeAlias(paramType, "ReactElement", 0)) {
      componentParams.push(sym.getName());
    }
  }
  return [messageParams.map((sym) => sym.getName()), componentParams];
}

// TranslateProps<Vocabulary, Id> -> MessageArguments<Vocabulary[Id], React.ReactElement>
function getRealMessageParamsFromProps(
  checker: ts.TypeChecker,
  ty: ts.Type
): ts.Type | undefined {
  // Check if it is TranslateProps<Vocabulary, Id>
  if (!extractTypeAlias(ty, "TranslateProps", 2)) return undefined;

  // TranslateProps expands to intersection
  if (!ty.isIntersection()) return undefined;

  for (const elem of ty.types) {
    // Either BaseTranslateProps<Vocabulary, Id>,
    //   Partial<MessageArguments<Vocabulary[Id], React.ReactElement>>,
    //   or Omit<MessageArguments<Vocabulary[Id], React.ReactElement>, ...>,

    // If it is Partial<T>, return T inside
    const partialParams = extractTypeAlias(elem, "Partial", 1);
    if (!partialParams) continue;

    return partialParams[0]!;
  }
  return undefined;
}

function getComponentArgsFromProps(
  checker: ts.TypeChecker,
  tscTagNode: ts.JsxOpeningLikeElement
): string[] {
  const args: string[] = [];
  for (const prop of tscTagNode.attributes.properties) {
    if (ts.isJsxAttribute(prop)) {
      if (!prop.name.getText) {
        args.push((prop.name as { text: string }).text);
      }
      args.push(prop.name.getText());
    } else if (ts.isJsxSpreadAttribute(prop)) {
      const attrTypes = checker.getTypeAtLocation(prop.expression);
      for (const subpropSym of attrTypes.getProperties()) {
        args.push(subpropSym.getName());
      }
    }
  }
  return args;
}

function getComponentArgsFromChildren(
  _checker: ts.TypeChecker,
  tscElementNode: ts.JsxElement | ts.JsxSelfClosingElement
): [string, ts.JsxElement | ts.JsxSelfClosingElement][] {
  let counter = 0;
  const args: [string, ts.JsxElement | ts.JsxSelfClosingElement][] = [];

  search(tscElementNode);
  function search(elem: ts.JsxElement | ts.JsxSelfClosingElement) {
    if (ts.isJsxSelfClosingElement(elem)) return;

    for (const child of elem.children) {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
        const key = findKey(getOpenTag(child)) ?? `${counter++}`;
        args.push([key, child]);
        search(child);
      }
    }
  }

  return args;
}

function extractTypeAlias(
  ty: ts.Type,
  name: string,
  length: number
): readonly ts.Type[] | undefined {
  if (ty.aliasSymbol) {
    if (ty.aliasSymbol.getName() !== name) return undefined;

    if (!ty.aliasTypeArguments) return undefined;
    if (ty.aliasTypeArguments.length < length) return undefined;

    return ty.aliasTypeArguments;
  } else if (isTypeReference(ty)) {
    const tysym = ty.getSymbol();
    if (!tysym) return undefined;
    if (tysym.getName() !== name) return undefined;

    if (!ty.typeArguments) return undefined;
    if (ty.typeArguments.length < length) return undefined;

    return ty.typeArguments;
  }
  return undefined;
}

function findKey(tag: ts.JsxOpeningLikeElement): string | undefined {
  for (const prop of tag.attributes.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    const text =
      !prop.name.getText
      ? (prop.name as { text: string }).text
      : prop.name.getText()
    if (text !== "key") continue;

    if (prop.initializer) {
      if (ts.isStringLiteral(prop.initializer)) {
        return prop.initializer.text;
      } else if (ts.isJsxExpression(prop.initializer)) {
        if (
          prop.initializer.expression &&
          ts.isStringLiteralLike(prop.initializer.expression)
        ) {
          return prop.initializer.expression.text;
        }
      }
    }

    return "__invalid_key__";
  }
  return undefined;
}

function getOpenTag(
  elem: ts.JsxElement | ts.JsxSelfClosingElement
): ts.JsxOpeningLikeElement {
  if (ts.isJsxSelfClosingElement(elem)) {
    return elem;
  } else {
    return elem.openingElement;
  }
}

function isTypeReference(ty: ts.Type): ty is ts.TypeReference {
  return !!(
    ty.flags & ts.TypeFlags.Object &&
    (ty as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
  );
}
