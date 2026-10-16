'use strict';

const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g;
const NODE_GLOBALS_RE =
  /\b(?:require\s*\(|process\.|Buffer\b|__dirname\b|__filename\b|module\.exports\b|exports\.)/;

function withoutComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function findNodeGlobal(code) {
  const match = withoutComments(code).match(NODE_GLOBALS_RE);
  return match ? match[0] : null;
}

module.exports = { SPECIFIER_RE, NODE_GLOBALS_RE, findNodeGlobal };
