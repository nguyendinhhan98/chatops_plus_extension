# mcp-chatops

MCP Server cho **ChatOps** — Giúp AI assistant tương tác với hệ thống ChatOps (Mattermost fork) của tổ chức.

## ✨ Tính năng

- 👤 Tra cứu thông tin user, profile
- 📢 Xem thông tin channel, đọc tin nhắn
- 💬 Đọc tin nhắn riêng (Direct Message) giữa 2 người
- 🧵 Đọc thread replies
- 🔍 Tìm kiếm tin nhắn với bộ lọc nâng cao
- 📊 Tổng hợp lịch sử xin trễ/nghỉ (nghiệp vụ mẫu)
- 🔐 Cookie-based auth — chạy 100% local, an toàn

## 🚀 Cài đặt

### Bước 1: Lấy Cookie từ trình duyệt

1. Mở ChatOps (ví dụ: `https://chat.runsystem.vn`) → đăng nhập
2. Nhấn **F12** → Tab **Network**
3. Chọn bất kỳ request nào tới `/api/v4/...`
4. Trong **Request Headers**, copy:
   - `Cookie:` → giá trị `MMAUTHTOKEN=...`
   - `x-csrf-token:` → giá trị token (thêm prefix `MMCSRF=` phía trước)

### Bước 2: Thêm config vào AI client

#### VS Code (GitHub Copilot)
Mở **Settings (JSON)** (`Cmd+Shift+P` → `Open User Settings (JSON)`), thêm:
```json
{
  "mcp.servers": {
    "mcp-chatops": {
      "command": "node",
      "args": ["/đường/dẫn/tới/mcp-chatops/dist/index.js"],
      "env": {
        "CHATOPS_URL": "https://chat.runsystem.vn",
        "CHATOPS_COOKIE": "MMAUTHTOKEN=<your_token>",
        "CHATOPS_CSRF": "MMCSRF=<your_csrf>",
        "CHATOPS_TEAM_NAME": "dn"
      }
    }
  }
}
```

#### Cursor
Tạo file `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "mcp-chatops": {
      "command": "node",
      "args": ["/đường/dẫn/tới/mcp-chatops/dist/index.js"],
      "env": {
        "CHATOPS_URL": "https://chat.runsystem.vn",
        "CHATOPS_COOKIE": "MMAUTHTOKEN=<your_token>",
        "CHATOPS_CSRF": "MMCSRF=<your_csrf>",
        "CHATOPS_TEAM_NAME": "dn"
      }
    }
  }
}
```

#### Claude Desktop
Mở `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "mcp-chatops": {
      "command": "node",
      "args": ["/đường/dẫn/tới/mcp-chatops/dist/index.js"],
      "env": {
        "CHATOPS_URL": "https://chat.runsystem.vn",
        "CHATOPS_COOKIE": "MMAUTHTOKEN=<your_token>",
        "CHATOPS_CSRF": "MMCSRF=<your_csrf>",
        "CHATOPS_TEAM_NAME": "dn"
      }
    }
  }
}
```

#### Antigravity (Google)
Mở file `~/.gemini/antigravity/mcp_config.json`:
```json
{
  "mcpServers": {
    "mcp-chatops": {
      "command": "node",
      "args": ["/đường/dẫn/tới/mcp-chatops/dist/index.js"],
      "env": {
        "CHATOPS_URL": "https://chat.runsystem.vn",
        "CHATOPS_COOKIE": "MMAUTHTOKEN=<your_token>",
        "CHATOPS_CSRF": "MMCSRF=<your_csrf>",
        "CHATOPS_TEAM_NAME": "dn"
      }
    }
  }
}
```

> [!TIP]
> **Mẹo lấy đường dẫn nhanh:**
> - **Mac/Linux:** Chạy lệnh `echo $(pwd)/dist/index.js | pbcopy` trong terminal.
> - **Windows (PowerShell):** Chạy lệnh `(Get-Item dist\index.js).FullName | Set-Clipboard`.
> - **Windows (Manual):** Giữ phím **Shift + Chuột phải** vào file `index.js` -> Chọn **"Copy as path"**.

### Bước 3: Kiểm tra
Hỏi AI: *"Thông tin tài khoản ChatOps của tôi là gì?"*

Nếu AI trả về đúng tên của bạn → hoạt động OK! ✅

---

## ⚙️ Biến môi trường

| Biến | Bắt buộc | Mô tả | Ví dụ |
|------|----------|-------|-------|
| `CHATOPS_URL` | ✅ | URL server ChatOps | `https://chat.runsystem.vn` |
| `CHATOPS_COOKIE` | ✅ | Session cookie | `MMAUTHTOKEN=abc123` |
| `CHATOPS_CSRF` | ✅ | CSRF token | `MMCSRF=def456` |
| `CHATOPS_TEAM_NAME` | ❌ | Team mặc định (nếu không set, AI sẽ hỏi) | `dn` |

---

## 🛠️ Tools (8 tools)

| Tool | Mô tả | Ví dụ câu hỏi |
|------|--------|---------------|
| `get_my_info` | Xem profile mình | *"Tài khoản ChatOps của tôi?"* |
| `get_user` | Tìm user khác | *"Tìm user xxx@runsystem.net"* |
| `get_channel_info` | Thông tin channel | *"Info channel general"* |
| `get_channel_posts` | Đọc tin nhắn | *"20 tin nhắn mới nhất trong channel devops"* |
| `get_dm_posts` | Đọc tin nhắn riêng | *"Tin nhắn riêng giữa tôi và hauvt"* |
| `get_thread_posts` | Đọc thread | *"Xem replies của post này"* |
| `search_posts` | Tìm kiếm | *"Tìm 'deploy' trong channel devops tuần này"* |
| `find_leave_requests` | Xin trễ/nghỉ | *"hannd xin nghỉ bao nhiêu lần tháng này?"* |

---

## 🔒 Bảo mật

- ✅ Cookie chỉ lưu trên máy bạn (trong IDE settings)
- ✅ Tool chạy local — cookie **không đi qua** bất kỳ server trung gian nào
- ✅ Chỉ gọi tới `CHATOPS_URL` mà bạn config, không gọi ra bên ngoài
- ✅ Source code open source — ai cũng audit được

---

## 🔧 Troubleshooting

**Lỗi 401 — Authentication failed**
→ Cookie đã hết hạn. Đăng nhập lại ChatOps trên trình duyệt, lấy cookie mới.

**Lỗi 404 — Channel not found**
→ Kiểm tra tên channel (dùng slug, không phải display name). Hoặc bạn chưa join channel đó.

**Lỗi "Vui lòng chỉ định team_name"**
→ Bạn chưa set `CHATOPS_TEAM_NAME` và không nói team nào trong câu hỏi. Thêm `CHATOPS_TEAM_NAME` vào env hoặc nói rõ: *"tìm trong team dn"*.

---

## 🧑‍💻 Dành cho Developer

### Setup local
```bash
git clone <repo-url>
cd chatops_mcp
npm install
cp .env.example .env   # Điền cookie của bạn
npm run dev             # Chạy MCP server
```

### Scripts
```bash
npm run dev          # Chạy dev (tsx)
npm run build        # Build TypeScript
npm test             # Chạy unit tests
npm run test:watch   # Watch mode
npm run inspect      # MCP Inspector (debug tools)
```

### Thêm tool mới
Xem hướng dẫn tại `.agents/skills/add-new-tool/SKILL.md`

---

## 📋 Yêu cầu

- Node.js >= 20
- Tài khoản ChatOps

## 📄 License

MIT
