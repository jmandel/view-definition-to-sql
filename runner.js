import  * as sqlgen from './sql'
import {vd1} from "./views"
const o = sqlgen.viewDefinitionToQueryAst(vd1)
console.log(JSON.stringify(o, null, 2))
const q = sqlgen.queryAstToSql(o)

import { Database } from "bun:sqlite";
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
    {"text": "Ayure Ayams", "given": ["Ayure", "A"], "family": "Ayams"},
    {"text": "Azure Azams", "given": ["Azure", "A"], "family": "A"}
  ],
  "contact":[{
    "name": {"text": "Bob Bogart", "given": ["Bob", "B"], "family": "Bogart"}
  }]
}')`);

// const query = db.query("select json_extract(value, '$.resourceType') rt from Patient");
// const result = query.all(); // => { message: "Hello world" }
let query = "with " + q.join(',\n') + "\n\nselect * from result";
// query = "with " + q.join(',\n') + "\n\nselect * from Patient_result_s0_each_part0";
console.log("-f---\n",query);
for (const part of q) {
    const qtab = part.trim().split(/[\s\(]/)[0];
    let query = "with " + q.join(',\n') + "\n\nselect * from "+qtab;
    const result = db.query(query).all()
    console.log(qtab, result)
}
