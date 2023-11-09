import  * as sqlgen from './sql.js'
import {vd1} from "./views.js"
const o = sqlgen.viewDefinitionToQueryAst(vd1)
const q = sqlgen.queryAstToSql(o)

import { Database } from "bun:sqlite";
// import Database from 'better-sqlite3';

const db = new Database(":memory:");
db.run(`
CREATE TABLE Patient (
    id VARCHAR(64) PRIMARY KEY,
    value TEXT
);
`);

const patients = [{
  "resourceType": "Patient",
  "id": "1",
  "name": [
    {"text": "Alice Adams", "given": ["A1", "A2", "A3"], "family": "Adams"},
    {"text": "Azure Azams", "given": ["A4", "A5"], "family": "A", "use": "preferred"}
  ],
  "contact":[{
    "name": {"text": "Bob Bogart", "given": ["Bob2", "B2"], "family": "Bogart2"}
  },{
    "name": {"text": "Tom Bogart", "given": ["Tom", "T"], "family": "Bogart"}
  }]
}]

for (const p of patients) {
  db.run(`
    INSERT INTO Patient (id, value) VALUES ('${p.id}', '${JSON.stringify(p)}')`);
}

console.log("--------Data---------\n")
console.log(JSON.stringify(patients, null, 2))
console.log("--------View Definition---------\n")
console.log(JSON.stringify(vd1, null, 2))
console.log("--------AST---------\n")
console.log(JSON.stringify(o, null, 2))


// const query = db.query("select json_extract(value, '$.resourceType') rt from Patient");
// const result = query.all(); // => { message: "Hello world" }
let query = "with " + q.join(',\n') + "\n\nselect * from r";
console.log("----\n",query);
for (const [i, part] of q.entries()) {
    const qtab = part.trim().split(/[\s\(]/)[0];
    let query = "with " + q.slice(0, i+1).join(',\n') + "\n\nselect * from "+qtab;
    console.log("----\n##", qtab)
    const result = db.query(query).all()
    console.log(result)
}
