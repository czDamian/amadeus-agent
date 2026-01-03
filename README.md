# Amadeus MCP Tools Test

This project demonstrates the use of an LLM (Claude) with the Amadeus blockchain using the Model Context Protocol (MCP). It allows an AI agent to query blockchain statistics, check account balances, and simulate transaction creation and signing by interfacing with the Amadeus MCP server.

## Features

- **Blockchain Queries**: Retrieve current block height, transaction history, and validator information.
- **Account Management**: Check AMA token balances and other assets for specific addresses.
- **Transaction Simulation**: Build and sign transaction blobs (simulation only, does not broadcast to mainnet/testnet without specific configuration).
- **MCP Integration**: Uses the Amadeus MCP server (`https://mcp.ama.one/rpc`) to execute tools defined in `amadeusTools.js`.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed (v18+ recommended).
- **Anthropic API Key**: You need a valid API key from Anthropic to use the Claude model.
- **Amadeus Wallet Address**: A valid Amadeus blockchain address (starting with `ama1`) for testing queries.

## Installation

1. Clone the repository
2. Install the dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the root directory and add the following environment variables:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AMA_WALLET_ADDRESS=your_amadeus_wallet_address_here
AMADEUS_MAINNET_RPC=https://node.ama.one
AMADEUS_TESTNET_RPC=https://testnet.node.ama.one
```

## Usage

To run the test script and interact with the Amadeus tools via Claude:

```bash
node test.js
```

The script will:
1. Initialize the Anthropic client.
2. Send a prompt to Claude (eg: "using the amadeus blockchain tools, get the balance of the first validator").
3. Claude will decide which tools to call based on the definitions in `amadeusTools.js`.
4. The script executes the tools against the Amadeus MCP server and returns the results to Claude.
5. Claude generates a final natural language response.

## Project Structure

- **`amadeusTools.js`**: Contains the definitions of the tools available to the LLM (e.g., `get_chain_stats`, `get_account_balance`).
- **`test.js`**: The main entry point. It sets up the MCP integration, handles the conversation loop with Claude, and executes the tool calls.

## License

[MIT](LICENSE)
