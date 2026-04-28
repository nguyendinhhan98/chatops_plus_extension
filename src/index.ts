import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';
import { runSetup } from './setup-logic.js';

/**
 * Initialize the ChatOps MCP Server.
 */
async function main() {
  // Nếu người dùng chạy lệnh trực tiếp trong terminal (Interactive mode)
  if (process.stdin.isTTY || process.argv.includes('--setup')) {
    await runSetup();
    return;
  }

  // Chế độ MCP Server (AI gọi)
  const server = new McpServer({
    name: 'mcp-chatops',
    version: '1.0.2',
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  // Chỉ log ra stderr để không làm hỏng JSON-RPC của MCP
  console.error('[ChatOps MCP] Fatal error:', error);
  process.exit(1);
});
