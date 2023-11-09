const vd1 = {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
    {
      column: [
        {
          path: "name.given.where($this > 4)",
          name: 'patient_j_name',
        },
      {
          path: 'family2',
          name: 'contact_family_name',
        }
      ],
      select: [{
        column: [{
          path: "'inside_val'",
          name: 'inside'
        },{
          path: 'family3',
          name: 'contact_family_name',
        }]

      }]
    }
  ],
}
const vd3 = {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
    {
      forEach: "name",
      column: [
        {
          path: 'name.family',
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
      forEach: "contact.where(name.text='Josh')",
      column: [
        {
          path: 'name.family',
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