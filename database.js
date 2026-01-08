import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const apiKey = process.env.ANTHROPIC_API_KEY;
const mongoUri = process.env.MONGODB_URI;

if (!apiKey) {
  console.error("Please set ANTHROPIC_API_KEY in your .env file");
  process.exit(1);
}
if (!mongoUri) {
  console.error("Please set MONGODB_URI in your .env file");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

async function main() {
  console.log("Starting MongoDB MCP Server...");
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "mongodb-mcp-server"],
    env: { ...process.env, MONGODB_CONNECTION_STRING: mongoUri }
  });

  const client = new Client(
    { name: "amadeus-db-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to MongoDB MCP Server");

    // 1. List available tools from the MongoDB MCP server
    console.log("Listing available MongoDB MCP tools...");
    const resources = await client.listTools();
    const mongoTools = resources.tools;

    // Transform tools to Anthropic format
    const toolsForClaude = mongoTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));

    // 2. Prepare the prompt
    // We want to save the LIST of tools (mongoTools) to the DB.
    // We pass the list in the prompt context.
    const toolsListJson = JSON.stringify(mongoTools.map(t => ({ name: t.name, description: t.description })));

//     const userMessage = `
// Here is the list of tools available to you from the MongoDB MCP server:
// ${toolsListJson}

// Please perform the following actions:
// 1. Connect to the MongoDB database (using the connection string provided in the tools, or ask for it if needed - hint: use the one I provide here: ${mongoUri}).
// 2. Save this list of tools to a collection named 'available_tools' in the 'amadeus_agent' database. Check if the collection already exists.
//    - If the collection does not exist, create it.
//    - Insert the tool definitions as documents.
//    - If the collection already exists, do not modify it.
// `;

    const userMessage = ` Connect to the MongoDB database (using the connection string provided in the tools, or ask for it if needed - hint: use the one I provide here: ${mongoUri}). The database to connect to is 'ai_agent'. create a user collection and populate it with 10 random names -each name should have a random age between 18 and 65, country, city, address and postal code`;
    console.log("\nStarting Agentic Loop...");
    let messages = [{ role: 'user', content: userMessage }];

    // 3. Agent Loop
    let processing = true;
    while (processing) {
      console.log("Thinking...");
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        tools: toolsForClaude,
        messages: messages
      });

      // Add assistant response to history
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

        for (const block of toolUseBlocks) {
          console.log(`\nExecuting tool: ${block.name}`);

          try {
            const timeoutMs = 60000; // 60s timeout
            const callPromise = client.callTool({
              name: block.name,
              arguments: block.input
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Tool execution timed out")), timeoutMs)
            );

            const result = await Promise.race([callPromise, timeoutPromise]);

            console.log(`Result: ${JSON.stringify(result).substring(0, 200)}...`);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result)
            });
          } catch (err) {
            console.error(`Error executing ${block.name}:`, err.message);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ isError: true, message: err.message }),
              is_error: true
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
      } else {
        // Stop reason is end_turn or max_tokens
        const textResponse = response.content.find(block => block.type === 'text')?.text;
        console.log("\nFinal Response:");
        console.log(textResponse);
        processing = false;
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
