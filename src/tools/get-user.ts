import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getUserByEmail,
  getUserById,
  getUserByUsername,
  searchUsers,
} from '../chatops/api/users.js';
import { formatUserInfo } from '../utils/formatter.js';

export function registerGetUserTool(server: McpServer): void {
  server.registerTool(
    'get_user',
    {
      description:
        'Lấy thông tin chi tiết của một người dùng trong ChatOps. ' +
        'Có thể tìm theo ID, email, username hoặc tìm kiếm mờ (fuzzy search).',
      inputSchema: z.object({
        identifier: z
          .string()
          .min(1)
          .describe('Giá trị định danh (ID, email, username hoặc từ khóa tìm kiếm)'),
        by: z
          .enum(['id', 'email', 'username', 'search'])
          .default('email')
          .describe('Loại định danh cung cấp (mặc định: email)'),
      }),
    },
    async ({ identifier, by }) => {
      try {
        let user;
        switch (by) {
          case 'id':
            user = await getUserById(identifier);
            break;
          case 'email':
            user = await getUserByEmail(identifier);
            break;
          case 'username':
            user = await getUserByUsername(identifier);
            break;
          case 'search':
            const results = await searchUsers(identifier, 1);
            if (results.length === 0) {
              return {
                content: [{ type: 'text', text: `❌ Không tìm thấy user với từ khóa: "${identifier}"` }],
              };
            }
            user = results[0];
            break;
        }

        return {
          content: [{ type: 'text', text: formatUserInfo(user) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi lấy thông tin user: ${message}` }],
        };
      }
    }
  );
}
