import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGetUserTool } from './get-user.js';
import { registerGetMyInfoTool } from './get-my-info.js';
import { registerGetChannelInfoTool } from './get-channel-info.js';
import { registerGetChannelPostsTool } from './get-channel-posts.js';
import { registerGetDmPostsTool } from './get-dm-posts.js';
import { registerGetThreadPostsTool } from './get-thread-posts.js';
import { registerSearchPostsTool } from './search-posts.js';
import { registerFindLeaveRequestsTool } from './find-leave-requests.js';

/**
 * Register all ChatOps tools to the MCP server.
 */
export function registerAllTools(server: McpServer): void {
  console.error('[ChatOps MCP] Registering tools...');
  
  registerGetMyInfoTool(server);
  registerGetUserTool(server);
  registerGetChannelInfoTool(server);
  registerGetChannelPostsTool(server);
  registerGetDmPostsTool(server);
  registerGetThreadPostsTool(server);
  registerSearchPostsTool(server);
  registerFindLeaveRequestsTool(server);
  
  console.error('[ChatOps MCP] Registered 8 tools:');
  console.error('  ✅ get_my_info');
  console.error('  ✅ get_user');
  console.error('  ✅ get_channel_info');
  console.error('  ✅ get_channel_posts');
  console.error('  ✅ get_dm_posts');
  console.error('  ✅ get_thread_posts');
  console.error('  ✅ search_posts');
  console.error('  ✅ find_leave_requests');
}
