import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getMyProfile, getUserByEmail } from '../chatops/api/users.js';
import { getOrCreateDMChannel, getChannelById } from '../chatops/api/channels.js';
import { savePending } from './pending-messages.js';

const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_EMAIL_DOMAIN = 'runsystem.net';

/**
 * Chuyển username hoặc email sang email đầy đủ.
 * Nếu đã có '@' thì giữ nguyên, ngược lại thêm domain mặc định.
 */
function resolveEmail(identifier: string): string {
  if (identifier.includes('@')) return identifier;
  return `${identifier}@${DEFAULT_EMAIL_DOMAIN}`;
}

export function registerPreviewMessage(server: McpServer): void {
  server.registerTool(
    'preview-message',
    {
      title: 'Xem trước tin nhắn trước khi gửi',
      description:
        'Tạo bản xem trước tin nhắn và lưu vào hàng chờ. ' +
        'Trả về `pending_id` để xác nhận gửi thật bằng tool `send-message`.\n\n' +
        '**Quan trọng:** Tool này KHÔNG gửi tin nhắn thật. ' +
        'Phải gọi `send-message(pending_id=...)` sau khi user xác nhận.\n\n' +
        '**Cách dùng:**\n' +
        '- Gửi DM cho user: truyền `user_email` (ví dụ: "hannd" hoặc "hannd@runsystem.net").\n' +
        '- Gửi vào channel: truyền `channelId` (dùng get_channel_info để lấy ID).\n' +
        '- Phải truyền ít nhất 1 trong 2: `user_email` hoặc `channelId`.',
      annotations: {
        // Tool này chỉ đọc + lưu cache, không ghi vào ChatOps
        destructiveHint: false,
        readOnlyHint: false,
        openWorldHint: false,
      },
      inputSchema: z.object({
        message: z
          .string()
          .max(MAX_MESSAGE_LENGTH)
          .describe('Nội dung tin nhắn cần gửi. Tối đa 4000 ký tự.'),
        channelId: z
          .string()
          .optional()
          .describe('ID của channel cần gửi. Dùng get_channel_info để lấy ID. Không cần nếu đã truyền user_email.'),
        user_email: z
          .string()
          .optional()
          .describe(
            'Username hoặc email của người nhận DM. ' +
            'Nếu chỉ truyền username (vd: "hannd"), tool sẽ tự thêm @runsystem.net. ' +
            'Nếu truyền đầy đủ email (vd: "hannd@runsystem.net") cũng OK. ' +
            'Không cần nếu đã truyền channelId.'
          ),
        parentId: z
          .string()
          .optional()
          .describe('ID của post gốc nếu muốn reply vào một thread. Bỏ trống nếu gửi tin nhắn mới.'),
        filePaths: z
          .array(z.string())
          .optional()
          .describe(
            'Danh sách đường dẫn tuyệt đối đến các file/ảnh cần gửi kèm. ' +
            'Ví dụ: ["/Users/hannd/Desktop/screenshot.png"]'
          ),
      }),
    },
    async ({ message, channelId, user_email, parentId, filePaths }) => {
      try {
        // Kiểm tra: phải có ít nhất 1 trong 2 target
        if (!channelId && !user_email) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: '❌ Phải truyền ít nhất 1 trong 2: `channelId` hoặc `user_email`.',
            }],
          };
        }

        // --- Xác định target hiển thị trong preview ---
        let targetDisplay = '';

        if (user_email) {
          const email = resolveEmail(user_email);
          console.error(`[preview-message] Resolving DM target: "${user_email}" → "${email}"`);

          const me = await getMyProfile();
          const targetUser = await getUserByEmail(email);
          // Tạo DM channel để verify user tồn tại, nhưng lưu email để send-message resolve lại
          await getOrCreateDMChannel(me.id, targetUser.id);
          targetDisplay = `👤 DM → @${targetUser.username} (${targetUser.email})`;
          console.error(`[preview-message] Verified DM target: ${targetUser.username}`);
        } else if (channelId) {
          try {
            const channelInfo = await getChannelById(channelId);
            const typeLabel =
              channelInfo.type === 'O' ? 'Public' :
              channelInfo.type === 'P' ? 'Private' :
              channelInfo.type === 'G' ? 'Group' : 'DM';
            targetDisplay = `📢 ${typeLabel} Channel: ${channelInfo.display_name || channelInfo.name}`;
          } catch {
            targetDisplay = `🆔 Channel ID: ${channelId}`;
          }
        }

        // --- Lưu vào cache và sinh pending_id (bao gồm targetDisplay để send-message hiển thị lại) ---
        const pendingId = savePending({ message, channelId, user_email, parentId, filePaths, targetDisplay });

        const previewLines = [
          '📝 **[XEM TRƯỚC - CHƯA GỬI]**',
          '',
          `📨 Gửi đến: ${targetDisplay}`,
          `💬 Nội dung:\n${message}`,
          parentId ? `↩️ Reply to post: ${parentId}` : null,
          filePaths && filePaths.length > 0 ? `📎 File đính kèm: ${filePaths.join(', ')}` : null,
          '',
          '─────────────────────────────',
          `🔑 pending_id: "${pendingId}"`,
          '─────────────────────────────',
          '',
          '👆 Hãy hiển thị toàn bộ thông tin trên cho user xác nhận.',
          'Nếu user đồng ý → gọi `send-message` với pending_id.',
          'Nếu user từ chối → KHÔNG gọi `send-message`.',
          '⏰ pending_id hết hạn sau 5 phút.',
        ]
          .filter((line) => line !== null)
          .join('\n');

        return { content: [{ type: 'text', text: previewLines }] };

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[preview-message] ❌ Lỗi: ${errorMsg}`);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi tạo preview: ${errorMsg}` }],
        };
      }
    },
  );
}
