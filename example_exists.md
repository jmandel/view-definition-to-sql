--------Data---------

```json
[
  {
    "resourceType": "Patient",
    "id": "1",
    "name": [
      {
        "text": "Alice Adams",
        "given": [
          "A1",
          "A2",
          "A3"
        ],
        "family": "Adams"
      },
      {
        "text": "Azure Azams",
        "given": [
          "A4",
          "A2"
        ],
        "family": "A",
        "use": "preferred"
      },
      {
        "text": "Azure Azams",
        "given": [
          "A4"
        ],
        "family": "A",
        "use": "preferred"
      }
    ],
    "contact": [
      {
        "name": {
          "text": "Bob Bogart",
          "given": [
            "Bob2",
            "B2"
          ],
          "family": "Bogart2"
        }
      },
      {
        "name": {
          "text": "Tom Bogart",
          "given": [
            "Tom",
            "T"
          ],
          "family": "Bogart"
        }
      }
    ]
  }
]
```
--------View Definition---------

```json
{
  "name": "patient_demographics",
  "resource": "Patient",
  "select": [
    {
      "forEach": "name.where(given.exists($this='A2'))",
      "column": [
        {
          "path": "given.exists($this='A1')",
          "name": "also_called_a1"
        }
      ]
    }
  ]
}
```
--------AST---------

```json
{
  "column": [],
  "select": [
    {
      "column": [
        {
          "name": "also_called_a1",
          "source": "r_s0_each",
          "path": [
            {
              "source": "r_s0_each",
              "target": "r_s0_col0_part0",
              "jsonPath": "$.given",
              "array": true,
              "walkIntoContext": true,
              "type": "hl7.fhir.r4.core#4.0.1/string"
            },
            {
              "source": "r_s0_col0_part0",
              "target": "r_s0_col0_part1",
              "op": "exists",
              "args": [
                [
                  {
                    "source": "r_s0_col0_part0",
                    "target": "r_s0_col0_part0_exists_arg0_part0",
                    "op": "=",
                    "args": [
                      [
                        {
                          "context": "$this",
                          "source": "r_s0_col0_part0",
                          "target": "r_s0_col0_part0_EQ_arg0_part0",
                          "type": "hl7.fhir.r4.core#4.0.1/string"
                        }
                      ],
                      [
                        {
                          "literal": "A1",
                          "source": "r_s0_col0_part0",
                          "target": "r_s0_col0_part0_EQ_arg1_part0"
                        }
                      ]
                    ]
                  }
                ]
              ]
            }
          ],
          "target": "r_s0_col0_part1"
        }
      ],
      "select": [],
      "source": "Patient",
      "target": "r_s0",
      "forEach": {
        "target": "r_s0_each",
        "source": "Patient",
        "path": [
          {
            "source": "Patient",
            "target": "Patient_r_s0_each_part0",
            "jsonPath": "$.name",
            "array": true,
            "walkIntoContext": true,
            "type": "hl7.fhir.r4.core#4.0.1/HumanName"
          },
          {
            "source": "Patient_r_s0_each_part0",
            "target": "r_s0_each",
            "type": "hl7.fhir.r4.core#4.0.1/HumanName",
            "op": "where",
            "args": [
              [
                {
                  "source": "Patient_r_s0_each_part0",
                  "target": "Patient_r_s0_each_part0_where_arg0_part0",
                  "jsonPath": "$.given",
                  "array": true,
                  "walkIntoContext": true,
                  "type": "hl7.fhir.r4.core#4.0.1/string"
                },
                {
                  "source": "Patient_r_s0_each_part0_where_arg0_part0",
                  "target": "Patient_r_s0_each_part0_where_arg0_part0_where_arg0_part1",
                  "op": "exists",
                  "args": [
                    [
                      {
                        "source": "Patient_r_s0_each_part0_where_arg0_part0",
                        "target": "Patient_r_s0_each_part0_where_arg0_part0_exists_arg0_part0",
                        "op": "=",
                        "args": [
                          [
                            {
                              "context": "$this",
                              "source": "Patient_r_s0_each_part0_where_arg0_part0",
                              "target": "Patient_r_s0_each_part0_where_arg0_part0_EQ_arg0_part0",
                              "type": "hl7.fhir.r4.core#4.0.1/string"
                            }
                          ],
                          [
                            {
                              "literal": "A2",
                              "source": "Patient_r_s0_each_part0_where_arg0_part0",
                              "target": "Patient_r_s0_each_part0_where_arg0_part0_EQ_arg1_part0"
                            }
                          ]
                        ]
                      }
                    ]
                  ]
                }
              ]
            ]
          }
        ]
      }
    }
  ],
  "source": "Patient",
  "target": "r"
}
```
----

```sql
 with Patient_r_s0_each_part0(sourceKey, key, value) as (select
    json_extract(i.value, '$.id')  as sourceKey,
    json_extract(i.value, '$.id') || '_' || o.fullkey  as key,
   o.value from Patient i join json_each(i.value, '$.name') o
),
Patient_r_s0_each_part0_where_arg0_part0(sourceKey, key, value) as (select
    i.key as sourceKey,
    i.key || '_' || o.fullkey  as key,
   o.value from Patient_r_s0_each_part0 i join json_each(i.value, '$.given') o
),
Patient_r_s0_each_part0_where_arg0_part0_EQ_arg0_part0 as (select * from Patient_r_s0_each_part0_where_arg0_part0),
Patient_r_s0_each_part0_where_arg0_part0_EQ_arg1_part0 as (select i.sourceKey, i.key, 'A2' as value from Patient_r_s0_each_part0_where_arg0_part0 i),
Patient_r_s0_each_part0_where_arg0_part0_exists_arg0_part0 as (select i.sourceKey, i.key, (i.value=o.value) as value
      from Patient_r_s0_each_part0_where_arg0_part0_EQ_arg0_part0 i join Patient_r_s0_each_part0_where_arg0_part0_EQ_arg1_part0 o on (i.key=o.key)),
Patient_r_s0_each_part0_where_arg0_part0_where_arg0_part1(sourceKey, key, value) as (
      select  i.sourceKey, i.sourceKey, 
      (SELECT CASE WHEN EXISTS (select 1 from Patient_r_s0_each_part0_where_arg0_part0_exists_arg0_part0 o where o.sourceKey=i.sourceKey and o.value=1) THEN 1 ELSE 0 END) 
      from Patient_r_s0_each_part0_where_arg0_part0 i
      group by i.sourceKey
      ),
r_s0_each(sourceKey, key, value) as (
      select  i.* from Patient_r_s0_each_part0 i
      left join Patient_r_s0_each_part0_where_arg0_part0_where_arg0_part1 o on (i.key=o.sourceKey ) where o.value=1),
r_s0_col0_part0(sourceKey, key, value) as (select
    i.key as sourceKey,
    i.key || '_' || o.fullkey  as key,
   o.value from r_s0_each i join json_each(i.value, '$.given') o
),
r_s0_col0_part0_EQ_arg0_part0 as (select * from r_s0_col0_part0),
r_s0_col0_part0_EQ_arg1_part0 as (select i.sourceKey, i.key, 'A1' as value from r_s0_col0_part0 i),
r_s0_col0_part0_exists_arg0_part0 as (select i.sourceKey, i.key, (i.value=o.value) as value
      from r_s0_col0_part0_EQ_arg0_part0 i join r_s0_col0_part0_EQ_arg1_part0 o on (i.key=o.key)),
r_s0_col0_part1(sourceKey, key, value) as (
      select  i.sourceKey, i.sourceKey, 
      (SELECT CASE WHEN EXISTS (select 1 from r_s0_col0_part0_exists_arg0_part0 o where o.sourceKey=i.sourceKey and o.value=1) THEN 1 ELSE 0 END) 
      from r_s0_col0_part0 i
      group by i.sourceKey
      ),
r_s0 as (select f.sourceKey as key, f.sourceKey as sourceKey, t0.value as also_called_a1 from r_s0_each f join 
    r_s0_col0_part1 t0 on f.key=t0.sourceKey),
r as (select t0.sourceKey as key, t0.sourceKey as sourceKey, t0.also_called_a1 as also_called_a1 from 
    r_s0 t0)

select * from r
```
----
## Patient_r_s0_each_part0

```json
[
  {
    "sourceKey": "1",
    "key": "1_$.name[0]",
    "value": "{\"text\":\"Alice Adams\",\"given\":[\"A1\",\"A2\",\"A3\"],\"family\":\"Adams\"}"
  },
  {
    "sourceKey": "1",
    "key": "1_$.name[1]",
    "value": "{\"text\":\"Azure Azams\",\"given\":[\"A4\",\"A2\"],\"family\":\"A\",\"use\":\"preferred\"}"
  },
  {
    "sourceKey": "1",
    "key": "1_$.name[2]",
    "value": "{\"text\":\"Azure Azams\",\"given\":[\"A4\"],\"family\":\"A\",\"use\":\"preferred\"}"
  }
]
```
----
## Patient_r_s0_each_part0_where_arg0_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": "A3"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": "A4"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[2]",
    "key": "1_$.name[2]_$.given[0]",
    "value": "A4"
  }
]
```
----
## Patient_r_s0_each_part0_where_arg0_part0_EQ_arg0_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": "A3"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": "A4"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[2]",
    "key": "1_$.name[2]_$.given[0]",
    "value": "A4"
  }
]
```
----
## Patient_r_s0_each_part0_where_arg0_part0_EQ_arg1_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[2]",
    "key": "1_$.name[2]_$.given[0]",
    "value": "A2"
  }
]
```
----
## Patient_r_s0_each_part0_where_arg0_part0_exists_arg0_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": 0
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": 1
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": 0
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": 0
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": 1
  },
  {
    "sourceKey": "1_$.name[2]",
    "key": "1_$.name[2]_$.given[0]",
    "value": 0
  }
]
```
----
## Patient_r_s0_each_part0_where_arg0_part0_where_arg0_part1
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]",
    "value": 1
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]",
    "value": 1
  },
  {
    "sourceKey": "1_$.name[2]",
    "key": "1_$.name[2]",
    "value": 0
  }
]
```
----
## r_s0_each
```json
[
  {
    "sourceKey": "1",
    "key": "1_$.name[0]",
    "value": "{\"text\":\"Alice Adams\",\"given\":[\"A1\",\"A2\",\"A3\"],\"family\":\"Adams\"}"
  },
  {
    "sourceKey": "1",
    "key": "1_$.name[1]",
    "value": "{\"text\":\"Azure Azams\",\"given\":[\"A4\",\"A2\"],\"family\":\"A\",\"use\":\"preferred\"}"
  }
]
```
----
## r_s0_col0_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": "A3"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": "A4"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": "A2"
  }
]
```
----
## r_s0_col0_part0_EQ_arg0_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": "A2"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": "A3"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": "A4"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": "A2"
  }
]
```
----
## r_s0_col0_part0_EQ_arg1_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": "A1"
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": "A1"
  }
]
```
----
## r_s0_col0_part0_exists_arg0_part0
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[0]",
    "value": 1
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[1]",
    "value": 0
  },
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]_$.given[2]",
    "value": 0
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[0]",
    "value": 0
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]_$.given[1]",
    "value": 0
  }
]
```
----
## r_s0_col0_part1
```json
[
  {
    "sourceKey": "1_$.name[0]",
    "key": "1_$.name[0]",
    "value": 1
  },
  {
    "sourceKey": "1_$.name[1]",
    "key": "1_$.name[1]",
    "value": 0
  }
]
```
----
## r_s0
```json
[
  {
    "key": "1",
    "sourceKey": "1",
    "also_called_a1": 1
  },
  {
    "key": "1",
    "sourceKey": "1",
    "also_called_a1": 0
  }
]
```
----
## r
```json
[
  {
    "key": "1",
    "sourceKey": "1",
    "also_called_a1": 1
  },
  {
    "key": "1",
    "sourceKey": "1",
    "also_called_a1": 0
  }
]
```
