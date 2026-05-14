# Agent Overview - mcp-chatops

> File này được Antigravity tự động đọc khi làm việc với project.
> Tương đương `CLAUDE.md` trong Claude Code.
> Xem `.agents/` để biết chi tiết từng phần.

## Mục đích
MCP Server tích hợp với **ChatOps** (Bản fork của Mattermost).  
Cung cấp khả năng cho AI assistant tương tác toàn diện với ChatOps: truy vấn users, channels, quản lý tin nhắn, và thực hiện các nghiệp vụ automation (như tìm lịch sử xin nghỉ, báo cáo tiến độ, v.v.). Dự án được thiết kế để dễ dàng mở rộng thêm nhiều tool nghiệp vụ khác.

---

## Cấu trúc Agent Context

| Loại | Đường dẫn | Mô tả |
|------|----------|-------|
| **Rules** | `.agents/rules/` | Quy tắc bắt buộc phải tuân theo |
| **Skills** | `.agents/skills/` | Hướng dẫn kỹ thuật, tham khảo khi cần |

### Rules (bắt buộc)
- `.agents/rules/coding-rules.md` — ESM imports, logging, error handling
- `.agents/rules/auth-rules.md` — Định dạng CHATOPS_COOKIE, CHATOPS_CSRF
- `.agents/rules/security-rules.md` — Kiểm tra bảo mật sau mỗi lần code

### Skills (tham khảo khi cần)
- `.agents/skills/chatops-api/` — Tra cứu endpoints, types, ví dụ gọi API
- `.agents/skills/add-new-tool/` — Hướng dẫn thêm MCP tool mới
- `.agents/skills/pagination-pattern/` — Pattern phân trang cho channel bận rộn
- `.agents/skills/security-check/` — Quy trình kiểm tra bảo mật trước publish
- `.agents/skills/write-action-safety/` — Phòng thủ prompt injection cho write actions
- `.agents/skills/chrome-extension/` — Hướng dẫn phát triển Chrome Extension

---

## Tech Stack
| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js >= 20 |
| Language | TypeScript (ESM, Node16) |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Schema validation | `zod` |
| HTTP Client | `axios` |
| Test | `vitest` |
| Transport | `StdioServerTransport` |

---

## Project Structure
```
chatops_mcp/
├── AGENTS.md                       ← File này
├── .agents/
│   ├── rules/                      ← Quy tắc bắt buộc
│   │   ├── coding-rules.md
│   │   └── auth-rules.md
│   └── skills/                     ← Hướng dẫn kỹ thuật
│       ├── chatops-api/SKILL.md
│       ├── add-new-tool/SKILL.md
│       └── pagination-pattern/SKILL.md
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── chatops/
│   │   ├── client.ts               ← Axios HTTP client (Cookie/CSRF)
│   │   ├── types.ts
│   │   └── api/                    ← users, channels, posts, teams
│   ├── tools/                      ← MCP tools
│   └── utils/                      ← date, formatter
├── tests/                          ← Unit tests (vitest)
├── chrome-extension/               ← Chrome Extension (UI thay thế AI)
│   ├── src/api/                    ← API client (port từ MCP)
│   ├── popup/                      ← Popup UI
│   ├── sidepanel/                  ← Side Panel UI
│   └── settings/                   ← Settings page
├── .env.example
└── .vscode/mcp.json
```

---

## Authentication
Cấu hình trong `.env`:
- `CHATOPS_URL`: `https://chat.runsystem.vn`
- `CHATOPS_COOKIE`: Định dạng `MMAUTHTOKEN=...`
- `CHATOPS_CSRF`: Định dạng `MMCSRF=...`
- `CHATOPS_TEAM_NAME`: Slug của team mặc định (ví dụ: `dn`)
