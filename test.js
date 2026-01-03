import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { amadeusTools } from "./amadeusTools.js";

const apiKey = process.env.ANTHROPIC_API_KEY;
const userAddress = process.env.AMA_WALLET_ADDRESS;
const mainnet = process.env.AMADEUS_MAINNET_RPC;
const testnet = process.env.AMADEUS_TESTNET_RPC;
const testnetUrl = "https://testnet.explorer.ama.one/"

if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
if (!userAddress) throw new Error("Missing AMA_WALLET_ADDRESS");

const anthropic = new Anthropic({ apiKey });


async function callAmadeusMCP(toolName, params = {}) {
  const response = await fetch('https://mcp.ama.one/rpc', {
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
    const userMessage = `using the amadeus blockchain tools, get the balance of the first validator`;
    let messages = [{ role: 'user', content: userMessage }];

    console.log(`User: ${userMessage}`);

    let response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      tools: amadeusTools,
      messages
    });

    while (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = await Promise.all(response.content
        .filter(block => block.type === 'tool_use')
        .map(async (block) => {
          console.log(`Executing tool: ${block.name}`);
          const result = await callAmadeusMCP(block.name, block.input);
          console.log(`Tool result: ${JSON.stringify(result)}`);
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result)
          };
        }));

      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        tools: amadeusTools,
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