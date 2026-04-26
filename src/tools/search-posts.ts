import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getTeamByName } from '../chatops/api/teams.js';
import { searchPosts } from '../chatops/api/posts.js';
import { getUsersByIds } from '../chatops/api/users.js';
import { formatPostList } from '../utils/formatter.js';
import { config } from '../config.js';
import type { ChatOpsUser } from '../chatops/types.js';

export function registerSearchPostsTool(server: McpServer): void {
  server.registerTool(
    'search_posts',
    {
      description:
        'Tìm kiếm tin nhắn trong ChatOps sử dụng cú pháp tìm kiếm chuẩn.\n' +
        'Các bộ lọc hỗ trợ:\n' +
        '  - from:username    → lọc theo người gửi\n' +
        '  - in:channel-name  → lọc trong channel cụ thể\n' +
        '  - on:YYYY-MM-DD    → lọc ngày chính xác\n' +
        '  - before:YYYY-MM-DD → trước ngày\n' +
        '  - after:YYYY-MM-DD  → sau ngày\n' +
        'Ví dụ: "xin nghỉ in:dn-check-off-later from:hannd after:2025-04-14"',
      inputSchema: z.object({
        terms: z
          .string()
          .min(1)
          .describe(
            'Search terms with optional modifiers. ' +
            'E.g. "xin trễ in:dn-check-off-later from:hannd after:2025-04-14"'
          ),
        is_or_search: z
          .boolean()
          .default(false)
          .describe('Whether to use OR logic between terms (default: false/AND)'),
        team_name: z
          .string()
          .optional()
          .describe(`Team name to search in. Default: "${config.teamName}"`),
      }),
    },
    async ({ terms, is_or_search, team_name }) => {
      try {
        const teamSlug = team_name ?? config.teamName;
        if (!teamSlug) {
          return {
            isError: true,
            content: [{ type: 'text', text: '❌ Vui lòng chỉ định team_name (ví dụ: "dn")' }],
          };
        }
        const team = await getTeamByName(teamSlug);

        const result = await searchPosts(team.id, {
          terms,
          is_or_search,
        });

        const posts = result.order.map((id) => result.posts[id]).filter(Boolean);

        if (posts.length === 0) {
          return {
            content: [{ type: 'text', text: `🔍 Không tìm thấy kết quả nào cho: "${terms}"` }],
          };
        }

        // Enrich with user info
        const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
        const users = await getUsersByIds(userIds);
        const usersMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, ChatOpsUser>);

        const output = formatPostList(posts, usersMap);
        return {
          content: [
            {
              type: 'text',
              text: `🔍 Kết quả tìm kiếm cho: "${terms}"\n\n${output}`,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi tìm kiếm: ${message}` }],
        };
      }
    }
  );
}
