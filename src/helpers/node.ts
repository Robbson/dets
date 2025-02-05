import {
  Node,
  Symbol,
  SyntaxKind,
  SymbolFlags,
  Declaration,
  ModifierFlags,
  getCombinedModifierFlags,
  isIdentifier,
  ExportAssignment,
  isExportAssignment,
  isTypeOperatorNode,
  TypeOperatorNode,
  isTypeReferenceNode,
  TypeReferenceNode,
  isInferTypeNode,
  InferTypeNode,
  isUnionTypeNode,
  UnionTypeNode,
  TypeChecker,
  isImportSpecifier,
  isModuleDeclaration,
  isSourceFile,
  isStringLiteral,
  isMethodDeclaration,
  isMethodSignature,
  isExportDeclaration,
} from 'typescript';

export function getModule(node: Node): string {
  while (node) {
    // only string literal declared top-level modules are external modules
    if (isModuleDeclaration(node) && isSourceFile(node.parent) && isStringLiteral(node.name)) {
      return node.name.text;
    }

    node = node.parent;
  }

  return undefined;
}

export function getJsDocs(checker: TypeChecker, node: Node) {
  if (isMethodDeclaration(node) || isMethodSignature(node)) {
    const sign = checker.getSignatureFromDeclaration(node);

    if (sign) {
      return sign.getDocumentationComment(checker);
    }
  }

  return node.symbol?.getDocumentationComment(checker);
}

export function getComment(checker: TypeChecker, node: Node): string {
  const doc = getJsDocs(checker, node);
  return doc?.map((m) => m.text).join('\n');
}

export function getDeclarationFromSymbol(checker: TypeChecker, symbol: Symbol): Declaration {
  if (!symbol) {
    return undefined;
  } else if (symbol.flags === SymbolFlags.Alias) {
    const aliasSymbol = checker.getAliasedSymbol(symbol);
    return getDeclarationFromSymbol(checker, aliasSymbol);
  } else {
    const decl = symbol.valueDeclaration || symbol.declarations?.[0];

    if (decl && isImportSpecifier(decl)) {
      return getDeclarationFromNode(checker, decl.name);
    }

    return decl;
  }
}

export function getDeclarationFromNode(checker: TypeChecker, node: Node): Declaration {
  const symbol = getSymbol(checker, node);
  return getDeclarationFromSymbol(checker, symbol);
}

export function getSymbol(checker: TypeChecker, node: Node): Symbol {
  const symbol = node.aliasSymbol ?? node.symbol;

  if (symbol) {
    return symbol;
  } else if (isTypeReferenceNode(node)) {
    const ref = node.typeName;
    return ref.aliasSymbol ?? ref.symbol ?? checker.getSymbolAtLocation(ref);
  } else {
    return checker.getSymbolAtLocation(node);
  }
}

export function isDefaultExport(node: Node): node is ExportAssignment {
  return node.symbol?.name === 'default';
}

export function shouldInclude(node: Node) {
  return isModuleDeclaration(node) || isExportDeclaration(node) || isNodeExported(node);
}

export function isNodeExported(node: Node, alsoTopLevel = false): boolean {
  return (
    isExportAssignment(node) ||
    (getCombinedModifierFlags(node as Declaration) & ModifierFlags.Export) !== 0 ||
    (alsoTopLevel && !!node.parent && node.parent.kind === SyntaxKind.SourceFile)
  );
}

export function isKeyOfType(type: Node): type is TypeOperatorNode {
  return type && isTypeOperatorNode(type) && type.operator === SyntaxKind.KeyOfKeyword;
}

export function isUnionType(type: Node): type is UnionTypeNode {
  return type && isUnionTypeNode(type);
}

export function isIdentifierType(type: Node): type is TypeReferenceNode {
  return type && isTypeReferenceNode(type) && isIdentifier(type.typeName);
}

export function isInferType(type: Node): type is InferTypeNode {
  return type && isInferTypeNode(type);
}

export function isPrivate(type: Node) {
  return type.kind === SyntaxKind.PrivateKeyword;
}

export function isStatic(type: Node) {
  return type.kind === SyntaxKind.StaticKeyword;
}

export function isProtected(type: Node) {
  return type.kind === SyntaxKind.ProtectedKeyword;
}

export function isReadonly(type: Node) {
  return type.kind === SyntaxKind.ReadonlyKeyword;
}
