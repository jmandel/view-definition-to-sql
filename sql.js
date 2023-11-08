import {fpparse} from './simplify'

let counter = {}
function unique(n) {
  counter[n] = counter[n] ? counter[n] + 1 : 0
  return n + (counter[n] > 0 ? counter[n] : '')
}

const opName = {
  '~': 'TILDE',
  '=': 'EQ',
}

function pathToAst(pathArray, parent = null, nameHint = "p") {
  console.log(pathArray)
  const ret = []

  const incomingSource = parent?.forEach ? parent?.forEach?.path?.at(-1)?.source : parent.source
  // const target = parent?.forEach ? parent?.forEach?.path?.at(-1)?.target : parent.target
  let expr = ''
  for (const [i, p] of pathArray.entries()) {
    const source = ret.length === 0 ? incomingSource : ret.at(-1).target
    const target =  { table: source.table + "_" +(ret.length ? "p":nameHint)+ret.length, column: 'value' };
    if (p.literal) {
      ret.push({
        literal: p.literal,
        source,
        target,
      })
    }
    if (p.context) {
      ret.push({
        context: p.context,
        source,
        target,
      })
    }
    if (p.navigation) {
      expr += '.' + p.navigation
      if (p.type?.array) {
        ret.push({
          source,
          target,
          jsonPath: `$${expr}`,
          array: true,
          type: p.type.type
        })
        expr = ''
      }
    }

    if (p.fn) {
      const context = ret
      const fn = {
        source,
        target,
        type: p.type?.type,
        jsonPath: expr ? `$${expr}` : undefined,
        op: p.fn,
        args: p.args.map((a, i) => pathToAst(a, { source }, (opName[p.fn] ?? p.fn))),
      }
      context.push(fn)
      expr = '';
    }
  }

  if (expr) {
    const source = ret.length === 0 ? incomingSource : ret.at(-1).target
    const target =  { table: source.table + '_p'+ret.length+'_literal' + ret.length, column: 'value' };
    ret.push({
      source,
      // target: { table: 'continued-target' },
      target,
      // help: {parent},
      jsonPath: `$${expr}`,
      type: pathArray.at(-1).type?.type
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
        path: pathToAst(path, parent, "each"),
      }
      parent.forEach.target = parent.forEach.path.at(-1).target
    }
    // Handle the column in the select block
    ;(selectBlock.column || []).forEach((column) => {
      const path = fpparse(column.path, targetType || viewDefinition.resource)
      const source = parent?.forEach ? parent?.forEach?.path?.at(-1)?.target : parent.source
      // Append to the selections list in the AST
      parent.column.push({
        name: column.name,
        source: source,
        path: pathToAst(path, {source}, "col"),
      })
      parent.column.at(-1).target = parent.column.at(-1).path.at(-1).target
    })
    // Handle any nested select blocks inside the forEach block
    if (selectBlock.select) {
      selectBlock.select.forEach((nestedSelect, i) => {
        const blockTemplate = {
          ...blockTemplateEmpty(),
          source: parent.forEach ?? parent.source,
          target: { table: 'result' + `_s${i}` },
        }
        handleSelect(blockTemplate, nestedSelect, targetType)
        parent.select.push(blockTemplate)
      })
    }
  }

  const blockTemplate = {
    ...blockTemplateEmpty(),
    source: { table: viewDefinition.resource, column: 'value' },
  }
  handleSelect(blockTemplate, viewDefinition)
  return blockTemplate
}

function queryWhere(args) {
  return "QUERE" + JSON.stringify(args)
  const parts = args.slice(args[0].context ? 1 : 0);
}

function queryPathItemToSql(p, isForEach) {
  console.log("QP", p)
  let prerequisites = []
  if (p.context === "$this") {
    return [`${p.target.table} as (uselect * from ${p.source.table})`]
  }

  if (p.literal) {
    return [`${p.target.table} as (select i.sourceKey, i.key, '${p.literal}' as value
      from ${p.source.table} i)`]
  }

  if (p.op === '~' || p.op === '=') {
    // if (p.args[0].length === 1 && p.args[0][0].context) {
    //   ret += "\nFN~ where i.value ilike '${JSON.stringify(p.args[1][0]})'"
    // } else {
    prerequisites = prerequisites.concat((p.args[0] || []).flatMap(a => queryPathItemToSql(a)))
    prerequisites = prerequisites.concat((p.args[1] || []).flatMap(a => queryPathItemToSql(a)))
    return prerequisites.concat([`${p.target.table} as (select i.sourceKey, i.key, (i.value=o.value) as value
      from ${p.args[0].at(-1).target.table} i join ${p.args[1].at(-1).target?.table} o on (i.key=o.key)
    )`])
    // }
  }

  if (p.op === 'exists') {
    const existsTable = p.args[0].at(-1).target.table;
    prerequisites = prerequisites.concat((p.args[0] || []).flatMap(a => queryPathItemToSql(a)))
    return prerequisites.concat(`

    ${p.target.table}(sourceKey, key, value) as (
      select  i.* from ${p.source.table} i
      where exists(select 1 from ${existsTable} e where e.sourceKey=i.key  and e.value = 1)
    )
    
    `)
  }


  let key, sourceKey;
  if (p.array) {
    sourceKey = p.source.table.includes('_') ? `i.sourceKey` : `json_extract(i.${p.source.column}, '$.id')`
    key = (p.source.table.includes('_') ? `i.key` : `json_extract(i.${p.source.column}, '$.id')`)   + ` || '_' || o.path `;
  } else {
    key = "i.key"
    sourceKey = "i.sourceKey"
  }

  let ret = `${p.target.table}(sourceKey, key, value) as (select\n    ${sourceKey} as sourceKey,\n    ${key} as key,\n    `

  if (p.jsonPath && !p.array) {
    ret += `json_extract('o.value', '${p.jsonPath}') `
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

import {vd1} from "./views"
const o = viewDefinitionToQueryAst(vd1)
console.log(JSON.stringify(o, null, 2))
const q = queryAstToSql(o)
console.log(q.join(',\n'))
