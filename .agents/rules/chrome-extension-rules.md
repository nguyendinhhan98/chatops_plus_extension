# Chrome Extension Coding Rules

> Áp dụng cho mọi thay đổi trong `chrome-extension/`.

---

## §1. File Size Limit — "One File, One Responsibility"

| File | Giới hạn dòng | Nếu vượt quá → |
|------|--------------|----------------|
| `sidepanel.js` | **≤ 200 dòng** | Tách module riêng |
| `content.js` | **≤ 150 dòng** | Tách module riêng |
| `background.js` | **≤ 200 dòng** | Tách module riêng |
| Bất kỳ `module` nào | **≤ 300 dòng** | Tách thêm |

**Quy tắc tách module:**

```
sidepanel/
├── sidepanel.js        ← Entry point: chỉ init + orchestrate (≤ 80 dòng)
├── sidepanel.html
├── sidepanel.css
├── autocomplete.js     ← UI component riêng
├── multiselect.js      ← UI component riêng
└── tabs/               ← Mỗi tab = 1 module
    ├── search.tab.js   ← setupSearch(), performSpSearch()
    ├── mentions.tab.js ← setupMentions(), scanMentionsDeep()
    ├── leave.tab.js    ← setupLeave(), searchLeave()
    └── memo.tab.js     ← setupMemo(), loadMemos(), renderTaskCard()
```

---

## §2. Module Pattern — ES Modules Thuần

### ✅ Đúng — Mỗi tab là module có API rõ ràng

```javascript
// tabs/search.tab.js
export function setup(deps) { ... }    // Khởi tạo event listeners
export function reset() { ... }        // Reset state khi đổi workspace

// sidepanel.js (entry point)
import { setup as setupSearch, reset as resetSearch } from './tabs/search.tab.js';
import { setup as setupMentions } from './tabs/mentions.tab.js';
```

### ❌ Sai — Nhét tất cả logic vào 1 file

```javascript
// sidepanel.js — 1051 dòng ← KHÔNG ĐƯỢC
function setupSearch() { ... }
function performSpSearch() { ... }
function setupMentions() { ... }
function scanMentionsDeep() { ... }
// ... 900 dòng còn lại
```

---

## §3. State Management

### ✅ Đúng — State module-local, không dùng global mutable

```javascript
// tabs/search.tab.js
let _state = { page: 0, hasMore: false, terms: '', isSearching: false };

function getState() { return { ..._state }; }
function setState(patch) { _state = { ..._state, ...patch }; }
```

### ❌ Sai — Global state rải rắc

```javascript
// sidepanel.js — KHÔNG ĐƯỢC
let searchState = { ... };
let leaveState = { ... };
let currentMemoSubTab = 'tasks';
let searchInMS = null;
// ... nhiều global vars
```

---

## §4. HTML Rendering — Template Functions

### ✅ Đúng — Hàm render trả về string, KHÔNG có side effects

```javascript
// src/utils/formatter.js
export function renderLeaveItem(post, user, permalink) {
  const author = user ? escapeHtml(user.username) : 'Unknown';
  return `
    <div class="leave-item">
      <div class="post-header">...</div>
    </div>
  `;
}
```

### ❌ Sai — Inline HTML dài trong business logic

```javascript
// sidepanel.js — KHÔNG ĐƯỢC
const html = matchingPosts.map((post) => {
  const u = usersMap[post.user_id];
  // ... 20 dòng HTML template
}).join('');
```

**Quy tắc:**
- Mọi HTML template > 5 dòng → tách thành `render*()` function trong `formatter.js`.
- Template functions PHẢI `escapeHtml()` mọi dữ liệu từ API.
- Template functions PHẢI pure (không gọi API, không đọc global state).

---

## §5. Event Listener — Không Duplicate

### ✅ Đúng — Event delegation thay vì nhiều listeners

```javascript
resultsEl.addEventListener('click', (e) => {
  if (e.target.matches('.btn-delete')) handleDelete(e.target.dataset.id);
  if (e.target.matches('.btn-reply')) handleReply(e.target.dataset.id);
});
```

### ❌ Sai — Attach listener trong vòng lặp render

```javascript
// KHÔNG ĐƯỢC — mỗi lần re-render lại attach thêm listeners
items.forEach(item => {
  document.getElementById(`btn-${item.id}`).addEventListener('click', ...);
});
```

---

## §6. Async / Error Handling

### ✅ Pattern chuẩn cho mọi async operation

```javascript
async function performAction() {
  const resultsEl = document.getElementById('spResults');
  resultsEl.innerHTML = '<div class="loading-state"><span class="spinner"></span> Đang tải...</div>';

  try {
    const data = await apiCall();
    resultsEl.innerHTML = renderData(data);
  } catch (err) {
    resultsEl.innerHTML = `<div class="empty-state error">❌ ${escapeHtml(err.message)}</div>`;
  }
}
```

### ✅ Guard clause để tránh lồng if

```javascript
async function scanMentions() {
  if (!currentUser) {
    showError('Chưa kết nối.');
    return;
  }
  if (!currentTeam) {
    showError('Chưa chọn workspace.');
    return;
  }
  // ... logic chính
}
```

---

## §7. Content Script — Isolation

- **KHÔNG** import trực tiếp từ `src/api/` trong `content.js`.
- Mọi API call từ content script → phải qua `chrome.runtime.sendMessage()` → background xử lý.
- `content.js` chỉ được: DOM manipulation, UI injection, message passing.

```javascript
// ✅ Đúng — content.js giao tiếp qua messages
chrome.runtime.sendMessage({ type: 'GET_TASK_DATA' }, (data) => {
  renderTaskUI(data);
});

// ❌ Sai — content.js gọi API trực tiếp
import { getTasks } from '../src/api/tasks.js'; // KHÔNG ĐƯỢC
```

---

## §8. Constants — Không Magic Numbers/Strings

```javascript
// ✅ Đúng — constants.js hoặc đầu file
const LEAVE_KEYWORDS = ['xin phép', 'đi trễ', 'về sớm', 'làm bù', 'xin nghỉ', 'nghỉ phép', 'wfh', 'off', 'late'];
const BATCH_SIZE = 5;
const PAGE_SIZE = 20;
const MENTION_ALARM = 'check-mentions';

// ❌ Sai — inline magic values
const keywords = ['xin phép', 'đi trễ', ...]; // trong hàm
while (matchingPosts.length < 20 ...) { // 20 là gì?
```

---

## §9. CSS — Không Inline Styles

```javascript
// ✅ Đúng — dùng class
element.classList.add('loading');
element.classList.toggle('active', isActive);

// ❌ Sai — hardcode style
element.style.color = '#ef4444';
element.style.display = 'flex';
```

**Ngoại lệ chấp nhận được:** Dynamic positioning (popover, tooltip) cần `style.top/left`.

---

## §10. Shared Helpers — Không Duplicate Code

### Phát hiện duplicate → tách vào shared module

Hiện tại `showToast()` bị định nghĩa **2 lần** trong `content.js` (line 64 và line 455). Đây là vi phạm nghiêm trọng.

```javascript
// ✅ Đúng — 1 định nghĩa duy nhất
// src/utils/ui.js
export function showToast(message, duration = 2500) { ... }

// Dùng ở mọi nơi cần
import { showToast } from '../src/utils/ui.js';
```

---

## §11. Chrome Storage — Key Constants

```javascript
// ✅ Đúng — tập trung keys trong constants
// src/constants.js
export const STORAGE_KEYS = {
  CONFIG: ['chatopsUrl', 'cookie', 'csrf', 'teamName'],
  STATE: 'spState',
  CURRENT_TEAM: 'spCurrentTeamId',
  MEMOS: 'memos',
  BTN_POS: 'chatops_ext_btn_pos',
};

// ❌ Sai — string literal rải khắp nơi
chrome.storage.local.get(['spState'], ...);
chrome.storage.local.get(['memos'], ...);
chrome.storage.local.get(['chatops_ext_btn_pos'], ...);
```

---

## Checklist trước khi commit

- [ ] Không file nào vượt giới hạn dòng (§1)
- [ ] Không duplicate function (§10) — đặc biệt `showToast`
- [ ] Mọi HTML > 5 dòng đã được tách vào `render*()` function (§4)
- [ ] Không magic numbers/strings trong logic (§8)
- [ ] Không inline styles (§9) — trừ dynamic positioning
- [ ] Mọi async function có loading + error state (§6)
- [ ] `escapeHtml()` tất cả dữ liệu từ API trước khi render (§4)
