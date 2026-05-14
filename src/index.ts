import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';

/**
 * Initialize the ChatOps MCP Server.
 */
async function main() {
  const server = new McpServer({
    name: 'mcp-chatops',
    version: '1.1.2',
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[ChatOps MCP] Fatal error:', error);
  process.exit(1);
});
