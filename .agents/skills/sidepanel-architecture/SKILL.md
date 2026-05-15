---
name: sidepanel-architecture
description: >
  Hướng dẫn kiến trúc và refactor Chrome Extension Sidepanel.
  Dùng khi: thêm tab mới, refactor sidepanel.js (hiện 1051 dòng), hoặc debug side panel.
  Mục tiêu: tách sidepanel.js thành modules riêng biệt, mỗi tab là 1 file.
---

# Sidepanel Architecture Skill

## Vấn đề hiện tại

`sidepanel.js` hiện có **1051 dòng** — vi phạm quy tắc §1 trong `chrome-extension-rules.md`.

Các vấn đề cụ thể:
1. **God File**: 1 file chứa logic của 4 tab khác nhau (Search, Mentions, Leave, Memo)
2. **Global State Pollution**: 9 biến global (`currentUser`, `cachedConfig`, `currentTeam`, `searchInMS`, v.v.)
3. **Duplicate Code**: `showToast()` định nghĩa 2 lần trong `content.js`
4. **Inline HTML**: Template HTML dài inline trong business logic (line 586-598, 773-786)
5. **Magic Values**: `keywords = ['xin phép', ...]` nằm trong hàm, `BATCH_SIZE = 5` hardcode
6. **Mixed Concerns**: `loadMemos()` vừa fetch data, vừa render, vừa attach event listeners

---

## Kiến trúc Mục tiêu

```
chrome-extension/
└── sidepanel/
    ├── sidepanel.html         ← Không đổi
    ├── sidepanel.css          ← Không đổi
    ├── sidepanel.js           ← Entry point ≤ 80 dòng (chỉ init + wire-up)
    ├── autocomplete.js        ← Không đổi (UI component)
    ├── multiselect.js         ← Không đổi (UI component)
    ├── state.js               ← [NEW] Workspace state + storage
    └── tabs/
        ├── search.tab.js      ← [NEW] Search tab logic
        ├── mentions.tab.js    ← [NEW] Mentions tab logic
        ├── leave.tab.js       ← [NEW] Leave tracker tab logic
        └── memo.tab.js        ← [NEW] Memo/Task tab logic
```

---

## Tab Module Interface

Mỗi tab module PHẢI export interface sau:

```javascript
// tabs/search.tab.js — Template

/**
 * @param {Object} deps - Dependencies được inject từ sidepanel.js
 * @param {Function} deps.getTeam - () => currentTeam
 * @param {Function} deps.getUser - () => currentUser
 * @param {Function} deps.getConfig - () => cachedConfig
 */
export function setup(deps) {
  // Khởi tạo event listeners
  // Khởi tạo smart selects (nếu có)
}

/**
 * Reset state khi user đổi workspace
 */
export function reset() {
  // Reset internal state
  // Reset smart selects
  // Clear rendered results
}

/**
 * Trả về smart selects để sidepanel.js có thể wire up
 * @returns {{ [key: string]: AutocompleteInstance | MultiSelectInstance }}
 */
export function getSelects() {
  return { searchInMS, searchFromAC };
}
```

---

## State Module

```javascript
// state.js — Quản lý workspace state

let _currentTeam = null;
let _currentUser = null;
let _cachedConfig = null;

export const state = {
  getTeam: () => _currentTeam,
  getUser: () => _currentUser,
  getConfig: () => _cachedConfig,
  setTeam: (team) => { _currentTeam = team; },
  setUser: (user) => { _currentUser = user; },
  setConfig: (config) => { _cachedConfig = config; },
};
```

---

## Entry Point Pattern (sidepanel.js mới)

```javascript
// sidepanel.js — Entry point, ≤ 80 dòng

import { state } from './state.js';
import { setup as setupSearch, reset as resetSearch } from './tabs/search.tab.js';
import { setup as setupMentions, reset as resetMentions } from './tabs/mentions.tab.js';
import { setup as setupLeave, reset as resetLeave } from './tabs/leave.tab.js';
import { setup as setupMemo } from './tabs/memo.tab.js';
import { getMyProfile } from '../src/api/users.js';
import { getMyTeams } from '../src/api/teams.js';
import { getConfig } from '../src/api/client.js';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const [config, user, teams] = await Promise.all([
      getConfig(), getMyProfile(), getMyTeams()
    ]);
    state.setConfig(config);
    state.setUser(user);
    await setupWorkspaceSelector(teams);
    chrome.runtime.sendMessage({ type: 'SIDE_PANEL_STATE', state: 'OPEN' });
  } catch (err) {
    showInitError(err);
  }

  setupTabs();
  setupSearch(state);
  setupMentions(state);
  setupLeave(state);
  setupMemo(state);
  setupStateRestore();
  setupEventListeners();
}

function resetAllTabs() {
  resetSearch();
  resetMentions();
  resetLeave();
}
```

---

## Constants Module

Tạo `src/constants.js` để tập trung tất cả magic values:

```javascript
// src/constants.js

export const STORAGE_KEYS = {
  CONFIG: ['chatopsUrl', 'cookie', 'csrf', 'teamName'],
  STATE: 'spState',
  CURRENT_TEAM: 'spCurrentTeamId',
  MEMOS: 'memos',
  BTN_POSITION: 'chatops_ext_btn_pos',
};

export const LEAVE_KEYWORDS = [
  'xin phép', 'đi trễ', 'về sớm', 'làm bù',
  'có việc', 'xin nghỉ', 'nghỉ phép', 'nghỉ ốm',
  'wfh', 'off', 'late',
];

export const MENTION_BATCH_SIZE = 5;
export const SEARCH_PAGE_SIZE = 20;
export const LEAVE_PAGE_SIZE = 100;
export const TASK_SNOOZE_MINUTES = 5;
export const MENTION_CHECK_INTERVAL_MINUTES = 5;
export const DEFAULT_DOMAIN = 'runsystem.net';
export const DEFAULT_TEAM = 'dn';
export const CHATOPS_URL = 'https://chat.runsystem.vn';
export const LEAVE_DEFAULT_CHANNEL = 'check.off.later';
```

---

## Render Functions Pattern

Mọi HTML template > 5 dòng phải là pure function trong `formatter.js`:

```javascript
// src/utils/formatter.js — Thêm vào

/**
 * Render leave request post item
 * @pure - Không side effects, không global state
 */
export function renderLeaveItem(post, user, permalink) {
  const author = user ? escapeHtml(user.username) : 'Unknown';
  return `
    <div class="leave-item">
      <div class="post-header">
        <span class="post-author">@${author}</span>
        <span class="post-channel">in ${escapeHtml(post._channelName)}</span>
        <span class="post-time">${formatUnixMsToVN(post.create_at)}</span>
      </div>
      <div class="leave-message">${escapeHtml(post.message).replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
        <a href="${permalink}" class="post-link">🔗 Xem tin nhắn</a>
      </div>
    </div>
  `;
}

/**
 * Render missed mention post item
 * @pure
 */
export function renderMentionItem(post, author, permalink) {
  const authorName = author ? formatUserDisplayName(author) : '(Unknown)';
  return `
    <div class="post-item">
      <div class="post-header">
        <span class="post-author">${escapeHtml(authorName)}</span>
        <span class="post-time" title="${formatUnixMsToVN(post.create_at)}">${formatRelativeTime(post.create_at)}</span>
      </div>
      <div class="post-body">${escapeHtml(post.message).replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
        <a href="${permalink}" target="_blank" class="post-link">🔗 Mở trong ChatOps</a>
      </div>
    </div>
  `;
}
```

---

## UI Helpers — Shared Module

Tách `showToast` và các UI helpers ra `src/utils/ui.js`:

```javascript
// src/utils/ui.js

/**
 * Hiển thị toast notification
 * @param {string} message
 * @param {number} [duration=2500]
 */
export function showToast(message, duration = 2500) {
  const toast = document.createElement('div');
  toast.className = 'chatops-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed', top: '20px', right: '20px',
    bottom: 'auto', left: 'auto', transform: 'translateX(120%)'
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.transform = 'translateX(0)'; toast.classList.add('visible'); }, 10);
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Render loading state vào element
 */
export function showLoading(el, message = 'Đang tải...') {
  el.innerHTML = `<div class="loading-state"><span class="spinner"></span> ${message}</div>`;
}

/**
 * Render error state vào element
 */
export function showError(el, message) {
  el.innerHTML = `<div class="empty-state error">❌ ${message}</div>`;
}

/**
 * Render empty state vào element
 */
export function showEmpty(el, message) {
  el.innerHTML = `<div class="empty-state">${message}</div>`;
}
```

---

## Thứ tự Refactor (Từng bước)

1. **Bước 1** — Tạo `src/constants.js`, `src/utils/ui.js`
2. **Bước 2** — Thêm `renderLeaveItem()`, `renderMentionItem()` vào `formatter.js`
3. **Bước 3** — Tạo `sidepanel/state.js`
4. **Bước 4** — Tạo `sidepanel/tabs/memo.tab.js` (tách từ dòng 812–1051)
5. **Bước 5** — Tạo `sidepanel/tabs/leave.tab.js` (tách từ dòng 617–810)
6. **Bước 6** — Tạo `sidepanel/tabs/mentions.tab.js` (tách từ dòng 474–615)
7. **Bước 7** — Tạo `sidepanel/tabs/search.tab.js` (tách từ dòng 288–472)
8. **Bước 8** — Refactor `sidepanel.js` thành entry point ≤ 80 dòng
9. **Bước 9** — Fix duplicate `showToast` trong `content.js`
10. **Bước 10** — Test từng tab sau khi tách

---

## Kiểm tra sau khi refactor

```bash
# Đếm dòng các file chính — tất cả phải pass
wc -l chrome-extension/sidepanel/sidepanel.js          # ≤ 80
wc -l chrome-extension/sidepanel/tabs/search.tab.js    # ≤ 200
wc -l chrome-extension/sidepanel/tabs/mentions.tab.js  # ≤ 200
wc -l chrome-extension/sidepanel/tabs/leave.tab.js     # ≤ 200
wc -l chrome-extension/sidepanel/tabs/memo.tab.js      # ≤ 250
wc -l chrome-extension/content/content.js              # ≤ 400
```

---

## Tham khảo

- `chrome-extension-rules.md` — Quy tắc tổng quát
- `chrome-extension/SKILL.md` — Patterns cơ bản
- `chrome-extension-developer/SKILL.md` — Manifest V3 internals
