import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getTeamByName } from '../chatops/api/teams.js';
import {
  getChannelById,
  getChannelByName,
  searchChannels,
} from '../chatops/api/channels.js';
import { formatChannelInfo } from '../utils/formatter.js';
import { config } from '../config.js';

export function registerGetChannelInfoTool(server: McpServer): void {
  server.registerTool(
    'get_channel_info',
    {
      description:
        'Lấy thông tin chi tiết và ID của một channel trong ChatOps. ' +
        'ID này rất quan trọng để sử dụng cho các tool truy vấn tin nhắn sau này.',
      inputSchema: z.object({
        channel_name: z
          .string()
          .min(1)
          .describe('Tên channel (URL slug, ví dụ: "checkoff-later")'),
        team_name: z
          .string()
          .optional()
          .describe(`Tên team (slug). Ví dụ: "dn", "runsystem"${config.teamName ? `. Mặc định: "${config.teamName}"` : ''}`),
      }),
    },
    async ({ channel_name, team_name }) => {
      try {
        const teamSlug = team_name ?? config.teamName;
        if (!teamSlug) {
          return {
            isError: true,
            content: [{ type: 'text', text: '❌ Vui lòng chỉ định team_name (ví dụ: "dn")' }],
          };
        }
        const team = await getTeamByName(teamSlug);

        let channel;
        // Thử tìm theo ID trước (nếu user nhập ID)
        try {
          channel = await getChannelById(channel_name);
        } catch {
          // Thử tìm theo exact name
          try {
            channel = await getChannelByName(team.id, channel_name);
          } catch {
            // Cuối cùng dùng search
            const results = await searchChannels(team.id, channel_name);
            if (results.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `❌ Không tìm thấy channel nào với tên: "${channel_name}" trong team "${teamSlug}"`,
                  },
                ],
              };
            }

            if (results.length > 1) {
              const list = results
                .map((c, i) => `${i + 1}. ${c.display_name} (Name: ${c.name}, ID: ${c.id})`)
                .join('\n');
              return {
                content: [
                  {
                    type: 'text',
                    text: `🔍 Tìm thấy nhiều kết quả, vui lòng chọn chính xác ID hoặc Name:\n\n${list}`,
                  },
                ],
              };
            }
            channel = results[0];
          }
        }

        return {
          content: [{ type: 'text', text: formatChannelInfo(channel) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi lấy thông tin channel: ${message}` }],
        };
      }
    }
  );
}
