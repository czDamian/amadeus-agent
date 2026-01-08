//list of available tools for reference only
const tools = [
  {
    name: 'create_transaction',
    description: 'Creates unsigned transaction for any contract call',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'submit_transaction',
    description: 'Submits a signed transaction to the blockchain network',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_account_balance',
    description: 'Queries the balance of an account across all supported assets',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_chain_stats',
    description: 'Retrieves current blockchain statistics',
    input_schema: {
      properties: {}, required: [], type: 'object'
    }
  },
  {
    name: 'get_block_by_height',
    description: 'Retrieves blockchain entries at a specific height',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_transaction',
    description: 'Retrieves a specific transaction by its hash',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_transaction_history',
    description: 'Retrieves transaction history for a specific account',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_validators',
    description: 'Retrieves the list of current validator nodes',
    input_schema: {
      properties: {}, required: [], type: 'object'
    }
  },
  {
    name: 'get_contract_state',
    description: 'Retrieves a specific value from smart contract storage',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'claim_testnet_ama',
    description: 'Claims testnet AMA tokens to the specified address (once per 24 hours per IP)',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_entry_tip',
    description: 'Get the latest blockchain entry',
    input_schema: {
      properties: {}, required: [], type: 'object'
    }
  },
  {
    name: 'get_entry_by_hash',
    description: 'Get entry by hash',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_block_with_txs',
    description: 'Get block at height with full transactions',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_txs_in_entry',
    description: 'Get all transactions in an entry',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_epoch_score',
    description: 'Get validator mining scores (optionally for specific address)',
    input_schema: {
      properties: [Object
      ], required: [], type: 'object'
    }
  },
  {
    name: 'get_emission_address',
    description: 'Get emission address for a validator',
    input_schema: {
      properties: [Object
      ], required: [Array
      ], type: 'object'
    }
  },
  {
    name: 'get_richlist',
    description: 'Get top AMA token holders',
    input_schema: {
      properties: {}, required: [], type: 'object'
    }
  },
  {
    name: 'get_nodes',
    description: 'Get connected peer nodes',
    input_schema: {
      properties: {}, required: [], type: 'object'
    }
  },
  {
    name: 'get_removed_validators',
    description: 'Get validators removed this epoch',
    input_schema: {
      properties: {}, required: [], type: 'object'
    }
  }
]