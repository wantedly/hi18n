import { BaseNode, Declaration, Expression, Identifier, NewExpression, Pattern, Statement } from "estree";
export type TypeAnnotationExtension = {
  typeAnnotation?: TSTypeAnnotation | undefined;
};
export type TypeParameterInstantiationExtension = {
  typeParameters?: TSTypeParameterInstantiation | undefined;
};

export type NewExpressionExt = NewExpression & TypeParameterInstantiationExtension;
export type DeclarationExt = Declaration | TSTypeAliasDeclaration | TSInterfaceDeclaration;
export type StatementExt = Statement | TSTypeAliasDeclaration | TSInterfaceDeclaration;

export interface TSTypeAliasDeclaration extends BaseNode {
  type: "TSTypeAliasDeclaration";
  id: Identifier;
  typeAnnotation: TSType;
}

export interface TSInterfaceDeclaration extends BaseNode {
  type: "TSInterfaceDeclaration";
  id: Identifier;
  body: TSInterfaceBody;
}

export interface TSInterfaceBody extends BaseNode {
  body: TSSignature[];
}

export type TSSignature =
  | TSPropertySignature
  | TSMethodSignature
  | TSCallSignatureDeclaration
  | TSConstructSignatureDeclaration
  | TSIndexSignature;

export interface TSPropertySignature extends BaseNode {
  type: "TSPropertySignature";
  readonly?: boolean | undefined;
  computed: boolean;
  key: Expression;
  optional?: boolean | undefined;
  typeAnnotation?: TSTypeAnnotation | undefined;
}

export interface TSMethodSignature extends BaseNode {
  type: "TSMethodSignature";
  computed: boolean;
  key: Expression;
  typeParameters?: TSTypeParameterDeclaration | undefined;
  optional?: boolean | undefined;
  params: (Pattern & TypeAnnotationExtension)[];
  returnType?: TSTypeAnnotation | undefined;
}

export interface TSCallSignatureDeclaration extends BaseNode {
  type: "TSCallSignatureDeclaration";
  typeParameters?: TSTypeParameterDeclaration | undefined;
  params: (Pattern & TypeAnnotationExtension)[];
  returnType?: TSTypeAnnotation | undefined;
}

export interface TSConstructSignatureDeclaration extends BaseNode {
  type: "TSConstructSignatureDeclaration";
  typeParameters?: TSTypeParameterDeclaration | undefined;
  params: (Pattern & TypeAnnotationExtension)[];
  returnType?: TSTypeAnnotation | undefined;
}

export interface TSIndexSignature extends BaseNode {
  type: "TSIndexSignature";
  parameters: (Identifier & TypeAnnotationExtension)[];
  typeAnnotation?: TSTypeAnnotation | undefined;
}

export interface TSTypeParameterDeclaration extends BaseNode {
  type: "TSTypeParameterDeclaration";
  params: TSTypeParameter[];
};

export interface TSTypeParameter extends BaseNode {
  type: "TSTypeParameter";
  name: Identifier;
  constraint?: TSType | undefined;
  default?: TSType | undefined;
}

export interface TSTypeParameterInstantiation extends BaseNode {
  type: "TSTypeParameterInstantiation";
  params: TSType[];
};

export interface TSTypeAnnotation extends BaseNode {
  type: "TSTypeAnnotation";
  typeAnnotation: TSType;
}

export type TSType =
  | TSTypeReference
  | TSUnionType
  | TSTypeLiteral
  /* | ... */;

export interface TSTypeReference extends BaseNode {
  type: "TSTypeReference";
  typeName: Identifier;
  typeParameters?: TSTypeParameterInstantiation | undefined;
};

export interface TSUnionType extends BaseNode {
  type: "TSUnionType";
  types: TSType[];
};

export interface TSTypeLiteral extends BaseNode {
  type: "TSTypeLiteral";
  members: TSSignature[];
}
