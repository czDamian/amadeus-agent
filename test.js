import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const userAddress = process.env.AMA_WALLET_ADDRESS;
const mainnet = process.env.AMADEUS_MAINNET_RPC;
const testnet = process.env.AMADEUS_TESTNET_RPC;
const testnetUrl = "https://testnet.explorer.ama.one/"
const mcpRpcUrl = "https://mcp.ama.one/rpc";

if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
if (!userAddress) throw new Error("Missing AMA_WALLET_ADDRESS");

const anthropic = new Anthropic({ apiKey });

/**
 * Fetches tools from the MCP server.
 * @returns {Promise<Array>} Array of tools.
 */
async function getToolsFromMCP() {
  console.log("Fetching tools from MCP server...");
  const response = await fetch(mcpRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    })
  });

  if (!response.ok) throw new Error(`Failed to fetch tools: ${response.status}`);
  const data = await response.json();

  // Transform tools to match Anthropic's expected format
  // The MCP returns `inputSchema` but Anthropic expects `input_schema`
  return data.result.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  }));
}

async function callAmadeusMCP(toolName, params = {}) {
  const response = await fetch(mcpRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: params }
    })
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.result;
}

async function main() {
  try {
    const tools = await getToolsFromMCP();
    console.log(`Successfully loaded ${tools.length} tools from MCP.`);

    const userMessage = `claim testnet AMA for ${userAddress}`;
    let messages = [{ role: 'user', content: userMessage }];

    console.log(`User: ${userMessage}`);

    let response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      tools: tools,
      messages
    });

    while (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = await Promise.all(response.content
        .filter(block => block.type === 'tool_use')
        .map(async (block) => {
          console.log(`Executing tool: ${block.name}`);
          try {
            const result = await callAmadeusMCP(block.name, block.input);
            console.log(`Tool result: ${JSON.stringify(result)}`);
            return {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result)
            };
          } catch (err) {
            console.error(`Error executing tool ${block.name}:`, err);
            return {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: err.message }),
              is_error: true
            };
          }
        }));

      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        tools: tools,
        messages
      });
    }

    const finalReply = response.content.find(block => block.type === 'text')?.text;
    console.log(`Claude: ${finalReply}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();