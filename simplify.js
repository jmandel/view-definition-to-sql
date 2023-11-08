import fhirpath from 'fhirpath'

const schema = (await Bun.file('./fhir-schema.ndjson').text())
  .split('\n')
  .filter((l) => !!l)
  .map((l) => JSON.parse(l))

export function simplifyFhirpath(node, type = null) {
  switch (node.type) {
    case undefined:
    case 'EntireExpression':
    case 'ParenthesizedTerm':
      return simplifyFhirpath(node.children[0], type)
    case 'AndExpression':
    case 'OrExpression':
    case 'UnionExpression':
      return [{ fn: node.terminalNodeText, args: node.children.map(simplifyFhirpath, type) }]
    case 'InvocationExpression':
      if (node.terminalNodeText[0] === '.') {
        const beforeNavigation = simplifyFhirpath(node.children[0], type)
        const navigationNode = simplifyFhirpath(node.children[1], beforeNavigation.at(-1).type)
        return beforeNavigation.concat(navigationNode)
      }
      break
    case 'TermExpression':
      if (node.children.length === 1) {
        return simplifyFhirpath(node.children[0], type)
      }
      break
    case 'InvocationTerm':
      if (node.children.length === 1) {
        return simplifyFhirpath(node.children[0], type)
      }
      break
    case 'MemberInvocation':
      if (node.children.length === 1) {
        return simplifyFhirpath(node.children[0], type)
      }
      break
    case 'Identifier':
      return [{ navigation: node.terminalNodeText[0], type: resolveType(type, node.terminalNodeText[0]) }]
    case 'FunctionInvocation':
      const functionName = node.children[0].children[0].terminalNodeText[0]
      const args = (node.children[0].children[1]?.children || []).map((param) => simplifyFhirpath(param, type))
      return [{ fn: functionName, args: args, type: ['where', 'first'].includes(functionName) ? type : null }]
    case 'InequalityExpression':
    case 'EqualityExpression':
      const operator = node.terminalNodeText[0]
      const leftOperand = simplifyFhirpath(node.children[0], type)
      const rightOperand = simplifyFhirpath(node.children[1], type)
      return [{ fn: operator, args: [leftOperand, rightOperand] }]
    case 'LiteralTerm':
      const literalValue = node.children[0].terminalNodeText[0].replace(/'/g, '')
      return [{ literal: literalValue }]
    case 'ThisInvocation':
      return [{ context: '$this' }]
    default:
      console.log(`Unhandled node type: ${node.type}`)
      return []
  }
}

function resolveType(t, s) {
  let st = typeof t === 'string' ? schema.filter((s) => s.id == t).at(0) : t
  if (st?.type && !st?.elements) {
    st = schema.filter((s) => s.type == st.type).at(0)
  }
  st = st?.elements?.[s]
  return st
}

export function fpparse(q, type) {
  return simplifyFhirpath(fhirpath.parse(q), type)
}
