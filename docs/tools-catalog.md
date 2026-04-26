# Tools Catalog — mcp-chatops

Danh sách tất cả MCP tools đã implement. AI assistant có thể gọi các tool này.

---

## 1. `get_user`
**File**: `src/tools/get-user.ts`

Tra cứu thông tin người dùng trong ChatOps.

| Input | Type | Mô tả |
|-------|------|-------|
| `identifier` | `string` | ID, email, username, hoặc từ khóa tìm kiếm |
| `by` | `'id' \| 'email' \| 'username' \| 'search'` | Loại định danh (mặc định: `email`) |

**Ví dụ**: *"Tìm thông tin user hannd@runsystem.net"*

---

## 2. `get_channel_info`
**File**: `src/tools/get-channel-info.ts`

Lấy metadata và ID của một channel từ tên slug hoặc display name.

| Input | Type | Mô tả |
|-------|------|-------|
| `channel_name` | `string` | Tên channel (slug hoặc display name) |
| `team_name` | `string?` | Slug team (mặc định lấy từ config) |

**Ví dụ**: *"Lấy ID của channel [DN] CHECK.OFF.LATER"*

---

## 3. `get_channel_posts`
**File**: `src/tools/get-channel-posts.ts`

Lấy danh sách tin nhắn từ một channel, hỗ trợ phân trang và lọc thời gian.

| Input | Type | Mô tả |
|-------|------|-------|
| `channel_id` | `string` | ID của channel (lấy từ `get_channel_info`) |
| `page` | `number?` | Trang (mặc định: 0) |
| `per_page` | `number?` | Số tin nhắn/trang (1-200, mặc định: 30) |
| `since` | `string?` | Lọc tin nhắn sau ngày này (ISO format) |
| `include_authors` | `boolean?` | Kèm thông tin người gửi (mặc định: true) |

---

## 4. `search_posts`
**File**: `src/tools/search-posts.ts`

Tìm kiếm tin nhắn với cú pháp ChatOps search.

| Input | Type | Mô tả |
|-------|------|-------|
| `terms` | `string` | Từ khóa + modifiers |
| `is_or_search` | `boolean?` | Dùng logic OR (mặc định: false/AND) |
| `team_name` | `string?` | Team để tìm kiếm |

**Modifiers**: `from:username`, `in:channel-slug`, `on:YYYY-MM-DD`, `before:`, `after:`

**Ví dụ**: *"Tìm tin nhắn 'xin nghỉ' của hannd trong channel checkoff-later tháng 4"*

---

## 5. `find_leave_requests`
**File**: `src/tools/find-leave-requests.ts`

Tool nghiệp vụ: Tự động tổng hợp lịch sử xin trễ/nghỉ của một người dùng trong một channel.

| Input | Type | Mô tả |
|-------|------|-------|
| `user_email` | `string` | Email người cần tra cứu |
| `channel_name` | `string` | Tên channel |
| `date_from` | `string?` | Từ ngày (mặc định: Thứ 2 tuần trước) |
| `date_to` | `string?` | Đến ngày (mặc định: Chủ nhật tuần trước) |
| `team_name` | `string?` | Team slug |

**Ví dụ**: *"Kiểm tra xxx@runsystem.net đã xin nghỉ bao nhiêu lần trong tháng này"*

---

## Thêm Tool Mới

Xem hướng dẫn tại `.agents/skills/add-new-tool/SKILL.md`.
