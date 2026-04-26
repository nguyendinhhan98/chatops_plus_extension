import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getUserByEmail } from '../chatops/api/users.js';
import { getTeamByName } from '../chatops/api/teams.js';
import { searchChannels, getChannelByName } from '../chatops/api/channels.js';
import { getAllChannelPostsInRange } from '../chatops/api/posts.js';
import { formatLeaveRequests } from '../utils/formatter.js';
import {
  parseFlexibleDate,
  toUnixMs,
  getLastWeekRange,
  formatUnixMsToVN,
} from '../utils/date.js';
import { config } from '../config.js';

export function registerFindLeaveRequestsTool(server: McpServer): void {
  server.registerTool(
    'find_leave_requests',
    {
      description:
        'Tìm kiếm lịch sử xin trễ/nghỉ của một người dùng cụ thể trong một channel.\n' +
        'Tự động phân trang để lấy toàn bộ dữ liệu trong khoảng thời gian yêu cầu.\n' +
        'Ví dụ: "tìm xin nghỉ của hannd@runsystem.net trong channel [DN] CHECK.OFF.LATER tuần trước"',
      inputSchema: z.object({
        user_email: z
          .string()
          .email()
          .describe('Email của user cần tra cứu. Ví dụ: hannd@runsystem.net'),
        channel_name: z
          .string()
          .min(1)
          .describe('Tên channel (URL slug hoặc display name). Ví dụ: "[DN] CHECK.OFF.LATER"'),
        date_from: z
          .string()
          .optional()
          .describe('Ngày bắt đầu (ISO: YYYY-MM-DD). Mặc định: Thứ 2 tuần trước'),
        date_to: z
          .string()
          .optional()
          .describe('Ngày kết thúc (ISO: YYYY-MM-DD). Mặc định: Chủ nhật tuần trước'),
        team_name: z
          .string()
          .optional()
          .describe(`Tên team (slug). Ví dụ: "dn", "runsystem"${config.teamName ? `. Mặc định: "${config.teamName}"` : ''}`),
      }),
    },
    async ({ user_email, channel_name, date_from, date_to, team_name }) => {
      try {
        // 1. Resolve User
        const user = await getUserByEmail(user_email);

        // 2. Resolve Team
        const teamSlug = team_name ?? config.teamName;
        if (!teamSlug) {
          return {
            isError: true,
            content: [{ type: 'text', text: '❌ Vui lòng chỉ định team_name (ví dụ: "dn")' }],
          };
        }
        const team = await getTeamByName(teamSlug);

        // 3. Resolve Channel (try exact first, then search)
        let channel;
        try {
          // Thử tìm theo exact slug name
          channel = await getChannelByName(team.id, channel_name);
        } catch {
          // Thử tìm theo search term
          const channels = await searchChannels(team.id, channel_name);
          if (channels.length === 0) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `❌ Không tìm thấy channel nào khớp với "${channel_name}" trong team "${teamSlug}"`,
                },
              ],
            };
          }
          channel = channels[0];
        }

        // 4. Resolve Date Range
        const lastWeek = getLastWeekRange();
        const fromDate = date_from ? parseFlexibleDate(date_from) : lastWeek.from;
        const toDate = date_to ? parseFlexibleDate(date_to) : lastWeek.to;

        if (!fromDate || !toDate) {
          return {
            isError: true,
            content: [{ type: 'text', text: '❌ Định dạng ngày tháng không hợp lệ.' }],
          };
        }

        // Ensure toDate is end of day
        toDate.setHours(23, 59, 59, 999);

        const fromMs = toUnixMs(fromDate);
        const toMs = toUnixMs(toDate);

        // 5. Fetch all posts in range
        const allPosts = await getAllChannelPostsInRange(channel.id, fromMs, toMs);

        // 6. Filter by user
        const userPosts = allPosts.filter((p) => p.user_id === user.id);

        if (userPosts.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `🔍 Không tìm thấy tin nhắn xin trễ/nghỉ nào của **${user.last_name} ${user.first_name}** trong channel **${channel.display_name}** từ ${formatUnixMsToVN(fromMs)} đến ${formatUnixMsToVN(toMs)}.`,
              },
            ],
          };
        }

        const output = formatLeaveRequests(
          userPosts,
          user,
          channel.display_name,
          formatUnixMsToVN(fromMs),
          formatUnixMsToVN(toMs)
        );

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi tìm xin trễ/nghỉ: ${message}` }],
        };
      }
    }
  );
}
