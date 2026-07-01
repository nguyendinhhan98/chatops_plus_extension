# Side Panel — ChatOps++

> Files: `sidepanel/`

---

## 1. Tổng Quan

Side Panel là giao diện chính của ChatOps++, mở ở bên phải màn hình (hoặc dưới dạng PWA iframe). Đây là một **single-page application** mini với routing tab nội bộ.

```
sidepanel.html         ← HTML layout (119KB, toàn bộ markup)
sidepanel.js           ← Orchestrator / Router
├── state.js           ← Shared in-memory state
├── persistence.js     ← UI state → localStorage
├── autocomplete.js    ← Typeahead component
├── multiselect.js     ← Multi-select component
├── tour.js            ← Onboarding flow
└── tabs/
    ├── tasks.tab.js   ← Tab công việc
    ├── memo.tab.js    ← Tab ghi chú
    ├── mentions.tab.js← Tab mentions
    ├── search.tab.js  ← Tab tìm kiếm
    └── settings.tab.js← Tab cài đặt (bao gồm tệp tin & ảnh trong kênh)
```

---

## 2. `sidepanel.js` — Orchestrator

### Initialization Flow

```
DOMContentLoaded
  │
  ▼
init()
  ├── 1. getSettings()              Load settings từ storage
  ├── 2. loadLanguage()             Load i18n strings
  ├── 3. applyThemeToDOM(settings)  Apply CSS variables
  ├── 4. Setup navigation tabs      Build nav buttons
  ├── 5. applyTabOrderToDOM()       Sắp xếp theo order
  ├── 6. applyTabVisibilityToDOM()  Show/hide tabs
  ├── 7. applyTabRepositioning()    Promote/demote tabs
  │
  ├── 8. Load user + team:
  │   ├── getMyProfile() → state.setUser(user)
  │   ├── getMyTeams()   → state.setTeams(teams)
  │   ├── getConfig()    → state.setConfig(config)
  │   └── getTeamByName(config.teamName) → state.setTeam(team)
  │
  ├── 9. setup(state) cho từng tab:
  │   ├── settings.tab.setup(state)
  │   ├── tasks.tab.setup(state)
  │   ├── memo.tab.setup(state)
  │   ├── mentions.tab.setup(state)
  │   └── search.tab.setup(state)
  │
  ├── 10. Khôi phục tab từ storage
  │   └── switchTab(savedTab || defaultTab)
  │
  └── 11. tour.js: auto-start nếu chưa xem
```

### Tab Navigation — `switchTab(tabId)`

```
switchTab('tasks')
  ├── Ẩn panel đang active
  ├── Hiển thị panel mới
  ├── Update active class trên nav button
  ├── Lưu tab vào chrome.storage.local['sidepanel_tab']
  └── Nếu tab có resetOnSwitch=true: gọi tab.reset()
```

### Tab Promotion/Demotion

Settings cho phép user quyết định tab nào xuất hiện trực tiếp trên nav vs gom vào "Tools" dropdown:

```
Promoted tabs → Hiển thị trực tiếp trên nav bar (top-level)
Demoted tabs  → Gom vào nút "Tools ▾" dropdown
Hidden tabs   → Ẩn hoàn toàn
```

### Global Message Handler

```js
chrome.runtime.onMessage.addListener((message, sender) => {
  switch (message.type) {
    case 'TASK_TRIGGERED':
      switchTab('tasks');
      loadTasks();
      break;
    case 'MEMO_UPDATED':
      loadMemos();
      loadTasks();
      break;
    case 'SETTINGS_UPDATED':
      getSettings().then(settings => {
        applyThemeToDOM(settings);
        applyTabRepositioning(settings);
        applyTabVisibilityToDOM(settings);
        applyTabOrderToDOM(settings.tabOrder);
      });
      break;
    case 'LANGUAGE_CHANGE':
      loadLanguage(newLang).then(() => {
        applyI18n(document.body);  // Update tất cả data-i18n elements
        // Re-render dynamic content
      });
      break;
    case 'SWITCH_TAB':
      switchTab(message.tabId);
      break;
  }
});
```

---

## 3. `state.js` — In-Memory State

State container đơn giản, không có persistence. Được truyền vào mỗi tab qua `setup(state)`.

```js
// Public API của state.js
state.getUser()           // → User object (profile hiện tại)
state.setUser(user)
state.getTeam()           // → Team object hoặc 'all'
state.setTeam(team)
state.getTeams()          // → Team[] (tất cả teams)
state.setTeams(teams)
state.getConfig()         // → { chatopsUrl, teamName }
state.setConfig(config)
```

**Sử dụng trong tabs:**
```js
// tasks.tab.js — cần teamName để build permalink
const teamName = state.getTeam()?.name || state.getConfig()?.teamName || 'dn';

// mentions.tab.js — cần all teams để scan "All Teams" mode
const teams = state.getTeams();
const currentUser = state.getUser();

// search.tab.js — cần team/teams cho API call
const team = state.getTeam();
if (team === 'all') {
  // Search trong tất cả teams parallel
  const results = await Promise.all(
    state.getTeams().map(t => searchPosts(t.id, params))
  );
}
```

---

## 4. `persistence.js` — UI State Persistence

Lưu và khôi phục giá trị input fields vào `localStorage` để không mất khi refresh.

### API

```js
// Setup persistence cho một element
setupPersistence(
  '#search-keyword',     // CSS selector của element
  'chatops_search_kw',   // Key trong localStorage
  {
    eventType: 'input',  // 'input' | 'change'
    debounce: 300        // ms (optional)
  }
);

// Xóa dữ liệu đã lưu
clearPersistence('chatops_search_kw');
```

### Nơi Dùng

| Element | Storage Key |
|---|---|
| Search keyword input | `chatops_search_keyword` |
| Search from (user) | `chatops_search_from` |
| Memo draft textarea | `chatops_memo_draft` |

---

## 5. `autocomplete.js` — Typeahead Component

Component gợi ý khi gõ, dùng cho user selector và channel selector.

### Setup

```js
const ac = setupAutocomplete(
  'search-from-input',           // Input element ID
  {
    searchFetch: async (term) => searchUsers(term, teamId),
    defaultFetch: async (page, perPage) => getUsers(page, perPage, teamId),
    minLength: 2,                // Ký tự tối thiểu để trigger search
    debounce: 300,               // ms debounce
    pageSize: 20
  },
  (user) => renderUserCard(user),        // Render function
  (user) => user.username                // Display value khi chọn
);

// Methods
ac.getValue();   // → username đang được chọn
ac.reset();      // Clear selection
```

### Behavior

```
User focus input (empty) → defaultFetch(0, 20) → hiện dropdown gợi ý
User type ≥ 2 chars       → debounce 300ms → searchFetch(term) → update dropdown
User scroll trong dropdown → Load more (pagination)
User click item           → Điền display value vào input → lưu actual value vào dataset
User click ngoài          → Đóng dropdown
```

---

## 6. `multiselect.js` — Multi-Select Component

Tương tự autocomplete nhưng cho phép chọn nhiều items, hiển thị dưới dạng "tags".

### Setup

```js
const ms = setupMultiSelect(
  'search-in-input',
  {
    searchFetch: async (term) => searchChannels(teamId, term),
    defaultFetch: async (page, perPage) => getMyChannels(teamId),
    pageSize: 20
  },
  (channel) => renderChannelCard(channel),
  (channel) => channel.id,           // Key function
  (channel) => channel.display_name  // Label function
);

// Methods
ms.getSelected();  // → Channel[] đang được chọn
ms.reset();        // Clear all selections
```

### Behavior

```
Dropdown show/hide giống autocomplete
Khi chọn item → Tạo tag với label + nút ×
Click × trên tag → Remove item khỏi selection
Typing → Filter + add new items
```

---

## 7. `tour.js` — Onboarding Flow

22-step guided tour cho người dùng mới.

### Logic

```js
startTour()
  ├── Check chrome.storage.local['chatops_tour_done']
  ├── Nếu chưa xem: show step 1
  └── Hiển thị tooltip overlay với highlight

Mỗi step:
  ├── Highlight element tương ứng (outline + scroll into view)
  ├── Tooltip: title + description (từ lang.js)
  └── Buttons: Prev | Skip | Next

endTour()
  └── chrome.storage.local['chatops_tour_done'] = true
```

### Auto-start

Trong `sidepanel.js` init:
```js
const { chatops_tour_done } = await chrome.storage.local.get('chatops_tour_done');
if (!chatops_tour_done) {
  setTimeout(() => startTour(), 500); // Delay để UI load xong
}
```

---

## 8. `tabs/tasks.tab.js`

### Data Schema

Tasks lưu trong `chrome.storage.local['chatops_memos']` với `type: 'task'`:

```js
{
  id: 'uuid-v4',
  type: 'task',
  postId: 'mm_post_id',        // Linked Mattermost post (optional)
  postText: 'message content', // Truncated post text
  title: 'Task title',         // User-defined title (optional)
  note: 'Extra details',
  category: 'work',
  createdAt: 1234567890123,
  done: false,
  doneAt: null,
  reminder: 1234567890123,     // Unix ms, khi nào alarm fires
  repeatDaily: false,
  status: 'pending',
  teamName: 'dn',              // Để build permalink
  checklist: [                 // Chỉ khi category='checklist'
    { text: 'Item 1', checked: false },
    { text: 'Item 2', checked: true }
  ],
  targetChannelId: 'channel_id',   // Chỉ khi type='group_reminder'
  targetChannelName: 'Channel Name'// Chỉ khi type='group_reminder'
}
```

### Hàm Chính

#### `loadTasks()`
```
1. Load từ storage
2. Filter theo currentFilter:
   - 'pending': !done
   - 'completed': done
3. Sort: pending trước (theo reminder), completed sau (theo doneAt desc)
4. Quét tìm các task bị lỡ (overdue tasks): Nếu phát hiện và chưa hiển thị digest, kích hoạt banner cảnh báo (Warning Toast) "Bạn đã bỏ lỡ {count} nhắc nhở..." với nút "Xem các công việc bị lỡ" để tự động chuyển tab, filter "pending", cuộn tới và highlight task card bị nhỡ đầu tiên.
5. Render từng task với renderTaskCard(task, now)
```

#### `renderTaskCard(task, now)`
```
Tạo HTML card với:
├── Status indicator (màu theo urgency: overdue/soon/normal)
├── Title hoặc postText
├── Category badge
├── Reminder time (relative: "in 2h" / "2d ago")
├── Repeat daily indicator
├── Badge cảnh báo bị lỡ giờ: "🚨 Lỡ lúc: [Giờ]" / "🚨 Missed at: [Time]" (chỉ hiển thị nếu task quá hạn)
├── Checklist items (nếu category='checklist')
│   └── Mỗi item có checkbox riêng
├── Action buttons:
│   ├── ✓ Done / Undo
│   ├── ✏️ Edit (inline)
│   ├── 🔗 View message (nếu có postId)
│   └── 🗑️ Delete
└── Note section (collapsible)
```

#### Inline Edit
```
Click ✏️:
  ├── Replace card content với form
  │   ├── Textarea (prefilled với postText)
  │   ├── Title input
  │   ├── Category select
  │   ├── Datetime picker (prefilled với reminder, chặn chọn ngày quá khứ trừ daily repeat)
  │   └── Repeat daily checkbox
  └── Save → check past date, update storage + reschedule alarm
```

#### Checklist Category
```
Khi tạo task với category='checklist':
  ├── Hiện checklist builder (max 10 items)
  ├── Add/remove items với Enter key
  └── Khi tất cả items checked → task tự động done
```

#### `getTargetTeamName()`
```
Resolve team name thông minh:
1. state.getTeam()?.name
2. Parse URL của active browser tab (/{team}/channels/...)
3. state.getConfig()?.teamName
4. 'dn' (fallback)
```

---

## 9. `tabs/memo.tab.js`

Quản lý ghi chú phân category. Tương tự tasks nhưng đơn giản hơn (không có reminder/alarm).

### Data Schema

```js
{
  id: 'uuid',
  type: 'memo',
  content: 'Note content',
  title: 'Optional title',
  category: 'personal',
  createdAt: 1234567890123,
  updatedAt: 1234567890123
}
```

### Sub-tabs (Categories)

Categories được định nghĩa trong settings. Mỗi category trở thành một sub-tab trong memo panel:
- "All" tab hiển thị tất cả
- Các category tabs filter theo `memo.category`

### Inline Edit

```
Click ✏️ trên card:
  └── Replace card DOM với:
      ├── <textarea> (prefilled)
      ├── Category select
      └── Save / Cancel buttons
```

### Reactive Update

```js
// Lắng nghe storage changes từ content.js (khi tạo quick note)
chrome.storage.onChanged.addListener((changes) => {
  if (changes['chatops_memos']) {
    loadMemos();  // Refresh list
  }
});
```

---

## 10. `tabs/mentions.tab.js`

### Mention Scan Flow

```
performScan()
  │
  ├── 1. Get channels:
  │   ├── Team = 'all' → getMyChannels() cho TẤT CẢ teams
  │   └── Team cụ thể → getMyChannels(teamId)
  │
  ├── 2. Filter channels:
  │   ├── Loại bỏ DM nếu !includeDM
  │   └── Chỉ giữ channels được chọn (nếu user filter)
  │
  ├── 3. Date range:
  │   ├── after: X ngày trước (default 7)
  │   └── before: hôm nay
  │
  ├── 4. Batch fetch posts (parallel, rate-limited):
  │   └── getChannelPosts(channelId, { since, per_page: 200 })
  │
  ├── 5. Với mỗi post: isMentionedInMessage(post, currentUser, options)
  │   └── Nếu match → scannedResults.push(result)
  │
  └── 6. Render results grouped by channel
```

### Mention Detection Engine — `isMentionedInMessage()`

Algorithm phức tạp tránh false positives:

```
1. Skip: post của chính mình
2. Skip: posts trước lastReadAt của channel

3. Normalize: strip diacritics, lowercase
   "Nguyễn Văn A" → "nguyen van a"

4. Build match keys từ user profile:
   ├── username: 'johndoe'
   ├── first_name: 'john'
   ├── last_name: 'doe'
   └── display_name: 'john doe'

5. Path A: @mention check (CHẮC CHẮN)
   ├── Message chứa '@username' + word boundary
   └── Return true ngay

6. Path B: Standalone word match (chỉ nếu allowStandalone=true)
   ├── Match key length ≥ 2
   ├── Word boundary regex: /(?<!\w)(term)(?!\w)/i
   ├── Compound filter lookahead: tránh match trong URLs, email, v.v.
   ├── Compound filter lookbehind: tránh "Hàn Quốc" match "Han"
   └── Return true nếu pass tất cả filters

7. Special: @here, @all, @channel
```

---

## 11. `tabs/search.tab.js`

### Search Query Building

```js
// Mattermost search query format
const terms = [
  keyword,
  fromUser ? `from:${fromUser}` : '',
  ...selectedChannels.map(ch => `in:${ch.name}`),
  afterDate ? `after:${afterDate}` : '',
  beforeDate ? `before:${beforeDate}` : ''
].filter(Boolean).join(' ');
```

### Multi-Team Search

```js
if (team === 'all') {
  // Search song song trong TẤT CẢ teams
  const allResults = await Promise.all(
    teams.map(t => searchPosts(t.id, { terms, ...params }))
  );
  // Merge + sort theo create_at (newest first)
  const merged = allResults.flat().sort((a, b) => b.create_at - a.create_at);
}
```

### Cancellation Pattern

```js
const searchState = { isCancelled: false };

async function performSearch() {
  searchState.isCancelled = false;
  
  for (const channel of channels) {
    if (searchState.isCancelled) return; // ← Check sau mỗi async op
    const posts = await searchInChannel(channel);
    // ...
  }
}

// Nút "Stop"
stopBtn.onclick = () => { searchState.isCancelled = true; };
```

### Infinite Scroll

```js
resultsContainer.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = resultsContainer;
  if (scrollHeight - scrollTop - clientHeight < 200) {
    // Gần cuối danh sách → load more
    performSpSearch(true); // isLoadMore = true
  }
});
```

---

## 12. `tabs/settings.tab.js`

File lớn nhất (~3571 dòng). Quản lý toàn bộ cấu hình extension.

### Settings Schema

Xem đầy đủ trong [AGENTS.md](../../AGENTS.md#5-storage-schema).

### `getSettings()` — Load với Defaults

```js
async function getSettings() {
  const stored = await chrome.storage.local.get('chatops_settings');
  
  // Deep merge: defaults ← stored
  const settings = deepMerge(DEFAULT_SETTINGS, stored.chatops_settings || {});
  
  // Auto-migration (backward compat):
  // - VN category names → EN slugs
  // - Promote search tab nếu chưa có promoted tabs
  
  return settings;
}
```

### `applyThemeToDOM(settings)`

```js
// Inject CSS variables vào :root
document.documentElement.style.setProperty('--chatops-accent', settings.accentColor);
document.documentElement.style.setProperty('--chatops-accent-text', settings.accentTextColor);
document.documentElement.style.setProperty('--chatops-header', settings.headerColor);
document.documentElement.style.setProperty('--chatops-nav', settings.navColor);
document.documentElement.style.setProperty('--chatops-padding', settings.appPadding + 'px');
document.documentElement.style.setProperty('--chatops-tab-text', settings.tabTextColor);
```

### Emoji Groups Management

```
Tối đa 5 nhóm emoji
Mỗi nhóm:
├── Tên (editable)
├── Tối đa 20 emoji
├── Drag-to-reorder emojis
└── Standard grid + Custom workspace emojis (infinite scroll)

activeReactionGroupId → nhóm được dùng khi spam react
```

### Cloud Sync

```js
// Backup memos lên chrome.storage.sync
// chrome.storage.sync giới hạn 8KB/item, 100KB total
// → Split mỗi memo thành item riêng

async function backupToCloud(memos) {
  for (const memo of memos) {
    await chrome.storage.sync.set({
      [`sync_memo_${memo.id}`]: JSON.stringify(memo)
    });
  }
}

async function restoreFromCloud() {
  const all = await chrome.storage.sync.get(null);
  const memos = Object.entries(all)
    .filter(([k]) => k.startsWith('sync_memo_'))
    .map(([, v]) => JSON.parse(v));
  return memos;
}
```

### Global API Exposed to Window

Settings tab expose một số functions toàn cục để các component khác điều hướng:

```js
window.openSettingsAccordion = (subtabName) => {
  switchTab('settings');
  openAccordion(subtabName);
};

window.navigateToSettingsSubtab = (subtabName) => {
  switchTab('settings');
  scrollToSection(subtabName);
};

window.showSuccessFeedback = (msg) => showToast(msg);
window.showErrorFeedback = (msg) => showToast(msg, 'error');
```

---

## 13. Storage Access Pattern (Summary)

```
Tất cả tabs đọc/ghi qua chrome.storage.local

Reads:
├── getSettings() → 'chatops_settings'
├── loadTasks() → 'chatops_memos' (filter type='task')
└── loadMemos() → 'chatops_memos' (filter type='memo')

Writes:
├── updateSettings(partial) → merge-save 'chatops_settings'
├── saveTask(task) → push to 'chatops_memos' array
└── saveMemo(memo) → push to 'chatops_memos' array

Cross-tab reactivity:
└── chrome.storage.onChanged.addListener → auto-refresh UI
    (Guard: isLocalTaskUpdate flag để tránh self-trigger)
```
