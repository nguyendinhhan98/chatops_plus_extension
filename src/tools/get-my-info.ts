import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getMyProfile } from '../chatops/api/users.js';
import { formatUserInfo } from '../utils/formatter.js';

export function registerGetMyInfoTool(server: McpServer): void {
  server.registerTool(
    'get_my_info',
    {
      description:
        'Lấy thông tin profile của chính mình (user đang xác thực). ' +
        'Dùng để verify auth hoạt động đúng hoặc lấy user ID của mình.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const me = await getMyProfile();
        return {
          content: [{ type: 'text', text: `✅ Đang đăng nhập với tài khoản:\n\n${formatUserInfo(me)}` }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Không thể lấy thông tin: ${message}` }],
        };
      }
    }
  );
}
