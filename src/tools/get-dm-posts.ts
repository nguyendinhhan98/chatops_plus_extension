import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getUserByEmail, getMyProfile } from '../chatops/api/users.js';
import { getOrCreateDMChannel } from '../chatops/api/channels.js';
import { getChannelPosts } from '../chatops/api/posts.js';
import { getUsersByIds } from '../chatops/api/users.js';
import { formatPostList } from '../utils/formatter.js';
import type { ChatOpsUser } from '../chatops/types.js';

export function registerGetDmPostsTool(server: McpServer): void {
  server.registerTool(
    'get_dm_posts',
    {
      description:
        'Lấy tin nhắn trong cuộc trò chuyện riêng (DM) giữa mình và một user khác.\n' +
        'Ví dụ: "Xem tin nhắn DM giữa tôi và hauvt@runsystem.net"',
      inputSchema: z.object({
        user_email: z
          .string()
          .email()
          .describe('Email của user muốn xem DM. Ví dụ: hauvt@runsystem.net'),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(20)
          .describe('Số tin nhắn muốn lấy (1-200, mặc định: 20)'),
      }),
    },
    async ({ user_email, per_page }) => {
      try {
        // 1. Resolve both users
        const me = await getMyProfile();
        const otherUser = await getUserByEmail(user_email);

        // 2. Get or create DM channel
        const dmChannel = await getOrCreateDMChannel(me.id, otherUser.id);

        // 3. Get posts
        const result = await getChannelPosts(dmChannel.id, { per_page });
        const posts = result.order.map((id) => result.posts[id]).filter(Boolean);

        if (posts.length === 0) {
          return {
            content: [{ type: 'text', text: `📭 Không có tin nhắn DM nào với ${otherUser.username}.` }],
          };
        }

        // 4. Build user map
        const usersMap: Record<string, ChatOpsUser> = {
          [me.id]: me,
          [otherUser.id]: otherUser,
        };

        const output = formatPostList(posts, usersMap);
        return {
          content: [{
            type: 'text',
            text: `💬 DM giữa @${me.username} và @${otherUser.username} (${dmChannel.total_msg_count} tổng tin nhắn):\n\n${output}`,
          }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi lấy DM: ${message}` }],
        };
      }
    }
  );
}
