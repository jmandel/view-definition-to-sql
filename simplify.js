import fhirpath from 'fhirpath'

const schema = (await Bun.file('./fhir-schema.ndjson').text())
  .split('\n')
  .filter((l) => !!l)
  .map((l) => JSON.parse(l))

function simplyFhirpath(node, type = null) {
  switch (node.type) {
    case undefined:
    case 'EntireExpression':
    case 'ParenthesizedTerm':
      return simplyFhirpath(node.children[0], type)
    case 'AndExpression':
    case 'OrExpression':
    case 'UnionExpression':
      return [{ fn: node.terminalNodeText, args: node.children.map(simplyFhirpath, type) }]
    case 'InvocationExpression':
      if (node.terminalNodeText[0] === '.') {
        const beforeNavigation = simplyFhirpath(node.children[0], type)
        const navigationNode = simplyFhirpath(node.children[1], beforeNavigation.at(-1).type)
        return beforeNavigation.concat(navigationNode)
      }
      break
    case 'TermExpression':
      if (node.children.length === 1) {
        return simplyFhirpath(node.children[0], type)
      }
      break
    case 'InvocationTerm':
      if (node.children.length === 1) {
        return simplyFhirpath(node.children[0], type)
      }
      break
    case 'MemberInvocation':
      if (node.children.length === 1) {
        return simplyFhirpath(node.children[0], type)
      }
      break
    case 'Identifier':
      return [{ navigation: node.terminalNodeText[0], type: resolveType(type, node.terminalNodeText[0]) }]
    case 'FunctionInvocation':
      const functionName = node.children[0].children[0].terminalNodeText[0]
      const args = (node.children[0].children[1]?.children || []).map((param) => simplyFhirpath(param, type))
      return [{ fn: functionName, args: args, type: ['where', 'first'].includes(functionName) ? type : null }]
    case 'InequalityExpression':
    case 'EqualityExpression':
      const operator = node.terminalNodeText[0]
      const leftOperand = simplyFhirpath(node.children[0], type)
      const rightOperand = simplyFhirpath(node.children[1], type)
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

function fpparse(q, type) {
  return simplyFhirpath(fhirpath.parse(q), type)
}

let counter = {}
function unique(n) {
  counter[n] = counter[n] ? counter[n] + 1 : 0
  return n + (counter[n] > 0 ? counter[n] : '')
}

function pathToAst(pathArray, parent = null) {
  const ret = []

  const source = parent?.forEach ? parent?.forEach?.path?.at(-1)?.source : parent.source
  const target = parent?.forEach ? parent?.forEach?.path?.at(-1)?.target : parent.target
  let expr = ''
  for (const [i, p] of pathArray.entries()) {
    if (p.literal) {
      ret.push({
        literal: p.literal,
        source,
        target: { table: target.table + '_literal' + ret.length, column: 'value' },
      })
    }
    if (p.context) {
      ret.push({
        context: p.context,
        source,
        target: { table: target.table + '_ctx' + ret.length, column: 'value' },
      })
    }
    if (p.navigation) {
      expr += '.' + p.navigation
      if (p.type?.array) {
        ret.push({
          source: ret.length === 0 ? source : ret.at(-1).target,
          target: { table: target.table + '_p' + ret.length, column: 'value' },
          jsonPath: `$${expr}`,
          array: true,
        })
        expr = ''
      }
    }

    if (p.fn) {
      const context = ret
      let source2 = ret.length === 0 ? source : ret.at(-1).target
      let target2 = { table: unique(source2?.table + '_fn'), column: 'value' }
      const fn = {
        source: source2,
        target: target2,
        jsonPath: expr ? `$${expr}` : undefined,
        op: p.fn,
        args: p.args.map((a, i) => pathToAst(a, { source: source2, target: {...target2, table: target2.table + '_arg'+i} })),
      }
      // if (fn.args?.at(-1)?.at(-1)) {
      //   fn.args.at(-1).at(-1).target = target2;
      // }
      context.push(fn)
      expr = '';
    }
  }

  if (expr) {
    ret.push({
      source: ret.length === 0 ? source : ret.at(-1).target,
      // target: { table: 'continued-target' },
      target: { table: target.table + '_p' + ret.length, column: 'value' },
      // help: {parent},
      jsonPath: `$${expr}`,
    })
  }

  return ret
}

function viewDefinitionToQueryAst(viewDefinition) {
  const blockTemplateEmpty = () => ({ column: [], select: [] })

  // TODO: make this return ASTs rather than mutating them
  function handleSelect(parent, selectBlock, type = null) {
    let targetType = type
    if (selectBlock.forEach) {
      const path = fpparse(selectBlock.forEach, type || viewDefinition.resource)
      targetType = path.at(-1).type
      parent.forEach = {
        target: null,
        source: parent.source,
        path: pathToAst(path, parent),
      }
      parent.forEach.target = parent.forEach.path.at(-1).target
    }
    // Handle the column in the select block
    ;(selectBlock.column || []).forEach((column) => {
      // Extract the path using the fpparse function
      const path = fpparse(column.path, type || viewDefinition.resource)
      const source = parent?.forEach ? parent?.forEach?.path?.at(-1)?.target : parent.source
      // Append to the selections list in the AST
      parent.column.push({
        source: source,
        path: pathToAst(path, parent),
        target: { table: unique(source.table + '_c' + column.name), column: column.name },
      })
      parent.column.at(-1).path.at(-1).target = parent.column.at(-1).target
    })
    // Handle any nested select blocks inside the forEach block
    if (selectBlock.select) {
      selectBlock.select.forEach((nestedSelect, i) => {
        const blockTemplate = {
          ...blockTemplateEmpty(),
          source: parent.forEach ?? parent.source,
          target: { table: parent?.target?.table + `_s${i}` },
        }
        handleSelect(blockTemplate, nestedSelect, targetType)
        parent.select.push(blockTemplate)
      })
    }
  }

  const blockTemplate = {
    ...blockTemplateEmpty(),
    source: { table: viewDefinition.resource, column: 'value' },
    target: { table: 'output' },
  }
  handleSelect(blockTemplate, viewDefinition)
  return blockTemplate
}

function queryWhere(args) {
  return "QUERE" + JSON.stringify(args)
  const parts = args.slice(args[0].context ? 1 : 0);

}

function queryPathItemToSql(p, isForEach) {
  let prerequisites = []
  const sourceKey = p.source.table.includes('_') ? `i.key` : `json_extract(i.${p.source.column}, '$.id')`

  const key = p.array ? `${sourceKey} || '_' || o.path` : sourceKey

  let ret = `${p.target.table}(sourceKey, key, value) as (select\n    ${sourceKey},\n    ${key},\n    `

  if (p.jsonPath && !p.array) {
    ret += `json_extract('o.value', '${p.jsonPath}'}) `
  } else {
    ret += `o.value `
  }
  ret += `from ${p.source.table} i `
  if (p.array) {
    ret += `join json_each(i.value, '${p.jsonPath}') o`
  }
  if (p.op === 'where') {
    prerequisites = prerequisites.concat(p.args[0].flatMap(a => queryPathItemToSql(a)))
    ret += `\n    FN.WHERE join ${p.args[0].at(-1).source.table})`
  }
  if (p.op === 'exists') {
    prerequisites = prerequisites.concat(p.args[0].flatMap(a => queryPathItemToSql(a)))
    ret += `\n    FN.EXISTS join ${p.args[0].at(-1).source.table})`
  }

  if (p.op === '~') {
    // if (p.args[0].length === 1 && p.args[0][0].context) {
    //   ret += "\nFN~ where i.value ilike '${JSON.stringify(p.args[1][0]})'"
    // } else {
    prerequisites = prerequisites.concat(p.args[0].flatMap(a => queryPathItemToSql(a)))
    prerequisites = prerequisites.concat(p.args[1].flatMap(a => queryPathItemToSql(a)))
    ret += `\n    FN~ where lhs.value ~ rhs.value`
    // }
  }


  ret += "\n)"
  return prerequisites.concat([ret])
}

function queryAstToSql(ast) {
  const ctes = []
  if (ast.forEach) {
    ctes.push(
      ...ast.forEach.path
        .flatMap((p, i) => queryPathItemToSql(p, i == ast.forEach.path.length - 1))
    )
  }

  for (const c of ast.column ?? []) {
    ctes.push(...c.path.flatMap(queryPathItemToSql))
  }

  for (const s of ast.select ?? []) {
    ctes.push(...queryAstToSql(s))
  }

  ctes.push(
    `${ast?.target?.table} as CROSS JOIN ALL ${(ast.select || [])
      .concat(ast.column || [])
      .map((s) => JSON.stringify(s?.target || null))}`,
  )
  return ctes
}

const vd1 = {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
    {
      forEach: "name.where(given.exists($this ~ 'Josh'))",
      column: [
        {
          path: '$this',
          name: 'given_name',
          description: 'A single given name field with all names joined together.',
        },
      ],
    },
  ],
}
const vd2 = {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
    {
      column: [
        {
          path: 'getResourceKey()',
          name: 'id',
        },
        {
          path: 'gender',
          name: 'gender',
        },
      ],
    },
    {
      forEach: "name.where(use = 'official').where(text ~ 'J').first()",
      column: [
        {
          path: "given.join(' ')",
          name: 'given_name',
          description: 'A single given name field with all names joined together.',
        },
        {
          path: 'family',
          name: 'family_name',
        },
      ],
    },
  ],
}
const o = viewDefinitionToQueryAst(vd1)
console.log(JSON.stringify(o, null, 2))
const q = queryAstToSql(o)
console.log(q.join(',\n'))
