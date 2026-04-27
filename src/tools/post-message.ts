import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { postMessage, uploadFile } from '../chatops/api/posts.js';

const MAX_MESSAGE_LENGTH = 4000;

export function registerPostMessage(server: McpServer): void {
  server.registerTool(
    'post-message',
    {
      title: 'Gửi tin nhắn vào ChatOps',
      description:
        'Gửi tin nhắn trực tiếp cho 1 user nào đó hoặc gửi trên group, trả lời 1 người nào đó trên group hoặc thread bất kỳ. Hỗ trợ gửi kèm ảnh/file. Mặc định dry_run=true (chỉ preview, không gửi thật).',
      annotations: {
        destructiveHint: true,
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
          .describe('ID của channel cần gửi. Dùng get_channel_info để lấy ID.'),
        parentId: z
          .string()
          .optional()
          .describe('ID của post gốc nếu muốn reply vào một thread. Bỏ trống nếu gửi tin nhắn mới.'),
        filePaths: z
          .array(z.string())
          .optional()
          .describe(
            'Danh sách đường dẫn tuyệt đối đến các file/ảnh trên máy tính cần gửi kèm. Ví dụ: ["/Users/hannd/Desktop/screenshot.png"]',
          ),
        dry_run: z
          .boolean()
          .default(false)
          .describe('true = chỉ xem preview (KHÔNG gửi thật). false = gửi thật. Mặc định false.'),
      }),
    },
    async ({ message, channelId, parentId, filePaths, dry_run }) => {
      // Gửi thật
      try {
        // Bước 1: Upload file nếu có
        const fileIds: string[] = [];
        if (filePaths && filePaths.length > 0) {
          console.error(`[post-message] Uploading ${filePaths.length} file(s)...`);
          for (const filePath of filePaths) {
            const fileId = await uploadFile(channelId, filePath);
            fileIds.push(fileId);
            console.error(`[post-message] Uploaded: ${filePath} → id=${fileId}`);
          }
        }

        // Bước 2: Gửi tin nhắn (kèm fileIds nếu có)
        console.error(`[post-message] Sending message to channel=${channelId}`);
        await postMessage({ message, channelId, parentId, fileIds });

        const resultLines = [
          `✅ Gửi tin nhắn thành công!`,
          `🆔 Channel ID: ${channelId}`,
          fileIds.length > 0 ? `📎 Đã gửi kèm ${fileIds.length} file(s)` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return { content: [{ type: 'text', text: resultLines }] };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[post-message] ❌ Error: ${errorMsg}`);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi gửi tin nhắn: ${errorMsg}` }],
        };
      }
    },
  );
}