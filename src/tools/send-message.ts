import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { postMessage, uploadFile } from '../chatops/api/posts.js';
import { getMyProfile, getUserByEmail } from '../chatops/api/users.js';
import { getOrCreateDMChannel } from '../chatops/api/channels.js';
import { popPending } from './pending-messages.js';

const DEFAULT_EMAIL_DOMAIN = 'runsystem.net';

/**
 * Chuyển username hoặc email sang email đầy đủ.
 * Nếu đã có '@' thì giữ nguyên, ngược lại thêm domain mặc định.
 */
function resolveEmail(identifier: string): string {
  if (identifier.includes('@')) return identifier;
  return `${identifier}@${DEFAULT_EMAIL_DOMAIN}`;
}

export function registerSendMessage(server: McpServer): void {
  server.registerTool(
    'send-message',
    {
      title: 'Gửi tin nhắn đã xác nhận',
      description:
        'Gửi thật tin nhắn đã được xem trước bởi tool `preview-message`. ' +
        'Yêu cầu `pending_id` trả về từ `preview-message`.\n\n' +
        '**Quy trình bắt buộc:**\n' +
        '1. Gọi `preview-message` trước để tạo preview và nhận `pending_id`.\n' +
        '2. Sau khi user xác nhận, gọi `send-message(pending_id=...)` để gửi thật.\n\n' +
        '**Lưu ý:** `pending_id` hết hạn sau 5 phút kể từ lúc tạo.',
      annotations: {
        // Đây là write action — client sẽ hiển thị cảnh báo trước khi gọi
        destructiveHint: true,
        readOnlyHint: false,
        openWorldHint: false,
      },
      inputSchema: z.object({
        pending_id: z
          .string()
          .describe(
            'ID xác nhận nhận được từ tool `preview-message`. ' +
            'Hết hạn sau 5 phút kể từ khi tạo.'
          ),
      }),
    },
    async ({ pending_id }) => {
      try {
        // --- Lấy tin nhắn từ cache ---
        const pending = popPending(pending_id);

        if (!pending) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text:
                `❌ pending_id="${pending_id}" không tồn tại hoặc đã hết hạn.\n` +
                'Vui lòng gọi lại `preview-message` để tạo preview mới.',
            }],
          };
        }

        const { message, channelId, user_email, parentId, filePaths, targetDisplay: cachedTargetDisplay } = pending;

        // --- Xác định channel thực tế để gửi (targetDisplay đã được lưu sẵn từ preview-message) ---
        let resolvedChannelId = channelId;

        if (user_email) {
          const email = resolveEmail(user_email);
          console.error(`[send-message] Resolving DM channel: "${user_email}" → "${email}"`);
          const me = await getMyProfile();
          const targetUser = await getUserByEmail(email);
          const dmChannel = await getOrCreateDMChannel(me.id, targetUser.id);
          resolvedChannelId = dmChannel.id;
          console.error(`[send-message] Đã resolve DM channel: ${resolvedChannelId}`);
        }

        // --- Upload file nếu có ---
        const fileIds: string[] = [];
        if (filePaths && filePaths.length > 0) {
          console.error(`[send-message] Đang upload ${filePaths.length} file...`);
          for (const filePath of filePaths) {
            const fileId = await uploadFile(resolvedChannelId!, filePath);
            fileIds.push(fileId);
            console.error(`[send-message] Đã upload: ${filePath} → id=${fileId}`);
          }
        }

        // --- Gửi tin nhắn thật ---
        console.error(`[send-message] Đang gửi tin nhắn đến channel=${resolvedChannelId}`);
        await postMessage({ message, channelId: resolvedChannelId!, parentId, fileIds });

        const resultLines = [
          '✅ Gửi tin nhắn thành công!',
          cachedTargetDisplay,
          `💬 Nội dung: ${message}`,
          parentId ? `↩️ Reply to post: ${parentId}` : null,
          fileIds.length > 0 ? `📎 Đã gửi kèm ${fileIds.length} file(s)` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return { content: [{ type: 'text', text: resultLines }] };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[send-message] ❌ Lỗi: ${errorMsg}`);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi gửi tin nhắn: ${errorMsg}` }],
        };
      }
    },
  );
}
