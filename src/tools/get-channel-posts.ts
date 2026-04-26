import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getChannelPosts } from '../chatops/api/posts.js';
import { getUsersByIds } from '../chatops/api/users.js';
import { formatPostList } from '../utils/formatter.js';
import { parseFlexibleDate, toUnixMs } from '../utils/date.js';
import type { ChatOpsUser } from '../chatops/types.js';

export function registerGetChannelPostsTool(server: McpServer): void {
  server.registerTool(
    'get_channel_posts',
    {
      description:
        'Lấy danh sách tin nhắn (posts) từ một channel trong ChatOps. ' +
        'Hỗ trợ phân trang và lọc theo thời gian. ' +
        'Cần biết channel_id trước (dùng get_channel_info để lấy).',
      inputSchema: z.object({
        channel_id: z
          .string()
          .min(1)
          .describe('Channel ID to fetch posts from (use get_channel_info to find it)'),
        page: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe('Page number (0-indexed, default: 0)'),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(30)
          .describe('Number of posts per page (1-200, default: 30)'),
        since: z
          .string()
          .optional()
          .describe(
            'ISO date string to get posts created AFTER this time. E.g. "2025-04-21" or "2025-04-21T00:00:00Z"'
          ),
        include_authors: z
          .boolean()
          .default(true)
          .describe('Whether to include author info in the output (default: true)'),
      }),
    },
    async ({ channel_id, page, per_page, since, include_authors }) => {
      try {
        const sinceMs = since ? toUnixMs(parseFlexibleDate(since)!) : undefined;

        const result = await getChannelPosts(channel_id, {
          page,
          per_page,
          since: sinceMs,
        });

        const posts = result.order.map((id) => result.posts[id]).filter(Boolean);

        if (posts.length === 0) {
          return {
            content: [{ type: 'text', text: '📭 Channel này hiện không có tin nhắn nào.' }],
          };
        }

        // Enrich with user info if requested
        let usersMap: Record<string, ChatOpsUser> = {};
        if (include_authors) {
          const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
          const users = await getUsersByIds(userIds);
          usersMap = users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as Record<string, ChatOpsUser>);
        }

        const output = formatPostList(posts, usersMap, page);
        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi lấy tin nhắn: ${message}` }],
        };
      }
    }
  );
}
