import {fpparse} from './simplify.js'

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
  let haveAnchoredForEach = false; 
  let expr = ''
  let target
  let source
  for (const [i, p] of pathArray.entries()) {
    source = ret.length === 0 ? incomingSource : ret.at(-1).target
    target =  (parent.targetPrefix || source) + "_" +(nameHint) + (i >= 0 ? `_part${i}`: "");
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
        type: p?.type?.type
      })
    }
    if (p.navigation) {
      expr += '.' + p.navigation
        ret.push({
          source,
          target,
          jsonPath: `$${expr}`,
          array: p?.type?.array,
          forEachAnchor: !haveAnchoredForEach,
          type: p?.type?.type
        })
      haveAnchoredForEach = true;
      expr = ''
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

  return ret
}

export function viewDefinitionToQueryAst(viewDefinition) {
  const blockTemplateEmpty = () => ({ column: [], select: [] })

  // TODO: make this return ASTs rather than mutating them
  function handleSelect(parent, selectBlock, type = null) {
    let targetType = type
    if (selectBlock.forEach) {
      const path = fpparse(selectBlock.forEach, type)
      targetType = path.at(-1).type
      parent.forEach = {
        target:  parent.target+"_each",
        source: parent.source,
        path: pathToAst(path, parent, parent.target+"_each"),
      }
      parent.forEach.path.at(-1).target = parent.forEach.target 
    }

    const source = parent?.forEach ? parent?.forEach?.path?.at(-1)?.target : parent.source
    ;(selectBlock.column || []).forEach((column, i) => {
      const path = fpparse(column.path, targetType)
      console.log("Checking cou", column.name, targetType, path)
      // Append to the selections list in the AST
      parent.column.push({
        name: column.name,
        source,
        path: pathToAst(path, {source, targetPrefix: parent.target}, "col"+i),
      })
      parent.column.at(-1).target = parent.column.at(-1).path.at(-1).target
    })

    if (selectBlock.select) {
      selectBlock.select.forEach((nestedSelect, i) => {
        const blockTemplate = {
          ...blockTemplateEmpty(),
          source,
          target:  parent.target+ `_s${i}` ,
        }
        handleSelect(blockTemplate, nestedSelect, targetType)
        parent.select.push(blockTemplate)
      })
    }
  }

  const blockTemplate = {
    ...blockTemplateEmpty(),
    source:  viewDefinition.resource,
    target:  "r"
  }
  handleSelect(blockTemplate, viewDefinition, viewDefinition.resource)
  return blockTemplate
}

function queryPathItemToSql(p, isForEach) {
  let prerequisites = (p.args || []).flatMap(a => a.flatMap(queryPathItemToSql));

  if (p.context === "$this") {
    return prerequisites.concat([`${p.target} as (select * from ${p.source})`])
  }

  if (p.literal) {
    return prerequisites.concat([`${p.target} as (select i.sourceKey, i.key, '${p.literal}' as value from ${p.source} i)`])
  }

  if (p.op === '~' || p.op === '=') {
    return prerequisites.concat([`${p.target} as (select i.sourceKey, i.key, (i.value=o.value) as value
      from ${p.args[0].at(-1).target} i join ${p.args[1].at(-1).target} o on (i.key=o.key))`])
  }

  if (p.op === 'exists') {
    const existsTable = p.args[0].at(-1).target;
    return prerequisites.concat(`${p.target}(sourceKey, key, value) as (
      select  i.sourceKey, i.key, ${p.jsonPath ? `json_extract(i.value, '${p.jsonPath}')` : `i.value`} from ${p.source} i
      where exists(select 1 from ${existsTable} e where e.key=i.key  and e.value = 1))`)
  }

  if (p.op === 'where') {
    const whereTable = p.args[0].at(-1).target;
    return prerequisites.concat(`${p.target}(sourceKey, key, value) as (
      select  i.* from ${p.source} i
      left join ${whereTable} o on i.key=o.sourceKey)`)
  }

  // TODO Lots more ops

  // Default case: a simple navigation step
  let key, sourceKey;
  if (p.forEachAnchor && isForEach) {
    sourceKey = p.source.includes('_') ? `i.key` : `json_extract(i.value, '$.id') `
  } else {
    sourceKey = p.source.includes('_') ? "i.sourceKey" : `json_extract(i.value, '$.id') `
  }

  if (p.array) {
    key = (p.source.includes('_') ? `i.key` : `json_extract(i.value, '$.id')`)   + ` || '_' || o.fullkey `;
  } else {
    key = "i.key"
  }

  let ret = `${p.target}(sourceKey, key, value) as (select\n    ${sourceKey} as sourceKey,\n    ${key} as key,\n   `
  if (p.jsonPath && !p.array) {
    ret += `json_extract(i.value, '${p.jsonPath}') `
  } else {
    ret += `o.value `
  }
  ret += `from ${p.source || JSON.stringify(p)} i `
  if (p.array) {
    ret += `join json_each(i.value, '${p.jsonPath}') o`
  }
  ret += "\n)"
  return prerequisites.concat([ret])
}

export function queryAstToSql(ast) {
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

  function walkColumns(s) {
    return (s.column || []).concat((s.select || []).flatMap(walkColumns))
  }
  
  const columns = []
  const joins = []
  for (const c of ast.column || []) {
    const tnum = joins.length;
    joins.push([`${c.target}`, tnum])
    columns.push(`t${tnum}.value as ${c.name}`)
  }
  for (const s of ast.select || []) {
    const tnum = joins.length;
    joins.push([`${s.target}`, tnum])
    for (const c of walkColumns(s)) {
      columns.push(`t${tnum}.${c.name} as ${c.name}`)
    }
  }

  let [t0, i0] = joins[0];
  let completeSelect = `\n    ${t0} t${i0}`
  for (const [t, i] of joins.slice(1)) {
    completeSelect += `\n    join ${t} t${i} on (t${i-1}.key=t${i}.key)`
  }
  ctes.push( 
    `${ast?.target} as (select t0.sourceKey as key, t0.sourceKey as sourceKey, ${columns.join(", ")} from ${completeSelect})`,
  )
  return ctes
}
