import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

import { bls12_381 } from "@noble/curves/bls12-381";
import { bytesToNumberLE, numberToBytesBE, hexToBytes } from "@noble/curves/utils.js";
import bs58 from "bs58";

const apiKey = process.env.ANTHROPIC_API_KEY;
const userAddress = process.env.AMA_WALLET_ADDRESS;
const testnetUrl = "https://testnet.explorer.ama.one/"
const privateKeyB58 = process.env.AMA_PRIVATE_KEY;

export const mcpRpcUrl = "https://mcp.ama.one";

if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
if (!userAddress) throw new Error("Missing AMA_WALLET_ADDRESS");
if (!privateKeyB58) throw new Error("Missing AMA_PRIVATE_KEY in .env");

const anthropic = new Anthropic({ apiKey });

/**
 * Fetches tools from the MCP server.
 * @returns {Promise<Array>} Array of tools.
 */
export async function getToolsFromMCP() {
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
  console.log("MCP Response:", response);

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
  console.log(`   📤 MCP Request: ${toolName}`, JSON.stringify(params).substring(0, 100));

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

  // Check for JSON-RPC error
  if (data.error) {
    throw new Error(`MCP Error: ${JSON.stringify(data.error)}`);
  }

  if (!data.result) {
    throw new Error(`MCP returned no result for ${toolName}`);
  }

  return data.result;
}


// ============================================
// BLS12-381 Signing (simulates wallet signing)
// ============================================

function signTransaction(signingPayload) {
  const sk64 = bs58.decode(privateKeyB58);
  const skScalar = bytesToNumberLE(sk64) % bls12_381.fields.Fr.ORDER;
  const privateKey = numberToBytesBE(skScalar, 32);
  const blsl = bls12_381.longSignatures;

  const signingHash = hexToBytes(signingPayload);
  const DST = "AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_TX_";
  const msgPoint = blsl.hash(signingHash, DST);
  const signature = blsl.sign(msgPoint, privateKey);
  return bs58.encode(signature.toBytes(true));
}

// System prompt that MUST be included in every API call
const SYSTEM_PROMPT = `You are an Amadeus blockchain assistant. 

CRITICAL RULES FOR AMA TRANSFERS:
1. To transfer AMA tokens, use create_transaction with these EXACT parameters:
   - signer: the sender's address
   - contract: "Coin" (exactly this string, NOT a hex address)
   - function: "transfer"
   - args: an array with exactly 3 elements:
     [0]: {"b58": "RECIPIENT_ADDRESS"} (object with b58 key)
     [1]: "AMOUNT_IN_BASE_UNITS" (string, e.g., "10000000000" for 10 AMA)
     [2]: "AMA" (the token symbol)

   Example: {"signer": "...", "contract": "Coin", "function": "transfer", "args": [{"b58":"RECIPIENT"},"10000000000","AMA"]}

2. After create_transaction returns, you MUST stop and return the signing_payload and blob to the user.
3. DO NOT call submit_transaction automatically. The user must sign the transaction first.
4. Wait for the user to provide a signature before calling submit_transaction.
5. When submitting, use submit_transaction with:
   - transaction: the blob from create_transaction
   - signature: the signature provided by the user  
   - network: "testnet" (or "mainnet" if the user specifies)

NEVER submit a transaction without the user providing a signature first.`;

/**
 * Run a single conversation turn with Claude
 */
async function runConversation(messages, tools) {
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    tools: tools,
    messages,
    system: SYSTEM_PROMPT
  });

  while (response.stop_reason === 'tool_use') {
    messages.push({ role: 'assistant', content: response.content });

    const toolResults = await Promise.all(response.content
      .filter(block => block.type === 'tool_use')
      .map(async (block) => {
        console.log(`🔧 Executing tool: ${block.name}`);
        console.log(`   Input: ${JSON.stringify(block.input).substring(0, 150)}...`);
        try {
          const result = await callAmadeusMCP(block.name, block.input);
          const resultStr = JSON.stringify(result) || 'undefined';
          console.log(`   Result: ${resultStr.substring(0, 200)}...`);
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result)
          };
        } catch (err) {
          console.error(`   ❌ Error: ${err.message}`);
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
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      tools: tools,
      messages,
      system: SYSTEM_PROMPT
    });
  }

  const reply = response.content.find(block => block.type === 'text')?.text;
  messages.push({ role: 'assistant', content: response.content });
  return { reply, messages };
}

async function main() {
  try {
    const tools = await getToolsFromMCP();
    console.log("tools", tools)
    console.log(`✅ Loaded ${tools.length} tools from MCP.\n`);

    // ========================================
    // STEP 1: User requests to send AMA
    // ========================================
    console.log("═".repeat(60));
    console.log("STEP 1: User requests transfer");
    console.log("═".repeat(60));

    const userMessage = `send 10 ama from ${userAddress} to 6cgywWe4bPYyMtBdRnfbYeuim9bDExDHpyrWL1oXbz3JFUrgNLy88vayDkC3Mto7tu and tell me the balance of the recipient on the mainnet  if successful`;
    console.log(`👤 User: ${userMessage}\n`);

    let messages = [{ role: 'user', content: userMessage }];
    let { reply, messages: updatedMessages } = await runConversation(messages, tools);

    console.log(`\n🤖 Claude: ${reply}\n`);

    // ========================================
    // STEP 2: Simulate user signing (frontend wallet popup)
    // ========================================
    console.log("═".repeat(60));
    console.log("STEP 2: Simulating wallet signing (frontend would show popup)");
    console.log("═".repeat(60));

    // Extract signing_payload and blob from the tool results in conversation history
    // The tool result contains the actual data, not Claude's text response
    let signingPayload = null;
    let transactionBlob = null;

    for (const msg of updatedMessages) {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'tool_result' && item.content) {
            try {
              // Parse the nested JSON structure from MCP
              const parsed = JSON.parse(item.content);
              if (parsed.content?.[0]?.text) {
                const txData = JSON.parse(parsed.content[0].text);
                if (txData.signing_payload && txData.blob) {
                  signingPayload = txData.signing_payload;
                  transactionBlob = txData.blob;
                }
              }
            } catch (e) {
              // Not the tool result we're looking for
            }
          }
        }
      }
    }

    if (!signingPayload || !transactionBlob) {
      console.log("❌ Could not find signing_payload/blob in tool results.");
      return;
    }

    console.log(`📝 Signing payload: ${signingPayload}`);
    console.log(`� Transaction blob: ${transactionBlob.substring(0, 50)}...`);

    // Simulate user signing with their wallet
    const signature = signTransaction(signingPayload);
    console.log(`✍️  Signature: ${signature.substring(0, 40)}...`);

    // ========================================
    // STEP 3: User provides signature, Claude submits
    // ========================================
    console.log("\n" + "═".repeat(60));
    console.log("STEP 3: User provides signature");
    console.log("═".repeat(60));

    const signedMessage = `I have signed the transaction. Here is my signature: ${signature}. The transaction blob is: ${transactionBlob}. Please submit the transaction now using submit_transaction.`;
    console.log(`👤 User: Providing signature and blob to Claude...\n`);

    updatedMessages.push({ role: 'user', content: signedMessage });

    const result = await runConversation(updatedMessages, tools);
    console.log(`\n🤖 Claude: ${result.reply}\n`);

    console.log("═".repeat(60));
    console.log("✅ Full flow complete!");
    console.log("═".repeat(60));

  } catch (error) {
    console.error('Error:', error);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}