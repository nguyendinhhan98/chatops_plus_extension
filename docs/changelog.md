# Changelog — mcp-chatops

## [Unreleased] — 2026-04-26

### Khởi tạo dự án
- Khởi tạo project Node.js + TypeScript (ESM, Node16)
- Tích hợp MCP SDK (`@modelcontextprotocol/sdk`)
- Cấu hình transport `StdioServerTransport`

### ChatOps API Client
- Triển khai Axios HTTP client tại `src/chatops/client.ts`
- Hỗ trợ xác thực qua **Browser Session Cookie** (`MMAUTHTOKEN=`) và **CSRF Token** (`MMCSRF=`)
- Tự động strip prefix `MMCSRF=` khi inject vào header `x-csrf-token`
- Fallback sang Bearer Token hoặc Username/Password nếu không có cookie

### API Modules (`src/chatops/api/`)
- `users.ts`: getUserById, getUserByEmail, getUserByUsername, searchUsers, getUsersByIds
- `channels.ts`: getChannelById, getChannelByName, searchChannels, getPublicChannels
- `posts.ts`: getChannelPosts, searchPosts, getAllChannelPostsInRange (tự xử lý pagination)
- `teams.ts`: getTeamByName, getTeamById, getMyTeams

### MCP Tools (`src/tools/`)
- `get_user`: Tra cứu user theo ID/email/username/search
- `get_channel_info`: Lấy metadata + ID channel
- `get_channel_posts`: Đọc tin nhắn có phân trang
- `search_posts`: Tìm kiếm với ChatOps search syntax
- `find_leave_requests`: Tổng hợp lịch sử xin trễ/nghỉ (tool nghiệp vụ)

### Pagination Fix
- Sửa lỗi phân trang khi dùng tham số `since` + `page` (không tương thích với ChatOps API)
- Chuyển sang dùng `before` ID để phân trang — đảm bảo lấy đủ dữ liệu

### Rebranding
- Đổi tên toàn bộ từ "Mattermost" sang **"ChatOps"** (ChatOps là bản fork của Mattermost)
- Di chuyển `src/mattermost/` → `src/chatops/`
- Đổi TypeScript interfaces: `MattermostUser` → `ChatOpsUser`, v.v.
- Đổi env vars: `MATTERMOST_*` → `CHATOPS_*` (backward compatible)

### Cấu trúc Agent Context
- Tạo `AGENTS.md` ở root (tương đương CLAUDE.md cho Claude Code)
- Tạo `.agents/rules/` với `coding-rules.md` và `auth-rules.md`
- Tạo `.agents/skills/` với 3 skills: `chatops-api`, `add-new-tool`, `pagination-pattern`
- Xóa thư mục `.agent/` cũ (cấu trúc không chuẩn)

### Unit Tests
- Cài đặt `vitest` làm test runner
- Viết 13 unit tests cho `src/utils/date.ts`
- Scripts: `pnpm test`, `pnpm test:watch`

### Documentation (`docs/`)
- `docs/architecture.md`: Kiến trúc tổng thể, flow diagram, design decisions
- `docs/tools-catalog.md`: Danh sách tất cả tools với input/output
- `docs/changelog.md`: File này
