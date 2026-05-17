# ChatOps++ — Chrome Extension

> Extension Chrome kế thừa chức năng [ChatOps MCP Server](../README.md), gọi API trực tiếp mà không cần thông qua AI.

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 🔍 **Tìm kiếm** | Search posts với filter (from, in, on, before, after) |
| 👤 **User Lookup** | Tìm kiếm user theo tên, email, username |
| 📢 **Channel Browser** | Duyệt channels, xem posts gần đây |
| 🔔 **Missed Mentions** | Kiểm tra mention bị bỏ lỡ (deep scan) |
| 💬 **Quick Message** | Gửi DM nhanh từ popup |
| 📋 **Leave Tracker** | Tra cứu lịch sử xin trễ/nghỉ |
| 🔴 **Badge Notification** | Tự động kiểm tra mentions mỗi 5 phút |

## 🚀 Cài đặt

### Cách 1: Load Unpacked (Development)

1. Clone repo và mở folder `chrome-extension/`
2. Mở Chrome → `chrome://extensions/`
3. Bật **Developer mode** (góc trên phải)
4. Click **Load unpacked** → chọn folder `chrome-extension/`
5. Extension sẽ xuất hiện trên toolbar

### Cách 2: CRX Package (Coming soon)

## ⚙️ Cấu hình

1. Click icon extension → ⚙️ Settings (hoặc chuột phải icon → Options)
2. Nhập thông tin:

| Field | Giá trị | Ví dụ |
|---|---|---|
| ChatOps URL | URL server | `https://chat.runsystem.vn` |
| Cookie | MMAUTHTOKEN | `MMAUTHTOKEN=abc123...` |
| CSRF | MMCSRF token | `MMCSRF=xyz789...` |
| Team | Slug team mặc định | `dn` |

3. Click **Kiểm tra kết nối** để verify
4. Click **Lưu cấu hình**

### Lấy Cookie & CSRF

1. Mở ChatOps và đăng nhập
2. DevTools (`F12`) → **Application** → **Cookies**
3. Copy giá trị `MMAUTHTOKEN` và `MMCSRF`

## 🎯 Sử dụng

### Popup (click icon)
- **Profile Card**: Hiện thông tin user đang login
- **Quick Search**: Tìm kiếm nhanh posts, users, channels
- **Quick Actions**: 4 nút truy cập nhanh
- **Quick Message**: Gửi DM mà không cần mở ChatOps

### Side Panel (click "Mở bảng mở rộng")
- **Tab Search**: Tìm kiếm nâng cao với multiple filters
- **Tab Channels**: Duyệt channels, click để xem posts
- **Tab Users**: Tìm kiếm users chi tiết
- **Tab Mentions**: Deep scan mentions bị bỏ lỡ
- **Tab Xin nghỉ**: Tra cứu lịch sử xin trễ/nghỉ theo user + channel + date range

## 🏗️ Kiến trúc

```
chrome-extension/
├── manifest.json          ← Manifest V3
├── src/
│   ├── api/               ← API client modules (port từ MCP)
│   │   ├── client.js      ← HTTP client (fetch + auth)
│   │   ├── users.js
│   │   ├── channels.js
│   │   ├── posts.js
│   │   └── teams.js
│   ├── utils/             ← Date & formatter helpers
│   └── background.js      ← Service worker (badge, alarms)
├── popup/                 ← Popup UI
├── sidepanel/             ← Side Panel UI
├── settings/              ← Settings page
└── icons/                 ← Extension icons
```

## 📖 Xem thêm

- [Architecture](docs/ARCHITECTURE.md) — Chi tiết kiến trúc
- [Development Guide](docs/DEVELOPMENT.md) — Hướng dẫn phát triển
