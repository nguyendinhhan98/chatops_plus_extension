---
name: chrome-extension
description: Hướng dẫn phát triển và mở rộng Chrome Extension ChatOps. Dùng khi cần thêm tính năng UI mới, thêm API endpoint, hoặc debug extension.
---

# Chrome Extension Development Skill

## Tổng quan

Chrome Extension nằm tại `chrome-extension/` — tách biệt hoàn toàn với MCP server.
Dùng vanilla JS (ES modules), không cần build step.

## Kiến trúc

```
chrome-extension/
├── manifest.json              ← Manifest V3
├── src/
│   ├── api/
│   │   ├── client.js          ← fetch() HTTP client + auth injection
│   │   ├── users.js           ← Port từ MCP: getUserById, searchUsers, ...
│   │   ├── channels.js        ← Port từ MCP: getChannelById, searchChannels, ...
│   │   ├── posts.js           ← Port từ MCP: searchPosts, getChannelPosts, postMessage, ...
│   │   └── teams.js           ← Port từ MCP: getTeamByName, getMyTeams
│   ├── utils/
│   │   ├── date.js            ← Native JS date helpers (không dùng date-fns)
│   │   └── formatter.js       ← Text + HTML rendering, XSS protection
│   └── background.js          ← Service worker (alarms, badge, message passing)
├── popup/                     ← Popup UI (quick actions)
├── sidepanel/                 ← Side Panel UI (advanced features)
├── settings/                  ← Options page (auth config)
└── docs/                      ← ARCHITECTURE.md, DEVELOPMENT.md
```

## Thêm API endpoint mới

### Bước 1: Thêm function vào `src/api/`

```javascript
// src/api/users.js
import { apiGet, apiPost } from './client.js';

export function getNewEndpoint(param) {
  return apiGet(`/new-endpoint/${param}`);
}
```

**Quy tắc:**
- Import `apiGet` hoặc `apiPost` từ `client.js`
- Không cần `ensureAuthenticated()` — client tự inject auth
- Return Promise trực tiếp (không cần async/await wrapper cho simple calls)

### Bước 2: Thêm UI Component

**Popup (nếu là quick action):**
1. Thêm HTML vào `popup/popup.html`
2. Style trong `popup/popup.css` (dùng CSS variables sẵn có)
3. Logic trong `popup/popup.js` — import API, gọi, render HTML

**Side Panel (nếu là advanced feature):**
1. Thêm tab button vào `<nav class="tab-nav">` trong `sidepanel.html`
2. Thêm `<div class="tab-content" id="tab-newfeature">` content
3. Thêm setup function trong `sidepanel.js`

### Bước 3: Reload & Test

```
chrome://extensions/ → Click ↻ reload trên extension
```

## Pattern: Render data an toàn

**LUÔN** dùng `escapeHtml()` khi render nội dung từ API:

```javascript
import { escapeHtml, renderPostList, renderUserCard } from '../src/utils/formatter.js';

// ❌ SAI — XSS vulnerability
element.innerHTML = `<div>${post.message}</div>`;

// ✅ ĐÚNG — escaped
element.innerHTML = `<div>${escapeHtml(post.message)}</div>`;

// ✅ ĐÚNG — dùng helper có sẵn
element.innerHTML = renderUserCard(user);
element.innerHTML = renderPostList(posts, usersMap, chatopsUrl, teamName);
```

## Pattern: Loading state

```javascript
const resultsEl = document.getElementById('results');

// Show loading
resultsEl.innerHTML = '<div class="loading-state"><span class="spinner"></span> Đang tải...</div>';

try {
  const data = await apiCall();
  resultsEl.innerHTML = renderData(data);
} catch (err) {
  resultsEl.innerHTML = `<div class="empty-state" style="color:var(--error)">❌ ${escapeHtml(err.message)}</div>`;
}
```

## Pattern: Tab routing (Side Panel)

```javascript
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
}
```

## CSS Design System

Dùng CSS variables đã định nghĩa — **KHÔNG** hardcode colors:

| Variable | Giá trị | Dùng cho |
|---|---|---|
| `--bg-primary` | `#0f0f14` | Nền chính |
| `--bg-secondary` | `#1a1a24` | Nền input, card |
| `--bg-glass` | `rgba(...)` | Glassmorphism |
| `--accent` | `#6366f1` | Buttons, links |
| `--accent-gradient` | `linear-gradient(...)` | CTA buttons |
| `--text-primary` | `#f0f0f5` | Text chính |
| `--text-secondary` | `#9898b0` | Text phụ |
| `--radius` | `12px` | Border radius lớn |
| `--radius-sm` | `8px` | Border radius nhỏ |

## Background Service Worker

**Alarms:** Dùng `chrome.alarms` cho periodic tasks (không dùng setInterval).

**Message passing:**
```javascript
// Từ popup/sidepanel gửi đến background:
chrome.runtime.sendMessage({ type: 'CHECK_MENTIONS_NOW' });

// Background xử lý:
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_MENTIONS_NOW') { ... }
});
```

## Tham khảo

- [manifest.json spec](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [chrome.alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [ChatOps API v4](../docs/) — Xem thêm chatops-api skill
