import { file, File, Program, Node } from "@babel/types";
import { NodePath, HubInterface, Scope } from "@babel/traverse";
import { codeFrameColumns } from "@babel/code-frame";

export type EnrichedTraverseContext = {
  file: File,
  hub: HubInterface,
  path: NodePath<Program>,
  scope: Scope,
};

export type EnrichOptions = {
  highlightCode?: boolean;
};

export function enrichContext(code: string, program: File | Program, options: EnrichOptions = {}): EnrichedTraverseContext {
  const { highlightCode = false } = options;
  const fileAst = program.type === "Program" ? file(program, [], []) : program;
  const hub: HubInterface = {
    getCode() {
      return undefined;
    },
    getScope() {
      return path.scope;
    },
    addHelper(name) {
      throw new Error(`Unimplemented: addHelper("${name}")`);
    },
    buildError<E extends Error>(node: Node, msg: string, Error: new (message?: string) => E): E {
      let loc = node && (node.loc || (node as any)._loc);
      if (!loc) return new Error(msg);
      msg +=
        "\n" +
        codeFrameColumns(
          code,
          {
            start: {
              line: loc.start.line,
              column: loc.start.column + 1,
            },
            end:
              loc.end && loc.start.line === loc.end.line
                ? {
                    line: loc.end.line,
                    column: loc.end.column + 1,
                  }
                : undefined,
          },
          { highlightCode },
        );
      throw new Error(msg);
    }
  };
  const path = NodePath.get({
    hub,
    parentPath: null,
    parent: fileAst,
    container: fileAst,
    key: "program",
  }).setContext(undefined as any) as NodePath<Program>;
  return { file: fileAst, hub, path, scope: path.scope};
}
