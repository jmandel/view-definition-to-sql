const vd1= {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
   {
      forEach: "name.where(given.exists($this='A2'))",
      column: [
        {
          path: "name.given.exists($this='A1')",
          name: 'also_called_a1',
        },
      ],
    }, 
  ],
}
const vd12= {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
   {
      forEach: "name.where(given.exists($this='A2'))",
      column: [
        {
          path: "given.exists($this='A1')",
          name: 'also_called_a1',
        },
      ],
    }, 
  ],
}
const vdr = {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [{
      forEach: "name",
      column: [
        {
          path: 'family',
          name: 'patient_family_name',
        },
      ],
    }, {
      forEach: "contact",
      column: [
        {
          path: "name.family",
          name: 'contact_family_name',
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
      forEach: "name",
      column: [
        {
          path: 'family',
          name: 'patient_family_name',
        },
      ],
      select: [{
        forEach: "given",
        column: [{
          path: '$this',
          name: 'patient_given'
        }]
      }]
    },{
      forEach: "contact.where(name.text='Bob Bogart')",
      column: [
        {
          path: 'name.family',
          name: 'contact_family_name',
        },
      ],
    },
  ],
}
const vd3 = {
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

export {vd1, vd2}