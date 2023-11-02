import fhirpath from "fhirpath";

const expr = "Patient.where(text ~ 'Josh').name.where($this.title.substring(3, 2, 1).startsWith('J')).given"
const tree = fhirpath.parse(expr);
console.log(JSON.stringify(tree, null, 2))
const simpler = simplify(tree);
console.log(JSON.stringify(simpler, null, 2))

function isArray(path) {
  // Assume external function exists to return this value for a static path
  // TODO: integrate with FHIR Schema
  return false;
}

function simplify(node) {
  switch (node.type) {
    case undefined:
    case 'EntireExpression':
    case 'ParenthesizedTerm':
      return simplify(node.children[0]);
    case 'AndExpression':
    case 'OrExpression':
    case 'UnionExpression':
      return [{fn: node.terminalNodeText, args: node.children.map(simplify)}]
    
    case 'InvocationExpression':
      if (node.terminalNodeText[0] === '.') {
        const navigationNode = simplify(node.children[1]);
        const beforeNavigation = simplify(node.children[0]);
        return beforeNavigation.concat(navigationNode);
      }
      break;
    
    case 'TermExpression':
      if (node.children.length === 1) {
        return simplify(node.children[0]);
      }
      break;
    
    case 'InvocationTerm':
      if (node.children.length === 1) {
        return simplify(node.children[0]);
      }
      break;
    
    case 'MemberInvocation':
      if (node.children.length === 1) {
        return simplify(node.children[0]);
      }
      break;
    
    case 'Identifier':
      return [{ "navigation": node.terminalNodeText[0], "array": isArray(node.terminalNodeText[0]) }];
    
    case 'FunctionInvocation':
      const functionName = node.children[0].children[0].terminalNodeText[0];
      const args = node.children[0].children[1].children.map(param => simplify(param));
      return [{ "fn": functionName, "args": args }];
    
    case 'InequalityExpression':
    case 'EqualityExpression':
      const operator = node.terminalNodeText[0];
      const leftOperand = simplify(node.children[0]);
      const rightOperand = simplify(node.children[1]);
      return [{ "fn": operator, "args": [leftOperand, rightOperand] }];
    
    case 'LiteralTerm':
      const literalValue = node.children[0].terminalNodeText[0].replace(/'/g, '');
      return [{ "literal": literalValue }];
    case 'ThisInvocation':
      return [{ "context": "$this"}]
    
    default:
      console.log(`Unhandled node type: ${node.type}`);
      return [];
  }
}
