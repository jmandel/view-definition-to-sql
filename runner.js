import  * as sqlgen from './sql.js'
import {vd1} from "./views.js"
const o = sqlgen.viewDefinitionToQueryAst(vd1)
console.log(JSON.stringify(o, null, 2))
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

db.run(`
INSERT INTO Patient (id, value) VALUES ('123', '
{
  "resourceType": "Patient",
  "id": "1",
  "name": [
    {"text": "Alice Adams", "given": ["Alice", "A", "AA"], "family": "Adams"},
    {"text": "Azure Azams", "given": ["Azure", "A"], "family": "A", "use": "preferred"},
    {"text": "Ayure Ayams", "given": ["Ayure", "A"], "family": "Ayams"}
  ],
  "contact":[{
    "name": {"text": "Bob Bogart", "given": ["Bob", "B"], "family": "Bogart"},
    "name": {"text": "Bob Bogart", "given": ["Bob", "B"], "family": "Bogart"}
  }]
}')`);

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
