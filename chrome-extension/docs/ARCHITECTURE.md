# Architecture — ChatOps Chrome Extension

## Tổng quan

Chrome Extension Manifest V3 kế thừa toàn bộ chức năng của ChatOps MCP Server, chuyển từ mô hình AI → MCP Tool sang mô hình User → Browser UI → API trực tiếp.

## Data Flow

```
┌─────────────────────────────────────────┐
│              Chrome Extension            │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │  Popup   │  │Side Panel│             │
│  └────┬─────┘  └─────┬────┘             │
│       │               │                  │
│  ┌────▼───────────────▼────┐            │
│  │     API Client Module    │            │
│  │   (src/api/client.js)    │            │
│  │   - fetch() + auth      │            │
│  │   - Chrome Storage config│            │
│  └────────────┬─────────────┘            │
│               │                          │
│  ┌────────────▼─────────────┐            │
│  │   Background Service     │            │
│  │   Worker                 │            │
│  │   - Periodic alarms     │            │
│  │   - Badge updates       │            │
│  │   - Message passing     │            │
│  └──────────────────────────┘            │
└──────────────┬───────────────────────────┘
               │ fetch() + credentials
               ▼
       ChatOps API v4
    (chat.runsystem.vn)
```

## Modules

### API Client (`src/api/client.js`)

**Vai trò:** HTTP client trung tâm, mọi API call đều đi qua đây.

- **Auth injection:** Đọc cookie/csrf từ `chrome.storage.local`, tự động inject vào headers
- **Config caching:** Cache config trong memory, reset khi user thay đổi settings
- **Error handling:** Map HTTP status → error message tiếng Việt (giống MCP)
- **Credentials mode:** Dùng `credentials: 'include'` để browser tự gửi cookie nếu cùng domain

### API Modules (`src/api/`)

Port 1:1 từ MCP TypeScript → vanilla JS:

| Module | Endpoints | Ghi chú |
|---|---|---|
| `users.js` | `/users/me`, `/users/{id}`, `/users/email/{email}`, `/users/search` | |
| `channels.js` | `/channels/{id}`, `/teams/{teamId}/channels/search`, `/channels/direct` | |
| `posts.js` | `/channels/{id}/posts`, `/teams/{teamId}/posts/search`, `/posts/{id}/thread` | Có pagination helper |
| `teams.js` | `/teams/name/{name}`, `/users/me/teams` | |

### Background Service Worker (`src/background.js`)

- **Periodic alarm:** Mỗi 5 phút check `mention_count` từ `getMyChannelMembers()`
- **Badge update:** Hiển thị tổng mention chưa đọc trên icon extension
- **Message passing:** Xử lý yêu cầu từ popup/sidepanel (mở side panel, force check, etc.)

### Utilities (`src/utils/`)

- **`date.js`:** Native JS (không dùng date-fns). Format VN, parse ISO, week ranges.
- **`formatter.js`:** Text + HTML rendering. `escapeHtml()` để ngăn XSS. Render cards, post lists.

## Authentication Strategy

Extension hỗ trợ 2 phương thức xác thực:

1. **Cookie + CSRF (Recommended):**
   - User nhập `MMAUTHTOKEN=...` và `MMCSRF=...` trong Settings
   - Client inject vào `cookie` header và `x-csrf-token` header
   - Phù hợp với ChatOps fork (Mattermost)

2. **Auto-detect (tương lai):**
   - Extension có `host_permissions` cho domain ChatOps
   - Có thể dùng `chrome.cookies.get()` để tự lấy token
   - Giảm thiểu config thủ công cho user

## MCP → Extension Mapping

| MCP Tool | Extension Implementation |
|---|---|
| `get_my_info` | Popup: profile card (auto-load on open) |
| `get_user` | Popup: search type=users / SidePanel: Users tab |
| `get_channel_info` | SidePanel: Channels tab (click channel) |
| `get_channel_posts` | SidePanel: Channel posts viewer |
| `get_dm_posts` | (Merged into channel posts) |
| `get_thread_posts` | SidePanel: Thread viewer (via post reactions) |
| `search_posts` | Popup: quick search / SidePanel: Search tab with filters |
| `find_leave_requests` | SidePanel: Leave tracker tab |
| `preview-message` + `send-message` | Popup: Quick Message composer (gửi trực tiếp) |
| `check-missed-mentions` | Popup: mention badge / SidePanel: Mentions tab (deep scan) |

## Design Decisions

1. **Vanilla JS (no framework):** Giảm bundle size, load nhanh, phù hợp với extension đơn giản.
2. **No build step:** Source chạy trực tiếp trong Chrome — dev nhanh, debug dễ.
3. **fetch() thay vì axios:** Có sẵn trong browser, không cần dependency.
4. **Native date functions:** Thay thế date-fns bằng JS native — giảm ~30KB.
5. **Dark theme mặc định:** Phù hợp với aesthetic hiện đại và giảm mỏi mắt.
