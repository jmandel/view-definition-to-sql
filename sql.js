import {fpparse} from './simplify'

let counter = {}
function unique(n) {
  if (counter[n] !== undefined) {
    counter[n] += 1;
  } else {
    counter[n] = 0
  }
  return n + (counter[n] > 0 ? counter[n] : '')
}

const opName = {
  '~': 'TILDE',
  '=': 'EQ',
  '>': 'GREATER',
  '>=': 'GREATER_EQ',
  '<': 'LESS',
  '<=': 'LESS_EQ',
}

function pathToAst(pathArray, parent = null, nameHint = "p") {
  const ret = []

  const incomingSource = parent?.forEach ? parent?.forEach?.path?.at(-1)?.source : parent.source
  // const target = parent?.forEach ? parent?.forEach?.path?.at(-1)?.target : parent.target
  let expr = ''
  let target
  let source
  for (const [i, p] of pathArray.entries()) {
    source = ret.length === 0 ? incomingSource : ret.at(-1).target
    target =  { table: unique((parent.targetPrefix || source.table) + "_" +(nameHint) + (i >= 0 ? `_part${i}`: "")), column: 'value' };
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
        args: p.args.map((a, i) => pathToAst(a, { source }, (opName[p.fn] ?? p.fn)+`_arg${i}`)),
      }
      context.push(fn)
      expr = '';
    }
  }

  if (expr) {
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
      const path = fpparse(selectBlock.forEach, type)
      targetType = path.at(-1).type
      parent.forEach = {
        target: {table: parent.target.table+"_each"},
        source: parent.source,
        path: pathToAst(path, parent, parent.target.table+"_each"),
      }
      // parent.forEach.target = parent.forEach.path.at(-1).target
      parent.forEach.path.at(-1).target = parent.forEach.target 
    }

    const source = parent?.forEach ? parent?.forEach?.path?.at(-1)?.target : parent.source
    ;(selectBlock.column || []).forEach((column, i) => {
      const path = fpparse(column.path, targetType)
      // Append to the selections list in the AST
      parent.column.push({
        name: column.name,
        source,
        path: pathToAst(path, {source, targetPrefix: parent.target.table}, "col"+i),
      })
      parent.column.at(-1).target = parent.column.at(-1).path.at(-1).target
    })

    if (selectBlock.select) {
      selectBlock.select.forEach((nestedSelect, i) => {
        const blockTemplate = {
          ...blockTemplateEmpty(),
          source,
          target: { table: parent.target.table+ `_s${i}` },
        }
        handleSelect(blockTemplate, nestedSelect, targetType)
        parent.select.push(blockTemplate)
      })
    }
  }

  const blockTemplate = {
    ...blockTemplateEmpty(),
    source: { table: viewDefinition.resource, column: 'value' },
    target: { table: "result"}
  }
  handleSelect(blockTemplate, viewDefinition, viewDefinition.resource)
  return blockTemplate
}

function queryPathItemToSql(p, isForEach) {
  let prerequisites = (p.args || []).flatMap(a => a.flatMap(queryPathItemToSql));

  if (p.context === "$this") {
    return prerequisites.concat([`${p.target.table} as (select * from ${p.source.table})`])
  }

  if (p.literal) {
    return prerequisites.concat([`${p.target.table} as (select i.sourceKey, i.key, '${p.literal}' as value from ${p.source.table} i)`])
  }

  if (p.op === '~' || p.op === '=') {
    return prerequisites.concat([`${p.target.table} as (select i.sourceKey, i.key, (i.value=o.value) as value
      from ${p.args[0].at(-1).target.table} i join ${p.args[1].at(-1).target?.table} o on (i.key=o.key)
    )`])
  }

  if (p.op === 'exists') {
    const existsTable = p.args[0].at(-1).target.table;
    return prerequisites.concat(`${p.target.table}(sourceKey, key, value) as (
      select  i.* from ${p.source.table} i
      where exists(select 1 from ${existsTable} e where e.sourceKey=i.key  and e.value = 1)
    )`)
  }

  if (p.op === 'where') {
    const whereTable = p.args[0].at(-1).target.table;
    return prerequisites.concat(`
     ${p.target.table}(sourceKey, key, value) as (
      select  i.* from ${p.source.table} i
      join ${whereTable} o on i.key=o.key where o.value=1)`)
  }

  let key, sourceKey;
  if (isForEach && p.array) {
    sourceKey = p.source.table.includes('_') ? `i.sourceKey` : `json_extract(i.${p.source.column}, '$.id')`
    key = (p.source.table.includes('_') ? `i.key` : `json_extract(i.${p.source.column}, '$.id')`)   + ` || '_' || o.path `;
  } else {
    key = "i.key"
    sourceKey = "i.sourceKey"
  }

  let ret = `${p.target?.table}(sourceKey, key, value) as (select\n    ${sourceKey} as sourceKey,\n    ${key} as key,\n    `
  if (p.jsonPath && !p.array) {
    ret += `json_extract(i.value, '${p.jsonPath}') `
  } else {
    ret += `o.value `
  }
  ret += `from ${p.source?.table || JSON.stringify(p)} i `
  if (p.array) {
    ret += `join json_each(i.value, '${p.jsonPath}') o`
  }
  ret += "\n)"
  return prerequisites.concat([ret])
}

function queryAstToSql(ast) {
  const ctes = []
  if (ast.forEach) {
    ctes.push(
      ...ast.forEach.path
        .flatMap((p, i) => queryPathItemToSql(p, true))
    )
  }

  for (const c of ast.column ?? []) {
    ctes.push(...c.path.flatMap(queryPathItemToSql))
  }

  for (const s of ast.select ?? []) {
    ctes.push(...queryAstToSql(s))
  }

  const completeSelectSources =  (ast.select || []).concat(ast.column || [])
  let completeSelect = `\n    ${completeSelectSources[0].target.table} t0`
  for (let i = 1; i < completeSelectSources.length; i++) {
    completeSelect += `\n    join ${completeSelectSources[i].target.table} t${i} on (t${i-1}.key=t${i}.key)`
  }
  ctes.push(
    `${ast?.target?.table} as (select * from ${completeSelect})`,
  )
  return ctes
}

import {vd1} from "./views"
const o = viewDefinitionToQueryAst(vd1)
console.log(JSON.stringify(o, null, 2))
const q = queryAstToSql(o)
console.log(q.join(',\n'))
