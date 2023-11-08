import fhirpath from "fhirpath";

const schema = (await Bun.file("./fhir-schema.ndjson").text()).split("\n").filter(l => !!l).map(l => JSON.parse(l))
//console.log(schema.filter(l => l.id==="Patient"))


const expr = "name.where(given.exists($this.startswith('J')))"
const tree = fhirpath.parse(expr);
//console.log(JSON.stringify(tree, null, 2))
const simpler = simplify(tree, "Patient");
console.log(JSON.stringify(simpler, null, 2))

function simplify(node, type = null) {

  switch (node.type) {
    case undefined:
    case 'EntireExpression':
    case 'ParenthesizedTerm':
      return simplify(node.children[0], type);
    case 'AndExpression':
    case 'OrExpression':
    case 'UnionExpression':
      return [{fn: node.terminalNodeText, args: node.children.map(simplify, type)}]
    case 'InvocationExpression':
      if (node.terminalNodeText[0] === '.') {
        const beforeNavigation = simplify(node.children[0], type);
        const navigationNode = simplify(node.children[1], beforeNavigation.at(-1).type);
        return beforeNavigation.concat(navigationNode);
      }
      break;
    case 'TermExpression':
      if (node.children.length === 1) {
        return simplify(node.children[0], type);
      }
      break;
    case 'InvocationTerm':
      if (node.children.length === 1) {
        return simplify(node.children[0], type);
      }
      break;
    case 'MemberInvocation':
      if (node.children.length === 1) {
        return simplify(node.children[0], type);
      }
      break;
    case 'Identifier':
      return [{ "navigation": node.terminalNodeText[0], type: resolveType(type, node.terminalNodeText[0]) }];
    case 'FunctionInvocation':
      const functionName = node.children[0].children[0].terminalNodeText[0];
      const args = (node.children[0].children[1]?.children || []).map(param => simplify(param, type));
      return [{ "fn": functionName, "args": args, type: ["where", "first"].includes(functionName) ? type : null}];
    case 'InequalityExpression':
    case 'EqualityExpression':
      const operator = node.terminalNodeText[0];
      const leftOperand = simplify(node.children[0], type);
      const rightOperand = simplify(node.children[1], type);
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

function resolveType(t, s){
  let st =  (typeof t === 'string') ? schema.filter(s => s.id == t).at(0) : t;
  if (st?.type && !st?.elements) {
    st = schema.filter(s => s.type == st.type).at(0);
  }
  st = st?.elements?.[s]
  return st
}

function fpparse(q, type) {
  return simplify(fhirpath.parse(q), type);
}

const vd = {
    "name": "patient_demographics",
    "resource": "Patient",
    "select": [
        {
            "column": [
                {
                    "path": "getResourceKey()",
                    "name": "id"
                },
                {
                    "path": "gender",
                    "name": "gender"
                }
            ]
        },
        {
            "forEach": "name.where(use = 'official').where(text ~ 'J').first()",
            "column": [
                {
                    "path": "given.join(' ')",
                    "name": "given_name",
                    "description": "A single given name field with all names joined together."
                },
                {
                    "path": "family",
                    "name": "family_name"
                }
            ]
        }
    ]
}

function viewDefinitionToAst(viewDefinition) {
  // Initialize the intermediate structure
  const ast = {
    start: viewDefinition.resource,
    extractions: [],
    selections: []
  };

  // Helper function to handle the select block in the ViewDefinition
  function handleSelect(selectBlock, parentTarget = null, type = null) {
    // Handle the column in the select block
    (selectBlock.column || []).forEach(column => {
      // Extract the path using the fpparse function
      const path = fpparse(column.path, type || viewDefinition.resource);
      // Append to the selections list in the AST
      ast.selections.push({
        source: parentTarget || viewDefinition.resource,
        sourceCol: parentTarget ? "value" : "json",
        path: path,
        target: column.name
      });
    });

    let target = parentTarget;
    let targetType = type;
    if (selectBlock.forEach) {
      const path = fpparse(selectBlock.forEach, type || viewDefinition.resource);
      // Determine the new target for the extraction
      target = "one_" + selectBlock.forEach.replaceAll(/[^A-Za-z]/ig, "_");
      targetType = path.at(-1).type
      // Append to the extractions list in the AST
      ast.extractions.push({
        source: parentTarget || viewDefinition.resource,
        sourceCol: parentTarget ? "value" : "json",
        path: path,
        target: target
      });
    }

    // Handle any nested select blocks inside the forEach block
    if (selectBlock.select) {
      selectBlock.select.forEach(nestedSelect => {
        handleSelect(nestedSelect, target, targetType);
      });
    }

  }

  viewDefinition.select?.forEach(selectBlock => {
    handleSelect(selectBlock);
  });


  return ast;
}

const flattenFhirpath = (source, target, pathArray) => {

  console.log("PA", pathArray);
  const ret = []

  let expr = "";
  for (const [i, p] of pathArray.entries()){
    if (p.literal) {
      ret.push({
        literal: p.literal,
        source: {},
        target: {}
      });
    }
    if (p.navigation) {
      expr += "." + p.navigation;
      if (p.type?.array){
        ret.push({
          source: ret.length === 0 ? source : ret.at(-1).target,
          target: {table: target + "_segment_" + ret.length, column: "value"},
          jsonPath: `$${expr}`,
          restrictions: []
        })
        expr = "";
      }
    }

    if (p.fn) {
      const context = ret;
      let source2 = ret.length === 0 ? source : ret.at(-1).target;
      const fn = {
        source: source2,
        target: {table: source2.table + '_fn_' + p.fn, column: 'value' },
        jsonPath: expr ? `$${expr}` : undefined,
        op: p.fn,
        args: p.args.map(a => flattenFhirpath(source2, target, a || []))
      }
      context.push(fn)
      //context.subquery = flattenFhirpath(source2, target, pathArray.slice(1+i))
      //break;
    }
  }

  if (ret.length) {
    console.log(ret)
    ret.at(-1).target.table = target;
  }

  console.log("Simplified", JSON.stringify(ret, null, 2))
  return ret;

}

const generateSqlFromAst = (ast) => {
  // Initialize the SQL components
  const sqlSelect = [];
  const sqlFrom = [`FROM\n    ${ast.start} P`];
  const sqlJoins = [];

  // Handle the selections
  ast.selections.forEach((selection) => {
    // Construct the SQL SELECT part
    const { sourceCol, path, target } = selection;
    const source = selection.source === ast.start ? "P" : selection.source;
    if (path[0]?.context === "$this" && path.length === 1) {
      sqlSelect.push(`${source}.${sourceCol} AS ${target}`);
    }
    else {
      sqlSelect.push(`json_extract(${source}.${sourceCol}, '$${path.filter(p => p.navigation).map(p => "."+p.navigation).join("")}') AS ${target}`);
    }
  });

  // Handle the extractions
  ast.extractions.forEach((extraction) => {
    // Construct the SQL JOIN part
    const { sourceCol, path, target } = extraction;
    console.log(sourceCol, path)
    const source = extraction.source === ast.start ? "P" : extraction.source;
    const joins = flattenFhirpath({table: source, column: sourceCol}, target, path);

    sqlJoins.push(...joins.map(j => `json_each(${j.source}.${j.sourceCol}, '${j.jsonPath}') AS ${j.target} ${j.where ? `on ${j.target}.${j.where[0].args?.[0]?.[0].navigation} ${j.where[0].fn} ${JSON.stringify(j.where[0]?.args?.[1][0].literal)}`: ""}`));
  });

  // Combine all SQL components
  const sqlQuery = `SELECT\n    ${sqlSelect.join(",\n    ")}\n${sqlFrom.join("\n")}${sqlJoins.map(j => ",\n    "+j).join("")}`;
  return sqlQuery;
};

let counter = {}
function unique(n){
  counter[n] = counter[n] ? counter[n]+1 : 0;
  return n + (counter[n] > 0 ? counter[n] : "")
};
function pathToAst(pathArray, parent = null) {
  const ret = []
  //let source = parent?.forEach?.source ??  parent?.source;

  const source = parent?.forEach ? {table: parent?.forEach?.path?.at(-1)?.target?.table} : {table: parent.source?.table};
  let expr = "";
  console.log("PA", pathArray);
  for (const [i, p] of pathArray.entries()){
    if (p.literal) {
      ret.push({
        literal: p.literal,
        source,
        target: {}
      });
    }
    if (p.navigation) {
      expr += "." + p.navigation;
      if (p.type?.array){
        ret.push({
          source: ret.length === 0 ? source : ret.at(-1).target,
          target: {table: source.table+ "_segment_" + ret.length, column: "value"},
          jsonPath: `$${expr}`,
          restrictions: []
        })
        expr = "";
      }
    }

    if (p.fn) {
      const context = ret;
      let source2 = ret.length === 0 ? source : ret.at(-1).target;
      const fn = {
        source: source2,
        target: {table: source2?.table + '_fn_' + p.fn, column: 'value' },
        jsonPath: expr ? `$${expr}` : undefined,
        op: p.fn,
        args: p.args.map(a => pathToAst(a, {source:source2}))
      }
      context.push(fn)
      //context.subquery = flattenFhirpath(source2, target, pathArray.slice(1+i))
      //break;
    }
  }

  if (expr) {
    ret.push({
      source: ret.length === 0 ? source : ret.at(-1).target,
      target: {table:"continued-target"},
      jsonPath: `$${expr}`
    })

  }

  console.log("Simplified", JSON.stringify(ret, null, 2))
  return ret;

}
function toAst2(viewDefinition) {
  // Helper function to handle the select block in the ViewDefinition
  function handleSelect(parent, selectBlock,  type = null) {
    let targetType = type;
    if (selectBlock.forEach) {
      const path = fpparse(selectBlock.forEach, type || viewDefinition.resource);
      // Determine the new target for the extraction
      targetType = path.at(-1).type;
      // Append to the extractions list in the AST
      parent.forEach = {
        source: parent.source,
        path: pathToAst(path, parent),
      };

      const added = parent.forEach;
    }
    // Handle the column in the select block
    (selectBlock.column || []).forEach(column => {
      // Extract the path using the fpparse function
      const path = fpparse(column.path, type || viewDefinition.resource);
      const source = parent?.forEach ? {table:parent?.forEach?.path?.at(-1)?.target?.table} : {table: parent.source.table};
      // Append to the selections list in the AST
      parent.column.push({
        source: source,
        path: pathToAst(path, parent),
        target: {table: unique(source.table+ "_" + column.name), column: column.name}
      });
      parent.column.at(-1).path.at(-1).target = parent.column.at(-1).target;
    });
    // Handle any nested select blocks inside the forEach block
    if (selectBlock.select) {
      selectBlock.select.forEach(nestedSelect => {
        handleSelect({source: parent.forEach ?? parent.source}, nestedSelect, targetType);
      });
    }

    return parent
  }


  let select = viewDefinition.select?.map(selectBlock => 
    handleSelect({
    source: {table: viewDefinition.resource, column: 'value'},
    forEach: null,
    column: [],
    select: [],
  }, selectBlock)
  );


  return {source: viewDefinition.resource, select};
}

const o = toAst2(vd)
console.log(JSON.stringify(o, null, 2))

//const p = generateSqlFromAst(o)
//console.log(p)



