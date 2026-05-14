# Development Guide — ChatOps Chrome Extension

## Yêu cầu

- Chrome >= 114 (Manifest V3 + Side Panel API)
- Không cần Node.js build step — source chạy trực tiếp

## Setup Development

### 1. Load Extension

```bash
# Mở Chrome
chrome://extensions/

# Bật Developer mode → Load unpacked → Chọn folder chrome-extension/
```

### 2. Cấu hình Auth

Chuột phải icon extension → **Options** → Nhập Cookie + CSRF → **Lưu**.

### 3. Debug

- **Popup:** Chuột phải icon extension → **Inspect popup**
- **Side Panel:** DevTools → More tools → Side Panel (hoặc Ctrl+Shift+I)
- **Background:** `chrome://extensions/` → Click "service worker" link
- **Logs:** Tất cả API calls được log ra console

## Thêm tính năng mới

### Pattern: API → UI

1. **Thêm API function** vào `src/api/*.js` (nếu cần endpoint mới)
2. **Thêm UI** vào popup hoặc sidepanel:
   - HTML: thêm section/tab
   - CSS: style với CSS variables sẵn có
   - JS: import API functions, gọi và render kết quả
3. **Test:** Reload extension (`Ctrl+R` trong extensions page)

### CSS Variables

Dùng các CSS variables đã định nghĩa sẵn:

```css
/* Backgrounds */
var(--bg-primary)      /* #0f0f14 — nền chính */
var(--bg-secondary)    /* #1a1a24 — nền phụ */
var(--bg-tertiary)     /* #252535 — nền thứ ba */
var(--bg-glass)        /* rgba(...) — glassmorphism */

/* Text */
var(--text-primary)    /* #f0f0f5 — text chính */
var(--text-secondary)  /* #9898b0 — text phụ */
var(--text-muted)      /* #6a6a80 — text mờ */

/* Accent */
var(--accent)          /* #6366f1 — màu nhấn */
var(--accent-hover)    /* #818cf8 — hover state */
var(--accent-gradient) /* gradient — buttons, headers */

/* Status */
var(--success)         /* #22c55e */
var(--error)           /* #ef4444 */
var(--warning)         /* #f59e0b */
```

### Component Templates

**Post Item:**
```html
<div class="post-item">
  <div class="post-header">
    <span class="post-author">Author Name</span>
    <span class="post-time">5 phút trước</span>
  </div>
  <div class="post-body">Message content</div>
  <div class="post-actions">
    <a href="..." class="post-link">🔗 Mở</a>
  </div>
</div>
```

**User Card:**
```html
<div class="user-card">
  <div class="user-avatar">H</div>
  <div class="user-info">
    <div class="user-name">Nguyễn Đình Hân (@hannd)</div>
    <div class="user-email">hannd@runsystem.net</div>
  </div>
</div>
```

## Hot Reload

Chrome extensions không tự reload. Sau khi sửa code:

1. `chrome://extensions/` → Click icon reload ↻ trên extension
2. Hoặc dùng [Extensions Reloader](https://chrome.google.com/webstore/detail/extensions-reloader) để auto-reload

## Troubleshooting

| Vấn đề | Giải pháp |
|---|---|
| `ERR_BLOCKED_BY_CLIENT` | Cookie/CSRF sai. Kiểm tra Settings |
| CORS errors | Đảm bảo `host_permissions` trong manifest.json chứa đúng domain |
| Side Panel không mở | Chrome < 114. Cập nhật Chrome |
| Badge không cập nhật | Background worker bị kill. Reload extension |
