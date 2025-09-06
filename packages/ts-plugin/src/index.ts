// eslint-disable-next-line n/no-unpublished-import
import type ts from "typescript";

type Config = {
  locales: string[];
};

function init(modules: { typescript: typeof import("typescript") }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    info.project.projectService.logger.info("Setting up @hi18n/ts-plugin");

    const localesToShow = (info.config as Config).locales || ["en"];

    // Set up decorator object
    const proxy = setupProxy(info.languageService);

    type MessageCandidate = {
      locale: string;
      message: string;
    };

    proxy.getQuickInfoAtPosition = (
      fileName: string,
      position: number,
    ): ts.QuickInfo | undefined => {
      const prior = info.languageService.getQuickInfoAtPosition(
        fileName,
        position,
      );
      if (prior) return prior;

      const program = info.languageService.getProgram();
      if (!program) return undefined;
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) return undefined;

      // `"example/greeting"` in `t("example/greeting")`
      const targetNode = findNode(ts, sourceFile, position);
      if (!targetNode) return undefined;

      const candidates = resolveTranslation(program, sourceFile, targetNode);
      if (!candidates) return undefined;

      return {
        kind: ts.ScriptElementKind.string,
        kindModifiers: "",
        textSpan: {
          start: targetNode.getStart(),
          length: targetNode.getEnd() - targetNode.getStart(),
        },
        documentation: [
          ...candidates.map((c) => ({
            text: `${c.message} (${c.locale})\n`,
            kind: "text",
          })),
        ],
      };
    };

    function resolveTranslation(
      program: ts.Program,
      sourceFile: ts.SourceFile,
      targetNode: ts.Node,
    ): MessageCandidate[] | undefined {
      // Check if it is in the form of `t("example/greeting", ...)`
      if (!ts.isStringLiteral(targetNode)) return undefined;
      if (!ts.isCallExpression(targetNode.parent)) return undefined;
      if (targetNode.parent.arguments[0] !== targetNode) return undefined;

      // TODO: escape
      const translationId = targetNode.getText().replaceAll(/^"|"$/g, "");

      // The `t` in `t("example/greeting")`
      const tNode = targetNode.parent.expression;
      if (!ts.isIdentifier(tNode)) return undefined;

      const typeChecker = program.getTypeChecker();

      // The `t` function's type. Should be `CompoundTranslatorFunction<Vocabulary>`.
      const tType = typeChecker.getTypeAtLocation(tNode);
      if (!tType.aliasSymbol || !tType.aliasTypeArguments) return undefined;

      // Check if it is `CompoundTranslatorFunction<...>`.
      const name = tType.aliasSymbol.getName();
      if (name !== "CompoundTranslatorFunction") return undefined;

      // Extract the `Vocabulary` type
      if (tType.aliasTypeArguments.length < 1) return undefined;
      const vocabularyType = tType.aliasTypeArguments[0]!;

      // Look into the definition of Vocabulary. Fetch the corresponding property signature
      // Like `"example/greeting": msg("Hello, world!")` in `type Vocabulary = { ... }`
      const translationSymbol = typeChecker.getPropertyOfType(
        vocabularyType,
        translationId,
      );
      if (!translationSymbol) return undefined;
      const translationDecl = (translationSymbol.getDeclarations() ?? [])[0];
      if (!translationDecl) return undefined;

      // Find definitions of the messages
      const messages = info.languageService.getImplementationAtPosition(
        translationDecl.getSourceFile().fileName,
        translationDecl.getStart(),
      );
      if (!messages) return undefined;
      const foundCandidates: MessageCandidate[] = [];
      for (const msgdef of messages) {
        const sourceFile = program.getSourceFile(msgdef.fileName);
        if (!sourceFile) continue;
        const msgdefKeyNode = findNode(ts, sourceFile, msgdef.textSpan.start);
        if (!msgdefKeyNode) continue;
        if (!ts.isStringLiteral(msgdefKeyNode)) continue;
        const msgdefPropertyNode = msgdefKeyNode.parent;
        if (!ts.isPropertyAssignment(msgdefPropertyNode)) continue;
        if (msgdefPropertyNode.name !== msgdefKeyNode) continue;

        const msgdefValueNode = msgdefPropertyNode.initializer;
        let messageTextNode = msgdefValueNode;
        if (
          ts.isCallExpression(msgdefValueNode) &&
          msgdefValueNode.arguments.length === 1
        ) {
          messageTextNode = msgdefValueNode.arguments[0]!;
        }
        if (!ts.isStringLiteral(messageTextNode)) continue;

        let locale = "unknown";
        const localeMatch = /([^/]+)\.[mc]?[tj]sx?$/.exec(
          messageTextNode.getSourceFile().fileName,
        );
        if (localeMatch && localeMatch[1] !== "index") {
          locale = localeMatch[1]!;
        }
        foundCandidates.push({
          locale,
          message: messageTextNode.text,
        });
      }
      if (foundCandidates.length == 0) return undefined;
      const filteredCandidates: MessageCandidate[] = [];
      for (const locale of localesToShow) {
        const c = foundCandidates.find((c) => c.locale === locale);
        if (c) {
          filteredCandidates.push(c);
        }
      }
      if (filteredCandidates.length === 0) {
        filteredCandidates.push(foundCandidates[0]!);
      }

      return filteredCandidates;
    }

    return proxy;
  }

  return { create };
}

function setupProxy<T>(original: T): T {
  const proxy = Object.create(null) as Record<string, unknown>;
  for (const [k, v] of Object.entries(original as object) as [
    string,
    unknown,
  ][]) {
    if (typeof v === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      proxy[k] = (...args: any[]) => v.apply(original, args);
    } else {
      proxy[k] = v;
    }
  }
  return proxy as T;
}

// https://github.com/microsoft/typescript-template-language-service-decorator/blob/2.3.1/src/nodes.ts#L16-L27
function findNode(
  typescript: typeof import("typescript"),
  sourceFile: ts.SourceFile,
  position: number,
): ts.Node | undefined {
  function find(node: ts.Node): ts.Node | undefined {
    if (position >= node.getStart() && position < node.getEnd()) {
      return typescript.forEachChild(node, find) || node;
    }
  }
  return find(sourceFile);
}

export default init;
