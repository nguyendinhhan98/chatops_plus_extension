---
name: add-new-tool
description: Hướng dẫn thêm một MCP tool mới vào project. Dùng khi cần tạo tool mới để AI có thể gọi, hoặc mở rộng tool hiện có.
---

# Thêm MCP Tool Mới — Step by Step

## Bước 1: Xác định API cần gọi
Xem skill `chatops-api` để tìm endpoint phù hợp. Nếu chưa có hàm wrapper → thêm vào `src/chatops/api/<module>.ts`.

## Bước 2: Tạo file tool

`src/tools/<ten-tool>.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { someApiFunction } from '../chatops/api/some_module.js';
import { config } from '../config.js';

export function registerMyNewTool(server: McpServer): void {
  server.registerTool(
    'my_new_tool',
    {
      description: 'Mô tả rõ ràng để AI biết khi nào gọi tool này.',
      inputSchema: z.object({
        param1: z.string().describe('Mô tả param. Ví dụ: hannd@runsystem.net'),
        team_name: z.string().optional().describe(`Team slug. Mặc định: "${config.teamName}"`),
      }),
    },
    async ({ param1, team_name }) => {
      try {
        const result = await someApiFunction(param1);
        return { content: [{ type: 'text', text: `Kết quả: ${result}` }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text', text: `❌ Lỗi: ${message}` }] };
      }
    }
  );
}
```

## Bước 3: Đăng ký trong `src/tools/index.ts`

```typescript
import { registerMyNewTool } from './my-new-tool.js';
// Thêm vào hàm registerAllTools:
registerMyNewTool(server);
console.error('  ✅ my_new_tool');
```

## Bước 4: Format output

Dùng các hàm có sẵn trong `src/utils/formatter.ts`:
- `formatUserInfo(user)`, `formatChannelInfo(channel)`, `formatPostList(posts, usersMap)`

## Checklist
- [ ] Import có `.js` extension
- [ ] Mọi param có `.describe()`
- [ ] Wrap trong `try-catch`, return `isError: true` khi lỗi
- [ ] Đăng ký trong `index.ts`
- [ ] `npm run build` thành công
