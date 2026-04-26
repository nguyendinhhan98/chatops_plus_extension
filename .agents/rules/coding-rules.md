# Coding Rules — mcp-chatops

## 1. Logging
- ❌ **KHÔNG** dùng `console.log()` — sẽ phá vỡ giao thức JSON-RPC của MCP.
- ✅ **CHỈ** dùng `console.error()`.

## 2. ESM Imports
- ✅ Mọi file local import **PHẢI có `.js` extension**.
```typescript
// ✅ Đúng
import { config } from '../config.js';
// ❌ Sai
import { config } from '../config';
```

## 3. Error Handling
- ✅ Luôn wrap tool handler trong `try-catch`, trả về `isError: true`.
- ❌ **KHÔNG** throw error ra ngoài tool handler.

## 4. Tool Input Schema
- ✅ Mọi field **PHẢI có `.describe()`** — AI dùng để hiểu parameter.

## 5. HTTP Client
- ✅ Luôn dùng `httpClient` từ `src/chatops/client.ts`.
- ❌ **KHÔNG** tự tạo `axios.create()`.

## 6. Timestamp
- ✅ Luôn dùng **Unix milliseconds** với ChatOps API.
- ✅ Dùng `toUnixMs()` từ `src/utils/date.ts`.
