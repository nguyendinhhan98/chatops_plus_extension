import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPostThread } from '../chatops/api/posts.js';
import { getUsersByIds } from '../chatops/api/users.js';
import { formatPostList } from '../utils/formatter.js';
import type { ChatOpsUser } from '../chatops/types.js';

export function registerGetThreadPostsTool(server: McpServer): void {
  server.registerTool(
    'get_thread_posts',
    {
      description:
        'Lấy toàn bộ tin nhắn trong một thread (bài gốc + replies).\n' +
        'Cần biết post_id của bài gốc hoặc bất kỳ reply nào trong thread.',
      inputSchema: z.object({
        post_id: z
          .string()
          .min(1)
          .describe('ID của post gốc hoặc reply bất kỳ trong thread'),
      }),
    },
    async ({ post_id }) => {
      try {
        const result = await getPostThread(post_id);
        const posts = result.order.map((id) => result.posts[id]).filter(Boolean);

        if (posts.length === 0) {
          return {
            content: [{ type: 'text', text: '📭 Không tìm thấy thread nào.' }],
          };
        }

        // Enrich with user info
        const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
        const users = await getUsersByIds(userIds);
        const usersMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, ChatOpsUser>);

        const rootPost = posts[0];
        const output = formatPostList(posts, usersMap);
        return {
          content: [{
            type: 'text',
            text: `🧵 Thread (${posts.length} tin nhắn):\n\n${output}`,
          }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi lấy thread: ${message}` }],
        };
      }
    }
  );
}
