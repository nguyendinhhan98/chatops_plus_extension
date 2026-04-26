# Hướng dẫn Cài đặt — mcp-chatops

## Cài đặt nhanh (1 phút)

### Bước 1: Lấy Cookie từ trình duyệt

1. Mở **https://chat.runsystem.vn** và đăng nhập.
2. Nhấn **F12** → Tab **Network**.
3. Chọn bất kỳ request nào tới `/api/v4/...`.
4. Trong **Request Headers** tìm:
   - `Cookie:` → Copy giá trị `MMAUTHTOKEN=...`
   - `x-csrf-token:` → Copy giá trị token

### Bước 2: Thêm config vào AI client của bạn

Chọn client bạn đang dùng, paste đoạn config bên dưới vào settings:

#### VS Code (GitHub Copilot)
Mở **Settings (JSON)** → thêm vào `mcp.servers`:
```json
{
  "mcp.servers": {
    "mcp-chatops": {
      "command": "npx",
      "args": ["-y", "mcp-chatops"],
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
Tạo file `.cursor/mcp.json` trong thư mục home hoặc project:
```json
{
  "mcpServers": {
    "mcp-chatops": {
      "command": "npx",
      "args": ["-y", "mcp-chatops"],
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
Mở file `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "mcp-chatops": {
      "command": "npx",
      "args": ["-y", "mcp-chatops"],
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
Thêm vào MCP settings của Antigravity tương tự format trên.

> **Lưu ý**: Thay `<your_token>` và `<your_csrf>` bằng giá trị bạn copy ở Bước 1. Mỗi người dùng cookie **riêng** của mình.

### Bước 3: Kiểm tra

Hỏi AI: *"Thông tin tài khoản ChatOps của tôi là gì?"*

AI sẽ gọi tool `get_my_info` và hiển thị profile của bạn. Nếu thấy đúng tên → hoạt động OK!

---

## Danh sách Tools có sẵn

| Tool | Mô tả | Ví dụ câu hỏi |
|------|--------|---------------|
| `get_my_info` | Xem profile mình | "Tài khoản ChatOps của tôi?" |
| `get_user` | Tìm user khác | "Tìm user xxx@runsystem.net" |
| `get_channel_info` | Xem info channel | "Thông tin channel [DN] CHECK.OFF.LATER" |
| `get_channel_posts` | Đọc tin nhắn | "Tin nhắn mới nhất trong channel general" |
| `get_dm_posts` | Đọc DM | "Tin nhắn DM giữa tôi và hauvt" |
| `get_thread_posts` | Đọc thread | "Xem replies của thread này" |
| `search_posts` | Tìm kiếm | "Tìm tin nhắn 'deploy' trong channel devops" |
| `find_leave_requests` | Xin trễ/nghỉ | "hannd xin nghỉ bao nhiêu lần tháng này?" |

---

## FAQ

**Q: Cookie hết hạn thì sao?**
A: Đăng nhập lại ChatOps trên trình duyệt, lấy cookie mới, cập nhật vào settings.

**Q: Tôi không thấy channel mình muốn?**
A: Tool chỉ truy cập được những channel mà tài khoản của bạn đã tham gia.

**Q: Có an toàn không?**
A: Cookie lưu trên máy bạn (trong settings của IDE). Tool chạy local, không gửi cookie đi đâu ngoài `chat.runsystem.vn`. Source code open source, ai cũng audit được.

**Q: Cần cài gì trước không?**
A: Chỉ cần **Node.js >= 20**. `npx` sẽ tự tải package về.
