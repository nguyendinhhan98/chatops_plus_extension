import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';

/**
 * Initialize the ChatOps MCP Server.
 */
async function main() {
  const server = new McpServer({
    name: 'mcp-chatops',
    version: '1.0.0',
  });

  // Register all tools
  registerAllTools(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[ChatOps MCP] Server started successfully via stdio');
}

main().catch((error) => {
  console.error('[ChatOps MCP] Fatal error during startup:');
  console.error(error);
  process.exit(1);
});
