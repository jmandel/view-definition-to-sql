# Example output

Expression: 

    cPatient.where(text ~ 'Josh').name.where($this.title.substring(3, 2, 1).startsWith('J')).given


## Simplified Parse Tree
```json
[
  {
    "navigation": "Patient",
    "array": false
  },
  {
    "fn": "where",
    "args": [
      [
        {
          "fn": "~",
          "args": [
            [
              {
                "navigation": "text",
                "array": false
              }
            ],
            [
              {
                "literal": "Josh"
              }
            ]
          ]
        }
      ]
    ]
  },
  {
    "navigation": "name",
    "array": false
  },
  {
    "fn": "where",
    "args": [
      [
        {
          "context": "$this"
        },
        {
          "navigation": "title",
          "array": false
        },
        {
          "fn": "substring",
          "args": [
            [
              {
                "literal": "3"
              }
            ],
            [
              {
                "literal": "2"
              }
            ],
            [
              {
                "literal": "1"
              }
            ]
          ]
        },
        {
          "fn": "startsWith",
          "args": [
            [
              {
                "literal": "J"
              }
            ]
          ]
        }
      ]
    ]
  },
  {
    "navigation": "given",
    "array": false
  }
]
```


## Raw Parse Tree
```
{
  "children": [
    {
      "type": "EntireExpression",
      "text": "Patient.where(text~'Josh').name.where($this.title.substring(3,2,1).startsWith('J')).given<EOF>",
      "terminalNodeText": [
        "<EOF>"
      ],
      "children": [
        {
          "type": "InvocationExpression",
          "text": "Patient.where(text~'Josh').name.where($this.title.substring(3,2,1).startsWith('J')).given",
          "terminalNodeText": [
            "."
          ],
          "children": [
            {
              "type": "InvocationExpression",
              "text": "Patient.where(text~'Josh').name.where($this.title.substring(3,2,1).startsWith('J'))",
              "terminalNodeText": [
                "."
              ],
              "children": [
                {
                  "type": "InvocationExpression",
                  "text": "Patient.where(text~'Josh').name",
                  "terminalNodeText": [
                    "."
                  ],
                  "children": [
                    {
                      "type": "InvocationExpression",
                      "text": "Patient.where(text~'Josh')",
                      "terminalNodeText": [
                        "."
                      ],
                      "children": [
                        {
                          "type": "TermExpression",
                          "text": "Patient",
                          "terminalNodeText": [],
                          "children": [
                            {
                              "type": "InvocationTerm",
                              "text": "Patient",
                              "terminalNodeText": [],
                              "children": [
                                {
                                  "type": "MemberInvocation",
                                  "text": "Patient",
                                  "terminalNodeText": [],
                                  "children": [
                                    {
                                      "type": "Identifier",
                                      "text": "Patient",
                                      "terminalNodeText": [
                                        "Patient"
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "type": "FunctionInvocation",
                          "text": "where(text~'Josh')",
                          "terminalNodeText": [],
                          "children": [
                            {
                              "type": "Functn",
                              "text": "where(text~'Josh')",
                              "terminalNodeText": [
                                "(",
                                ")"
                              ],
                              "children": [
                                {
                                  "type": "Identifier",
                                  "text": "where",
                                  "terminalNodeText": [
                                    "where"
                                  ]
                                },
                                {
                                  "type": "ParamList",
                                  "text": "text~'Josh'",
                                  "terminalNodeText": [],
                                  "children": [
                                    {
                                      "type": "EqualityExpression",
                                      "text": "text~'Josh'",
                                      "terminalNodeText": [
                                        "~"
                                      ],
                                      "children": [
                                        {
                                          "type": "TermExpression",
                                          "text": "text",
                                          "terminalNodeText": [],
                                          "children": [
                                            {
                                              "type": "InvocationTerm",
                                              "text": "text",
                                              "terminalNodeText": [],
                                              "children": [
                                                {
                                                  "type": "MemberInvocation",
                                                  "text": "text",
                                                  "terminalNodeText": [],
                                                  "children": [
                                                    {
                                                      "type": "Identifier",
                                                      "text": "text",
                                                      "terminalNodeText": [
                                                        "text"
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "type": "TermExpression",
                                          "text": "'Josh'",
                                          "terminalNodeText": [],
                                          "children": [
                                            {
                                              "type": "LiteralTerm",
                                              "text": "'Josh'",
                                              "terminalNodeText": [],
                                              "children": [
                                                {
                                                  "type": "StringLiteral",
                                                  "text": "'Josh'",
                                                  "terminalNodeText": [
                                                    "'Josh'"
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "type": "MemberInvocation",
                      "text": "name",
                      "terminalNodeText": [],
                      "children": [
                        {
                          "type": "Identifier",
                          "text": "name",
                          "terminalNodeText": [
                            "name"
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "type": "FunctionInvocation",
                  "text": "where($this.title.substring(3,2,1).startsWith('J'))",
                  "terminalNodeText": [],
                  "children": [
                    {
                      "type": "Functn",
                      "text": "where($this.title.substring(3,2,1).startsWith('J'))",
                      "terminalNodeText": [
                        "(",
                        ")"
                      ],
                      "children": [
                        {
                          "type": "Identifier",
                          "text": "where",
                          "terminalNodeText": [
                            "where"
                          ]
                        },
                        {
                          "type": "ParamList",
                          "text": "$this.title.substring(3,2,1).startsWith('J')",
                          "terminalNodeText": [],
                          "children": [
                            {
                              "type": "InvocationExpression",
                              "text": "$this.title.substring(3,2,1).startsWith('J')",
                              "terminalNodeText": [
                                "."
                              ],
                              "children": [
                                {
                                  "type": "InvocationExpression",
                                  "text": "$this.title.substring(3,2,1)",
                                  "terminalNodeText": [
                                    "."
                                  ],
                                  "children": [
                                    {
                                      "type": "InvocationExpression",
                                      "text": "$this.title",
                                      "terminalNodeText": [
                                        "."
                                      ],
                                      "children": [
                                        {
                                          "type": "TermExpression",
                                          "text": "$this",
                                          "terminalNodeText": [],
                                          "children": [
                                            {
                                              "type": "InvocationTerm",
                                              "text": "$this",
                                              "terminalNodeText": [],
                                              "children": [
                                                {
                                                  "type": "ThisInvocation",
                                                  "text": "$this",
                                                  "terminalNodeText": [
                                                    "$this"
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "type": "MemberInvocation",
                                          "text": "title",
                                          "terminalNodeText": [],
                                          "children": [
                                            {
                                              "type": "Identifier",
                                              "text": "title",
                                              "terminalNodeText": [
                                                "title"
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "type": "FunctionInvocation",
                                      "text": "substring(3,2,1)",
                                      "terminalNodeText": [],
                                      "children": [
                                        {
                                          "type": "Functn",
                                          "text": "substring(3,2,1)",
                                          "terminalNodeText": [
                                            "(",
                                            ")"
                                          ],
                                          "children": [
                                            {
                                              "type": "Identifier",
                                              "text": "substring",
                                              "terminalNodeText": [
                                                "substring"
                                              ]
                                            },
                                            {
                                              "type": "ParamList",
                                              "text": "3,2,1",
                                              "terminalNodeText": [
                                                ",",
                                                ","
                                              ],
                                              "children": [
                                                {
                                                  "type": "TermExpression",
                                                  "text": "3",
                                                  "terminalNodeText": [],
                                                  "children": [
                                                    {
                                                      "type": "LiteralTerm",
                                                      "text": "3",
                                                      "terminalNodeText": [],
                                                      "children": [
                                                        {
                                                          "type": "NumberLiteral",
                                                          "text": "3",
                                                          "terminalNodeText": [
                                                            "3"
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "type": "TermExpression",
                                                  "text": "2",
                                                  "terminalNodeText": [],
                                                  "children": [
                                                    {
                                                      "type": "LiteralTerm",
                                                      "text": "2",
                                                      "terminalNodeText": [],
                                                      "children": [
                                                        {
                                                          "type": "NumberLiteral",
                                                          "text": "2",
                                                          "terminalNodeText": [
                                                            "2"
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "type": "TermExpression",
                                                  "text": "1",
                                                  "terminalNodeText": [],
                                                  "children": [
                                                    {
                                                      "type": "LiteralTerm",
                                                      "text": "1",
                                                      "terminalNodeText": [],
                                                      "children": [
                                                        {
                                                          "type": "NumberLiteral",
                                                          "text": "1",
                                                          "terminalNodeText": [
                                                            "1"
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "type": "FunctionInvocation",
                                  "text": "startsWith('J')",
                                  "terminalNodeText": [],
                                  "children": [
                                    {
                                      "type": "Functn",
                                      "text": "startsWith('J')",
                                      "terminalNodeText": [
                                        "(",
                                        ")"
                                      ],
                                      "children": [
                                        {
                                          "type": "Identifier",
                                          "text": "startsWith",
                                          "terminalNodeText": [
                                            "startsWith"
                                          ]
                                        },
                                        {
                                          "type": "ParamList",
                                          "text": "'J'",
                                          "terminalNodeText": [],
                                          "children": [
                                            {
                                              "type": "TermExpression",
                                              "text": "'J'",
                                              "terminalNodeText": [],
                                              "children": [
                                                {
                                                  "type": "LiteralTerm",
                                                  "text": "'J'",
                                                  "terminalNodeText": [],
                                                  "children": [
                                                    {
                                                      "type": "StringLiteral",
                                                      "text": "'J'",
                                                      "terminalNodeText": [
                                                        "'J'"
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "type": "MemberInvocation",
              "text": "given",
              "terminalNodeText": [],
              "children": [
                {
                  "type": "Identifier",
                  "text": "given",
                  "terminalNodeText": [
                    "given"
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Debug Output
```
Simplifying node of type: undefined
Simplifying node of type: EntireExpression
Simplifying node of type: InvocationExpression
Simplifying node of type: MemberInvocation
Simplifying node of type: Identifier
Simplifying node of type: InvocationExpression
Simplifying node of type: FunctionInvocation
Simplifying node of type: InvocationExpression
Simplifying node of type: FunctionInvocation
Simplifying node of type: TermExpression
Simplifying node of type: LiteralTerm
Simplifying node of type: InvocationExpression
Simplifying node of type: FunctionInvocation
Simplifying node of type: TermExpression
Simplifying node of type: LiteralTerm
Simplifying node of type: TermExpression
Simplifying node of type: LiteralTerm
Simplifying node of type: TermExpression
Simplifying node of type: LiteralTerm
Simplifying node of type: InvocationExpression
Simplifying node of type: MemberInvocation
Simplifying node of type: Identifier
Simplifying node of type: TermExpression
Simplifying node of type: InvocationTerm
Simplifying node of type: ThisInvocation
Simplifying node of type: InvocationExpression
Simplifying node of type: MemberInvocation
Simplifying node of type: Identifier
Simplifying node of type: InvocationExpression
Simplifying node of type: FunctionInvocation
Simplifying node of type: EqualityExpression
Simplifying node of type: TermExpression
Simplifying node of type: InvocationTerm
Simplifying node of type: MemberInvocation
Simplifying node of type: Identifier
Simplifying node of type: TermExpression
Simplifying node of type: LiteralTerm
Simplifying node of type: TermExpression
Simplifying node of type: InvocationTerm
Simplifying node of type: MemberInvocation
Simplifying node of type: Identifier
```

