export const amadeusTools = [
  // --- Blockchain Query Tools ---
  {
    name: 'get_chain_stats',
    description: 'Get current Amadeus blockchain statistics including block height, total transactions, and total accounts',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'get_block_by_height',
    description: 'Retrieve blockchain block details at a specific height',
    input_schema: {
      type: 'object',
      properties: {
        height: { type: 'integer', description: 'The block number to retrieve' }
      },
      required: ['height']
    }
  },
  {
    name: 'get_transaction',
    description: 'Get detailed transaction information by its hash',
    input_schema: {
      type: 'object',
      properties: {
        hash: { type: 'string', description: 'The transaction hash (identifiers)' }
      },
      required: ['hash']
    }
  },
  {
    name: 'get_transaction_history',
    description: 'Query transaction history for a specific account with pagination support',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'The Amadeus account address' },
        limit: { type: 'integer', description: 'Number of transactions to return (default: 10)', minimum: 1, maximum: 100 },
        offset: { type: 'integer', description: 'Offset for pagination (default: 0)', minimum: 0 }
      },
      required: ['address']
    }
  },

  // --- Account & Balance Tools ---
  {
    name: 'get_account_balance',
    description: 'Get the AMA token balance and other assets for a specific Amadeus blockchain address',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'The Amadeus blockchain address (starts with ama1)' }
      },
      required: ['address']
    }
  },

  // --- Transaction Tools ---
  {
    name: 'create_transfer',
    description: 'Build an unsigned transaction blob for transferring tokens. Note: This does NOT submit the transaction, it only prepares it for signing.',
    input_schema: {
      type: 'object',
      properties: {
        sender: { type: 'string', description: 'Sender address' },
        recipient: { type: 'string', description: 'Recipient address' },
        amount: { type: 'string', description: 'Amount to transfer (in smallest unit)' },
        token: { type: 'string', description: 'Token symbol or address (optional, default: AMA)' }
      },
      required: ['sender', 'recipient', 'amount']
    }
  },
  {
    name: 'submit_transaction',
    description: 'Broadcast a signed transaction blob to the network',
    input_schema: {
      type: 'object',
      properties: {
        signed_tx: { type: 'string', description: 'The hex-encoded signed transaction blob' }
      },
      required: ['signed_tx']
    }
  },

  // --- Network Tools ---
  {
    name: 'get_validators',
    description: 'Get list of current validator nodes (trainers) on the Amadeus network',
    input_schema: { type: 'object', properties: {} }
  },

  // --- Smart Contract Tools ---
  {
    name: 'get_contract_state',
    description: 'Query smart contract storage state by address and key',
    input_schema: {
      type: 'object',
      properties: {
        contract_address: { type: 'string', description: 'Address of the smart contract' },
        key: { type: 'string', description: 'Storage key to query' }
      },
      required: ['contract_address', 'key']
    }
  },

  // --- Faucet Tools ---
  {
    name: 'claim_testnet_ama',
    description: 'Claim free testnet AMA tokens. Limited to once per 24 hours per IP address.',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'The Amadeus address to receive testnet tokens' }
      },
      required: ['address']
    }
  }
];