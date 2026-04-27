import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGetUserTool } from './get-user.js';
import { registerGetMyInfoTool } from './get-my-info.js';
import { registerGetChannelInfoTool } from './get-channel-info.js';
import { registerGetChannelPostsTool } from './get-channel-posts.js';
import { registerGetDmPostsTool } from './get-dm-posts.js';
import { registerGetThreadPostsTool } from './get-thread-posts.js';
import { registerSearchPostsTool } from './search-posts.js';
import { registerFindLeaveRequestsTool } from './find-leave-requests.js';
import { registerPreviewMessage } from './preview-message.js';
import { registerSendMessage } from './send-message.js';
import { registerCheckMissedMentions } from './check-missed-mentions.js';

/**
 * Đăng ký tất cả ChatOps tools vào MCP server.
 */
export function registerAllTools(server: McpServer): void {
  console.error('[ChatOps MCP] Đang đăng ký tools...');

  registerGetMyInfoTool(server);
  registerGetUserTool(server);
  registerGetChannelInfoTool(server);
  registerGetChannelPostsTool(server);
  registerGetDmPostsTool(server);
  registerGetThreadPostsTool(server);
  registerSearchPostsTool(server);
  registerFindLeaveRequestsTool(server);
  registerPreviewMessage(server);
  registerSendMessage(server);
  registerCheckMissedMentions(server);

  console.error('[ChatOps MCP] Đã đăng ký 11 tools:');
  console.error('  ✅ get_my_info');
  console.error('  ✅ get_user');
  console.error('  ✅ get_channel_info');
  console.error('  ✅ get_channel_posts');
  console.error('  ✅ get_dm_posts');
  console.error('  ✅ get_thread_posts');
  console.error('  ✅ search_posts');
  console.error('  ✅ find_leave_requests');
  console.error('  ✅ preview-message');
  console.error('  ✅ send-message');
  console.error('  ✅ check-missed-mentions');
}
