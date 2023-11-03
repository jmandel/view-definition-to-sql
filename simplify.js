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
      return [{ "fn": functionName, "args": args, type}];
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
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
    {
      column: [
        { path: 'id', name: 'id' },
        { path: 'gender', name: 'gender' },
        { path: 'birthDate', name: 'bd' },
      ],
    },
    {
      select: [
        {
          column: [
            {
              path: "managingOrganization.display",
              name: 'man',
            },
          ],
        }
      ],
    }, {
      forEach: 'name.given',
      select: [
        {
          column: [
            {
              path: "$this",
              name: 'given_name',
              description: 'A single given name field with all names joined together.',
            },
          ],
        }
      ],
    },
  ],
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
      target = "one_" + selectBlock.forEach.replace(".","_");
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
    const source = extraction.source === ast.start ? "P" : extraction.source;
    const joinGroups = [];

    let j = ""
    path.forEach(p => {
      if (p.navigation){
        j += "."+p.navigation
      }
      if (p.type.array) {
        joinGroups.push(j)
        j = "";
      }
    })
    j && joinGroups.push(j)

    const joins = joinGroups.map((j, i) => ({
      source: i === 0 ? source : target + "_segment_" + (i-1),
      target: i === joinGroups.length-1  ? target : target + "_segment_" + i,
      sourceCol: i === 0 ? sourceCol : "value",
      jsonPath: `$${j}`
    }))
    console.log(joins)

    sqlJoins.push(...joins.map(j => `json_each(${j.source}.${j.sourceCol}, '${j.jsonPath}') AS ${j.target}`));
  });

  // Combine all SQL components
  const sqlQuery = `SELECT\n    ${sqlSelect.join(",\n    ")}\n${sqlFrom.join("\n")}${sqlJoins.map(j => ",\n    "+j).join("")}`;
  return sqlQuery;
};

const o = viewDefinitionToAst(vd)
console.log(o)

const p = generateSqlFromAst(o)
console.log(p)
