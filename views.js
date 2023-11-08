const vd1 = {
  name: 'patient_demographics',
  resource: 'Patient',
  select: [
    {
      forEach: "contact.where(text='Josh')",
      column: [
        {
          path: 'name.given',
          name: 'given_name',
          description: 'A single given name field with all names joined together.',
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