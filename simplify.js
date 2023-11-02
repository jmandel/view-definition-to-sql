import fhirpath from "fhirpath";

const expr = "Patient.where(text ~ 'Josh').name.where($this.title.substring(3, 2, 1).startsWith('J')).given"
const tree = fhirpath.parse(expr);
console.log(JSON.stringify(tree, null, 2))
const simpler = simplifyParseTree(tree);
console.log(JSON.stringify(simpler, null, 2))

function isArray(path) {
  // Assume external function exists to return this value for a static path
  // TODO: integrate with FHIR Schema
  return false;
}

function simplifyParseTree(tree) {
  // Helper function to check if the path is an array

  function simplifyNode(node) {
    // Debug print
    console.log(`Simplifying node of type: ${node.type}`);
    
    switch (node.type) {
      case undefined:
        return simplifyNode(node.children[0]);

      case 'EntireExpression':
        return simplifyNode(node.children[0]);
      
      case 'InvocationExpression':
        if (node.terminalNodeText[0] === '.') {
          const navigationNode = simplifyNode(node.children[1]);
          const beforeNavigation = simplifyNode(node.children[0]);
          return beforeNavigation.concat(navigationNode);
        }
        break;
      
      case 'TermExpression':
        if (node.children.length === 1) {
          return simplifyNode(node.children[0]);
        }
        break;
      
      case 'InvocationTerm':
        if (node.children.length === 1) {
          return simplifyNode(node.children[0]);
        }
        break;
      
      case 'MemberInvocation':
        if (node.children.length === 1) {
          return simplifyNode(node.children[0]);
        }
        break;
      
      case 'Identifier':
        return [{ "navigation": node.terminalNodeText[0], "array": isArray(node.terminalNodeText[0]) }];
      
      case 'FunctionInvocation':
        const functionName = node.children[0].children[0].terminalNodeText[0];
        const args = node.children[0].children[1].children.map(param => simplifyNode(param));
        return [{ "fn": functionName, "args": args }];
      
      case 'EqualityExpression':
        const operator = node.terminalNodeText[0];
        const leftOperand = simplifyNode(node.children[0]);
        const rightOperand = simplifyNode(node.children[1]);
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

  return simplifyNode(tree);
}
