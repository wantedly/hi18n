import { CallExpression, Expression, Identifier, isIdentifier, ImportDeclaration, MemberExpression, Node, ObjectProperty, StringLiteral, ImportDefaultSpecifier, ImportSpecifier, NewExpression, LVal } from "@babel/types";
import { Binding, NodePath } from "@babel/traverse";

export class Tracker {
  valueMap = new Map<Node, MetaValue>();
  exportHooks: ((path: NodePath, exportName: string, value: MetaValue) => void)[] = [];

  registerExportHook(hook: (path: NodePath, exportName: string, value: MetaValue) => void) {
    this.exportHooks.push(hook);
  }

  registerImport(path: NodePath<ImportDeclaration>, value: MetaValue) {
    if (this.valueMap.has(path.node)) return;

    this.valueMap.set(path.node, value);

    for (const specifier of path.get("specifiers")) {
      if (specifier.isImportSpecifier()) {
        const propertyValue = value.metaGet(importName(specifier.node.imported), specifier);
        const binding = path.scope.getBinding(specifier.node.local.name);
        if (propertyValue && binding) this.registerBinding(binding, propertyValue);
      } else if (specifier.isImportDefaultSpecifier()) {
        const propertyValue = value.metaGet("default", specifier);
        const binding = path.scope.getBinding(specifier.node.local.name);
        if (propertyValue && binding) this.registerBinding(binding, propertyValue);
      } else if (specifier.isImportNamespaceSpecifier()) {
        const binding = path.scope.getBinding(specifier.node.local.name);
        if (binding) this.registerBinding(binding, value);
      }
    }
  }

  registerExport(path: NodePath, exportName: string, value: MetaValue) {
    for (const hook of this.exportHooks) {
      hook(path, exportName, value);
    }
  }

  registerBinding(binding: Binding, value: MetaValue) {
    if (!binding.constant) return;
    for (const refPath of binding.referencePaths) {
      if (refPath.isExpression()) {
        this.registerExpr(refPath, value);
      } else if (refPath.isExportNamedDeclaration() && refPath.node.declaration) {
        this.registerExport(refPath, binding.identifier.name, value);
      }
    }
  }

  registerExpr(path: NodePath<Expression>, value: MetaValue) {
    if (this.valueMap.has(path.node)) return;

    this.valueMap.set(path.node, value);

    if (path.parentPath.isMemberExpression() && path.node === path.parentPath.node.object) {
      if (!path.parentPath.node.computed && isIdentifier(path.parentPath.node.property)) {
        const propertyValue = value.metaGet(path.parentPath.node.property.name, path.parentPath);
        if (propertyValue) this.registerExpr(path.parentPath, propertyValue);
        return;
      }
    } else if (path.parentPath.isCallExpression() && path.node === path.parentPath.node.callee) {
      const returnValue = value.metaCall(path.parentPath);
      if (returnValue) this.registerExpr(path.parentPath, returnValue);
      return;
    } else if (path.parentPath.isNewExpression() && path.node === path.parentPath.node.callee) {
      const returnValue = value.metaConstruct(path.parentPath);
      if (returnValue) this.registerExpr(path.parentPath, returnValue);
      return;
    } else if (path.parentPath.isVariableDeclarator() && path.node === path.parentPath.node.init) {
      this.registerPattern(path.parentPath.get("id"), value);
      return;
    }
    value.fallback(this, path);
  }

  registerPattern(path: NodePath<LVal>, value: MetaValue) {
    if (this.valueMap.has(path.node)) return;

    this.valueMap.set(path.node, value);

    if (path.isIdentifier()) {
      const binding = path.scope.getBinding(path.node.name);
      if (binding) this.registerBinding(binding, value);
      return;
    } else if (path.isObjectPattern()) {
      for (const property of path.get("properties")) {
        if (property.isObjectProperty()) {
          if (!property.node.computed && isIdentifier(property.node.key)) {
            const propertyValue = value.metaGet(property.node.key.name, property);
            if (propertyValue) this.registerPattern(property.get("value") as NodePath<LVal>, propertyValue);
          }
        }
      }
      return;
    }
  }
}

export type MetaGetTarget =
  | MemberExpression
  | ImportSpecifier
  | ImportDefaultSpecifier
  | ObjectProperty;

export class MetaValue {
  metaCall(_path: NodePath<CallExpression>): MetaValue | undefined {
    return undefined;
  }
  metaConstruct(_path: NodePath<NewExpression>): MetaValue | undefined {
    return undefined;
  }
  metaGet(_property: string, _path: NodePath<MetaGetTarget>): MetaValue | undefined {
    return undefined;
  }
  fallback(_tracker: Tracker, _path: NodePath): void {}
}

export class MetaObject extends MetaValue {
  properties: Record<string, MetaValue>;
  constructor(properties: Record<string, MetaValue>) {
    super();
    this.properties = properties;
  }
  override metaGet(property: string, path: NodePath<MetaGetTarget>): MetaValue | undefined {
    if (Object.prototype.hasOwnProperty.call(this.properties, property)) {
      return this.properties[property];
    }
    return super.metaGet(property, path);
  }
}

export class MetaFunction extends MetaValue {
  callHook: (path: NodePath<CallExpression>) => MetaValue | undefined;
  constructor(callHook: (path: NodePath<CallExpression>) => MetaValue | undefined) {
    super();
    this.callHook = callHook;
  }
  override metaCall(path: NodePath<CallExpression>): MetaValue | undefined {
    return this.callHook(path);
  }
}

export class MetaConstructor extends MetaValue {
  constructHook: (path: NodePath<NewExpression>) => MetaValue | undefined;
  constructor(constructHook: (path: NodePath<NewExpression>) => MetaValue | undefined) {
    super();
    this.constructHook = constructHook;
  }
  override metaConstruct(path: NodePath<NewExpression>): MetaValue | undefined {
    return this.constructHook(path);
  }
}

function importName(node: Identifier | StringLiteral): string {
  if (node.type === "Identifier") return node.name;
  else return node.value;
}
