# Kiến trúc Hệ thống — mcp-chatops

## Tổng quan

MCP Server (Model Context Protocol) cho phép AI assistant tương tác trực tiếp với hệ thống **ChatOps** của tổ chức. Server chạy dưới dạng subprocess, giao tiếp với AI client qua stdio.

```
AI Client (VS Code / Antigravity)
        │  JSON-RPC over stdio
        ▼
 ┌──────────────────┐
 │   src/index.ts   │  ← Entry point, khởi tạo McpServer
 └────────┬─────────┘
          │ registerAllTools()
          ▼
 ┌──────────────────┐
 │  src/tools/      │  ← 5 MCP tools (get_user, search_posts, ...)
 └────────┬─────────┘
          │ gọi API functions
          ▼
 ┌──────────────────────┐
 │  src/chatops/api/    │  ← users, channels, posts, teams
 └────────┬─────────────┘
          │ httpClient (Axios)
          ▼
 ┌──────────────────────┐
 │  src/chatops/        │
 │  client.ts           │  ← Inject Cookie + CSRF headers
 └────────┬─────────────┘
          │ HTTPS
          ▼
    ChatOps API v4
  (chat.runsystem.vn)
```

## Cấu trúc thư mục

```
chatops_mcp/
├── AGENTS.md                    ← Tổng quan cho AI agent (đọc đầu tiên)
├── .agents/
│   ├── rules/                   ← Quy tắc bắt buộc AI phải tuân theo
│   │   ├── coding-rules.md
│   │   └── auth-rules.md
│   └── skills/                  ← Hướng dẫn kỹ thuật tham khảo khi cần
│       ├── chatops-api/SKILL.md
│       ├── add-new-tool/SKILL.md
│       └── pagination-pattern/SKILL.md
├── src/
│   ├── index.ts                 ← Entry point
│   ├── config.ts                ← Đọc env vars, validate với Zod
│   ├── chatops/
│   │   ├── client.ts            ← Axios instance, Cookie/CSRF interceptor
│   │   ├── types.ts             ← ChatOpsUser, ChatOpsPost, v.v.
│   │   └── api/
│   │       ├── users.ts
│   │       ├── channels.ts
│   │       ├── posts.ts
│   │       └── teams.ts
│   ├── tools/
│   │   ├── index.ts             ← Đăng ký tất cả tools
│   │   ├── get-user.ts
│   │   ├── get-channel-info.ts
│   │   ├── get-channel-posts.ts
│   │   ├── search-posts.ts
│   │   └── find-leave-requests.ts
│   └── utils/
│       ├── date.ts              ← Week ranges, Unix ms, format VN
│       └── formatter.ts         ← Format output cho user/channel/post
├── tests/
│   └── utils/
│       └── date.test.ts         ← Unit tests (vitest)
├── docs/                        ← Tài liệu kỹ thuật
│   ├── architecture.md          ← File này
│   ├── tools-catalog.md         ← Danh sách tools
│   └── changelog.md             ← Lịch sử thay đổi
├── scratch/                     ← Script tạm thời
├── .env.example
├── .vscode/mcp.json
└── package.json
```

## Authentication Flow

```
.env
  CHATOPS_COOKIE=MMAUTHTOKEN=xxx  ──┐
  CHATOPS_CSRF=MMCSRF=yyy          ─┼─→ config.ts (Zod validate)
  CHATOPS_URL=https://...           ─┘        │
  CHATOPS_TEAM_NAME=dn              ──────────┘
                                              │
                                    client.ts interceptor
                                              │
                              headers['cookie'] = MMAUTHTOKEN=xxx
                              headers['x-csrf-token'] = yyy  ← strip MMCSRF=
```

## Quyết định thiết kế

| Quyết định | Lý do |
|-----------|-------|
| Cookie auth thay vì Bearer token | ChatOps fork yêu cầu session cookie |
| Pagination dùng `before` ID | `since` + `page` bị giới hạn bởi ChatOps API |
| `console.error()` thay vì `console.log()` | stdout dành riêng cho MCP protocol |
| ESM module với `.js` extension | TypeScript Node16 resolution |
| Tách `tools/` và `chatops/api/` | Core API có thể tái sử dụng cho nhiều tools |
