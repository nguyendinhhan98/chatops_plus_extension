# mcp-chatops

> **Trợ lý AI tích hợp ChatOps** — Cho phép AI assistant (Antigravity, Claude Code, Cursor, Copilot...) đọc tin nhắn, tìm kiếm, gửi tin, và thực hiện các nghiệp vụ tự động trực tiếp trên hệ thống **ChatOps** (Mattermost) của tổ chức.

---

## ✨ Tính năng nổi bật

| Nhóm | Mô tả |
|------|-------|
| 👤 **Tra cứu người dùng** | Tìm thông tin thành viên theo email, username, hoặc từ khoá |
| 📢 **Đọc tin nhắn channel** | Xem lịch sử chat, thread, DM — theo thời gian hoặc phân trang |
| 🔍 **Tìm kiếm nâng cao** | Tìm tin nhắn với bộ lọc: người gửi, channel, ngày tháng |
| 🔔 **Kiểm tra mention bị bỏ lỡ** | Tự động phát hiện @mention chưa reply hoặc chưa reaction |
| 📨 **Gửi tin nhắn an toàn** | Gửi tin 2 bước (xem trước → xác nhận) để tránh gửi nhầm |
| 📋 **Nghiệp vụ xin nghỉ/trễ** | Tổng hợp lịch sử xin trễ/nghỉ của từng thành viên |
| 🖇️ **Gửi kèm tệp & Ảnh** | Hỗ trợ gửi file, ảnh trực tiếp từ máy tính vào chat |

---

## 🚀 Hướng dẫn Cài đặt (Manual)

Vì lý do bảo mật và linh hoạt, chúng tôi khuyến khích bạn cài đặt trực tiếp từ Source Code và cấu hình thủ công vào IDE.

### 1. Chuẩn bị (Local)

```bash
# Clone repository
git clone https://github.com/nguyendinhhan98/mcp-chatops.git
cd mcp-chatops

# Cài đặt dependencies & Build
npm install
npm run build
```

> [!TIP]
> Để lấy **đường dẫn tuyệt đối** của thư mục hiện tại, hãy gõ lệnh `pwd` vào Terminal. Bạn sẽ cần đường dẫn này để điền vào phần `args` bên dưới.

### 2. Cấu hình vào AI Client

Bạn chỉ cần copy đoạn cấu hình dưới đây và dán vào file setting của IDE bạn đang dùng. Thay `/đường/dẫn/tới/` bằng kết quả lệnh `pwd` ở trên.

#### Cho Cursor / Claude Desktop / Antigravity
File: `.cursor/mcp.json`, `claude_desktop_config.json` hoặc `~/.gemini/antigravity/mcp_config.json`
```json
{
  "mcpServers": {
    "mcp-chatops": {
      "command": "node",
      "args": ["/đường/dẫn/tới/mcp-chatops/dist/index.js"],
      "env": {
        "CHATOPS_URL": "https://chat.runsystem.vn",
        "CHATOPS_COOKIE": "MMAUTHTOKEN=...",
        "CHATOPS_CSRF": "MMCSRF=...",
        "CHATOPS_TEAM_NAME": "dn"
      }
    }
  }
}
```

#### Cho VS Code
Hiện tại **GitHub Copilot Chat** chưa hỗ trợ MCP chính thức.

---

## 🔑 Cách lấy Cookie & CSRF từ trình duyệt
1. Đăng nhập ChatOps → Nhấn **F12** → tab **Network**.
2. Click vào một request `/api/v4/...` bất kỳ.
3. Trong **Request Headers**, copy:
   - `Cookie:` phần `MMAUTHTOKEN=...`
   - `x-csrf-token:` giá trị và thêm prefix `MMCSRF=`

---

## ⚙️ Biến môi trường

| Biến | Bắt buộc | Mô tả | Ví dụ |
|------|:--------:|-------|-------|
| `CHATOPS_URL` | ✅ | URL server ChatOps | `https://chat.runsystem.vn` |
| `CHATOPS_COOKIE` | ✅ | Session cookie | `MMAUTHTOKEN=abc123...` |
| `CHATOPS_CSRF` | ✅ | CSRF token | `MMCSRF=def456...` |
| `CHATOPS_TEAM_NAME` | ❌ | Team mặc định | `dn` hoặc `runsystem` |

---

## 🛠️ Danh sách đầy đủ các chức năng (11 tools)

### 📋 Bảng tóm tắt nhanh

| Tool | Làm gì | Ví dụ nhanh |
|------|--------|-------------|
| `get_my_info` | Xem profile của mình | *"Tài khoản ChatOps của tôi?"* |
| `get_user` | Tìm thông tin người khác | *"Tìm user hannd@runsystem.net"* |
| `get_channel_info` | Xem thông tin channel | *"ID của channel CHECK.OFF.LATER?"* |
| `get_channel_posts` | Đọc tin nhắn trong channel | *"20 tin nhắn mới nhất trong channel devops"* |
| `get_dm_posts` | Đọc tin nhắn riêng (DM) | *"Xem DM với hannd"* |
| `get_thread_posts` | Đọc replies trong thread | *"Xem toàn bộ replies của post này: [link]"* |
| `search_posts` | Tìm kiếm tin nhắn | *"Tìm 'hotfix' từ hannd trong tháng 4"* |
| `check-missed-mentions` | Phát hiện @mention bị bỏ lỡ | *"Tôi có mention nào bị miss 7 ngày qua?"* |
| `preview-message` | Soạn & xem trước tin nhắn | *"Soạn tin gửi cho hannd: 'Review PR nha'"* |
| `send-message` | Gửi tin sau khi xác nhận | *(Gọi sau `preview-message`)* |
| `find_leave_requests` | Tra cứu lịch sử xin nghỉ/trễ | *"hannd xin nghỉ bao nhiêu lần tháng này?"* |

---

### 📖 Mô tả chi tiết

### 👤 Quản lý người dùng

---

#### `get_my_info` — Xem thông tin tài khoản của mình

> Lấy profile của chính bạn đang đăng nhập.

**Ví dụ câu hỏi cho AI:**
- *"Tài khoản ChatOps của tôi là gì?"*
- *"Email và username của tôi trên ChatOps?"*

---

#### `get_user` — Tìm thông tin người dùng khác

> Tìm kiếm thành viên theo email, username, ID, hoặc từ khoá mờ (tên, biệt danh...).

**Ví dụ câu hỏi cho AI:**
- *"Tìm thông tin user hannd@runsystem.net"*
- *"Profile của @hannd là ai?"*
- *"Tìm user tên Hân trong hệ thống"*

---

### 📢 Đọc tin nhắn

---

#### `get_channel_info` — Xem thông tin channel

> Lấy thông tin chi tiết về một channel: tên, ID, loại (public/private), số tin nhắn.

**Ví dụ câu hỏi cho AI:**
- *"Thông tin channel [DN] CHECK.OFF.LATER là gì?"*
- *"ID của channel general là bao nhiêu?"*

---

#### `get_channel_posts` — Đọc tin nhắn trong channel

> Lấy danh sách tin nhắn từ một channel. Hỗ trợ phân trang và lọc theo thời gian.

**Ví dụ câu hỏi cho AI:**
- *"20 tin nhắn mới nhất trong channel devops"*
- *"Tin nhắn trong channel team từ ngày 21/04 đến nay"*
- *"Đọc 100 tin nhắn trang 2 trong channel general"*

---

#### `get_dm_posts` — Đọc tin nhắn riêng (Direct Message)

> Xem lịch sử tin nhắn trực tiếp giữa bạn và một người khác.

**Ví dụ câu hỏi cho AI:**
- *"Tin nhắn riêng giữa tôi và hannd@runsystem.net"*
- *"Xem DM với hannd"*

---

#### `get_thread_posts` — Đọc replies trong một thread

> Lấy toàn bộ tin nhắn trong một thread (bài gốc + tất cả replies).

**Ví dụ câu hỏi cho AI:**
- *"Xem tất cả replies của post này: [link]"*
- *"Đọc toàn bộ thread của bài post ID abc123"*

---

### 🔍 Tìm kiếm

---

#### `search_posts` — Tìm kiếm tin nhắn

> Tìm kiếm tin nhắn trong toàn bộ ChatOps với các bộ lọc mạnh mẽ.

**Cú pháp bộ lọc:**

| Bộ lọc | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `from:username` | Lọc theo người gửi | `from:hannd` |
| `in:channel-slug` | Lọc theo channel | `in:dn-check-off-later` |
| `on:YYYY-MM-DD` | Đúng ngày đó | `on:2026-04-21` |
| `after:YYYY-MM-DD` | Sau ngày đó | `after:2026-04-14` |
| `before:YYYY-MM-DD` | Trước ngày đó | `before:2026-05-01` |

**Ví dụ câu hỏi cho AI:**
- *"Tìm 'deploy' trong channel devops tuần này"*
- *"Tìm tin nhắn xin nghỉ của hannd từ đầu tháng"*
- *"Tìm từ khoá 'hotfix' do anh Hậu gửi trong tháng 4"*

---

### 🔔 Thông báo & Mention

---

#### `check-missed-mentions` — Phát hiện mention bị bỏ lỡ

> Tự động quét toàn bộ các channel bạn tham gia, tìm các tin nhắn có **@mention bạn** (cả `@all`, `@channel`, `@here`) mà bạn **chưa reply hoặc chưa reaction**.

**Logic thông minh:** Nếu đã reply hoặc đã thả reaction → **không tính là bị bỏ lỡ**.

**Ví dụ câu hỏi cho AI:**
- *"Tôi có mention nào bị bỏ lỡ trong 24h qua không?"*
- *"Check mention bị miss trong 7 ngày qua ở team runsystem"*
- *"Quét mention trong channel [DN.DU2] Team từ hôm qua"*

**Tham số tuỳ chỉnh:**
- `since_hours`: Khoảng thời gian quét (mặc định 24h, tối đa 336h = 14 ngày)
- `team_name`: Tên team cần quét (`dn`, `runsystem`...)
- `channel_id`: Chỉ quét một channel cụ thể
- `include_group_mentions`: Có tính `@all`, `@channel`, `@here` không (mặc định: có)

---

### 📨 Gửi tin nhắn

> [!IMPORTANT]
> Gửi tin nhắn là thao tác **không thể hoàn tác**. Tool này được thiết kế theo quy trình **2 bước bắt buộc** để tránh gửi nhầm.

#### Quy trình gửi tin nhắn:

```
Bước 1: preview-message  →  AI tạo bản xem trước + sinh pending_id
Bước 2: Bạn xác nhận     →  AI gọi send-message(pending_id) để gửi thật
```

---

#### `preview-message` — Tạo bản xem trước tin nhắn

> Soạn tin nhắn, kiểm tra thông tin người nhận. **Chưa gửi thật** — chỉ tạo preview để bạn xác nhận.
> Hỗ trợ gửi kèm file/ảnh.

**Ví dụ câu hỏi cho AI:**
- *"Soạn tin nhắn gửi cho hannd: 'Hân ơi review PR giúp mình với'"*
- *"Tạo preview tin nhắn gửi vào channel devops: 'Deploy xong rồi mọi người'"*
- *"Gửi ảnh /Desktop/screenshot.png vào DM với hannd kèm nội dung 'Lỗi này nè'"*

---

#### `send-message` — Gửi tin nhắn đã xác nhận

> Thực sự gửi tin nhắn sau khi bạn xác nhận ở bước preview. Yêu cầu `pending_id` từ bước trước.

> [!NOTE]
> `pending_id` **hết hạn sau 5 phút**. Nếu hết hạn, hãy tạo preview mới.

---

### 📋 Nghiệp vụ

---

#### `find_leave_requests` — Tra cứu lịch sử xin trễ/nghỉ

> Tìm kiếm và tổng hợp toàn bộ tin nhắn xin trễ/nghỉ phép của một thành viên trong một channel cụ thể, trong khoảng thời gian xác định. Tự động phân trang để không bỏ sót.

**Ví dụ câu hỏi cho AI:**
- *"hannd xin nghỉ bao nhiêu lần tuần trước trong channel CHECK.OFF.LATER?"*
- *"Lịch sử xin trễ của hannd@runsystem.net từ 01/04 đến 30/04"*
- *"Tổng hợp xin nghỉ phép của team DU2 trong tháng này"*

---

## 🔒 Bảo mật

- ✅ **Cookie chỉ lưu trên máy bạn** — trong file config của IDE, không upload đi đâu
- ✅ **Chạy hoàn toàn local** — cookie không đi qua bất kỳ server trung gian nào
- ✅ **Chỉ gọi tới `CHATOPS_URL` bạn cấu hình** — không kết nối ra ngoài
- ✅ **Source code open source** — ai cũng có thể audit
- ✅ **Gửi tin nhắn 2 bước** — bắt buộc xác nhận trước khi gửi thật

---

## 🔧 Xử lý sự cố thường gặp

**❌ Lỗi 401 — Authentication failed**
→ Cookie đã hết hạn. Đăng nhập lại ChatOps trên trình duyệt và lấy cookie mới.

**❌ Lỗi 404 — Channel not found**
→ Kiểm tra tên channel (dùng slug URL, không phải tên hiển thị). Hoặc bạn chưa join channel đó.

**❌ Lỗi "Vui lòng chỉ định team_name"**
→ Chưa set `CHATOPS_TEAM_NAME` trong config. Thêm biến này hoặc nói rõ trong câu hỏi: *"tìm trong team dn"*.



---

## 🧑‍💻 Phát triển (Development)

Nếu bạn là developer và muốn tham gia đóng góp cho dự án:

### Scripts hữu ích

```bash
npm run dev          # Chạy dev (tsx watch)
npm run build        # Build TypeScript → dist/
npm test             # Chạy unit tests (vitest)
npm run test:watch   # Chạy tests ở chế độ watch
npm run inspect      # MCP Inspector — debug tools trong trình duyệt
```

### Thêm tool mới

Xem hướng dẫn chi tiết tại [`.agents/skills/add-new-tool/SKILL.md`](.agents/skills/add-new-tool/SKILL.md)

### Cấu trúc thư mục

```
mcp-chatops/
├── src/
│   ├── index.ts              # Entry point MCP Server
│   ├── config.ts             # Đọc biến môi trường
│   ├── chatops/
│   │   ├── client.ts         # HTTP client (Cookie/CSRF auth)
│   │   ├── types.ts          # TypeScript types
│   │   └── api/              # Các module gọi API ChatOps
│   ├── tools/                # 11 MCP tools (mỗi file = 1 tool)
│   └── utils/                # Tiện ích: date, formatter
├── tests/                    # Unit tests (vitest)
├── .agents/                  # Hướng dẫn cho AI agent
│   ├── rules/                # Quy tắc coding bắt buộc
│   └── skills/               # Hướng dẫn kỹ thuật
└── .env.example              # Template biến môi trường
```

---

## 📋 Yêu cầu hệ thống

- **Node.js** >= 20
- Tài khoản **ChatOps** (Mattermost) đang hoạt động

## 📄 License

MIT
