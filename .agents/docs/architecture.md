# Kiến Trúc Hệ Thống — ChatOps++

## 1. Tổng Quan

ChatOps++ là Chrome Extension (Manifest V3) được thiết kế theo kiến trúc **multi-layer**, mỗi layer có vai trò riêng và giao tiếp qua các cơ chế chuẩn của Chrome Extension API.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NGƯỜI DÙNG (Mattermost Web App)                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Tương tác
┌───────────────────────────────▼─────────────────────────────────────┐
│                         LAYER 1: UI LAYER                            │
│                                                                      │
│  ┌──────────────────────────────────┐  ┌─────────────────────────┐  │
│  │   Content Scripts                │  │   Side Panel            │  │
│  │   (Isolated World)               │  │   (sidepanel.html)      │  │
│  │                                  │  │                         │  │
│  │   content/loader.js              │  │   sidepanel/            │  │
│  │      └── content/content.js      │  │   ├── sidepanel.js      │  │
│  │           └── inject.js          │  │   ├── state.js          │  │
│  │               (Main World)       │  │   ├── persistence.js    │  │
│  │                                  │  │   ├── autocomplete.js   │  │
│  │   Chạy trực tiếp trên            │  │   ├── multiselect.js    │  │
│  │   chat.runsystem.vn             │  │   ├── tour.js           │  │
│  │                                  │  │   └── tabs/             │  │
│  └──────────────────────────────────┘  └─────────────────────────┘  │
└───────┬──────────────────────────────────────────────┬──────────────┘
        │ chrome.runtime.sendMessage()                 │
        │ chrome.storage.local                         │
┌───────▼──────────────────────────────────────────────▼──────────────┐
│                      LAYER 2: SERVICE WORKER                         │
│                                                                      │
│   src/background.js (entry point)                                    │
│   ├── src/background/alarms.js        Task reminders, mention check  │
│   ├── src/background/cookie-sync.js   Auth token management          │
│   ├── src/background/panel-manager.js Side panel lifecycle           │
│   └── src/api/                        Mattermost & AI API calls      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ fetch() / HTTP
┌───────────────────────────────▼─────────────────────────────────────┐
│                      LAYER 3: EXTERNAL SERVICES                      │
│                                                                      │
│   Mattermost API (chat.runsystem.vn/api/v4)                         │
│   Google Gemini API (generativelanguage.googleapis.com)              │
│   Groq API (api.groq.com)                                            │
│   OpenRouter API (openrouter.ai)                                     │
│   Giphy API (api.giphy.com)                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Diagrams

### 2.1 Background Service Worker

```
src/background.js
│
├── INIT FLOW (onInstalled / startup)
│   ├── initializePanelManager()   → panel-manager.js
│   ├── setupSidePanel()           → panel-manager.js
│   ├── setupCookieSync()          → cookie-sync.js
│   ├── syncCookies()              → cookie-sync.js
│   └── setupContextMenus()        → context menus tạo/ghi chú nhanh
│
├── ALARM FLOW (chrome.alarms.onAlarm)
│   ├── 'check-mentions' → handleMentionCheck()  → alarms.js
│   └── 'task_*'        → handleTaskAlarm()      → alarms.js
│       ├── Show in-page banner    → content.js (SHOW_REMINDER)
│       ├── Show OS notification   → chrome.notifications
│       └── Reschedule alarm
│
├── MESSAGE FLOW (chrome.runtime.onMessage)
│   ├── Reaction actions  → api/posts.js (addPostReaction, deletePostReaction)
│   ├── Task actions      → chrome.storage (update memos)
│   ├── User resolution   → api/users.js (searchUsers, getUsersByIds)
│   ├── Thread fetch      → api/posts.js (getPostThread)
│   ├── AI calls          → api/ai.js (callAiProvider)
│   └── Panel control     → panel-manager.js (toggle, update state)
│
└── COOKIE SYNC (chrome.cookies.onChanged)
    └── MMAUTHTOKEN/MMCSRF → chrome.storage.local['chatops_config']
```

### 2.2 Content Script Layer

```
content/loader.js
│
└── dynamic import('content/content.js?t=cache-bust')
    │
    ├── inject.js (main world, via <script> tag injection)
    │   │
    │   ├── findReduxStore()          BFS qua React Fiber tree
    │   ├── getPostInfo(el)           Walk up fiber, extract user info
    │   └── Event bridge:
    │       ← 'chatops-username-request'
    │       → 'chatops-username-response'
    │
    ├── MutationObserver (document.body, childList+subtree)
    │   ├── Pathname change    → handleChannelChange()
    │   ├── Emoji button found → injectImageButton()
    │   └── Post elements new  → injectQuickNoteButtons()
    │
    ├── UI Components Injected
    │   ├── Quick Action Buttons (per-post)
    │   │   ├── 🎯 Task button
    │   │   ├── 📒 Note button
    │   │   ├── 💬 Quick Reply
    │   │   ├── 📋 Quick Copy
    │   │   ├── 🤖 AI Summarize
    │   │   ├── 🔥 Spam Reactions
    │   │   ├── ↩️ Retract Reactions
    │   │   ├── 🎭 React-Along (Clone)
    │   │   └── 🗑️ Delete (own posts only)
    │   │
    │   ├── Image Picker Button (cạnh emoji button)
    │   │   ├── My Library tab
    │   │   │   ├── Preview, Edit, Resize, Delete
    │   │   │   └── Upload + Convert
    │   │   └── GIFs tab (Giphy)
    │   │
    │   ├── Quick Note/Task Popover (modal)
    │   │   ├── Flatpickr datetime picker
    │   │   ├── Preset offsets (+5m/+15m/+30m/+1h/...)
    │   │   └── Repeat daily option
    │   │
    │   ├── AI Summarize Modal
    │   │   └── Shimmer loading → result with copy button
    │   │
    │   ├── Reminder Banner (fixed position)
    │   │   ├── 6 positions × 3 sizes × multiple animations
    │   │   ├── Progress bar auto-dismiss
    │   │   └── Task action buttons
    │   │
    │   └── PWA Side Panel (iframe, fallback)
    │       └── Drag-resizable, squeezed main content
    │
    └── chrome.runtime.onMessage (from background)
        ├── SHOW_REMINDER
        ├── APP_LANG_CHANGED
        ├── INSERT_IMAGE_TO_CHAT
        ├── OPEN_QUICK_NOTE_FROM_CONTEXT_MENU
        ├── SHOW_HOVER_DEMO
        ├── TOGGLE_PWA_SIDE_PANEL
        └── SHOW_TOAST
```

### 2.3 Side Panel

```
sidepanel/sidepanel.html (HTML entry point)
│
└── sidepanel/sidepanel.js (Orchestrator)
    │
    ├── state.js ────────────── Shared in-memory state
    │   ├── user (profile)
    │   ├── team (current)
    │   ├── teams (all)
    │   └── config
    │
    ├── persistence.js ──────── UI state → localStorage
    ├── autocomplete.js ─────── User/channel typeahead component
    ├── multiselect.js ──────── Multi-channel selector component
    ├── tour.js ─────────────── 22-step onboarding flow
    │
    └── tabs/ (mỗi tab là một module độc lập)
        │
        ├── tasks.tab.js
        │   ├── setup(state)         ← called once by sidepanel.js
        │   ├── loadTasks()          Read from MEMOS storage
        │   ├── renderTaskCard(task) HTML template per card
        │   └── saveTask()           Validate + save + set alarm
        │
        ├── memo.tab.js
        │   ├── setup(state)
        │   ├── loadMemos()          Filter by category sub-tab
        │   └── renderMemoCard(memo) With inline edit support
        │
        ├── mentions.tab.js
        │   ├── setup(state)
        │   ├── performScan()        Batch fetch channels + posts
        │   └── isMentionedInMessage() Mention detection engine
        │
        ├── search.tab.js
        │   ├── setup(state)         + autocomplete + multiselect
        │   ├── performSpSearch()    Build query + call API + render
        │   └── Infinite scroll      Load more on scroll near bottom
        │
        └── settings.tab.js (file lớn nhất ~3571 dòng)
            ├── setup(state)         Load + apply settings + bind UI
            ├── getSettings()        Load from storage with defaults
            ├── updateSettings()     Merge-save partial
            ├── applyThemeToDOM()    CSS variables → :root
            ├── applyTabRepositioning()
            ├── applyTabVisibilityToDOM()
            └── window.openSettingsAccordion() (global API)
```

---

## 3. Data Flow Diagrams

### 3.1 Task Creation Flow

```
User bôi đen text trong Mattermost post
          │
          ▼
Click 🎯 trên Quick Action Buttons
          │
          ▼
openQuickNote(postEl, btn, 'task')
  ├── Extract text (selected → post text → image markdown)
  ├── Load categories từ settings
  └── Hiển thị popover
          │
User điền form + chọn thời gian
          │
          ▼
saveTask(popover)
  ├── Validate reminder time
  ├── Build task object { id, type, postId, reminder, ... }
  ├── chrome.storage.local.set({ chatops_memos: [...tasks] })
  ├── sendMessage(MEMO_UPDATED)   → sidepanel updates task list
  └── sendMessage(SET_TASK_ALARM) → background creates alarm
                                        │
                                        ▼
                              chrome.alarms.create('task_id', {when})
```

### 3.2 Task Reminder Flow

```
Chrome Alarm fires ('task_id')
          │
          ▼
handleTaskAlarm(taskId)   [alarms.js]
  ├── Load task từ storage
  ├── Build notification text
  ├── Gửi tới tất cả ChatOps tabs:
  │     sendMessage(SHOW_REMINDER, { text, taskId, postId, ... })
  │         │
  │         ▼ content.js
  │     showReminderBanner(...)
  │       ├── Hiển thị banner với progress bar
  │       └── Buttons: Done / Skip Today / View Message
  │
  ├── OS Notification (chrome.notifications.create)
  └── Reschedule sau snoozeMinutes phút
```

### 3.3 AI Summarize Flow

```
User click 🤖 AI button trên post
          │
          ▼
showAiSummarizeMenu()
  └── Dropdown: Thread / Single Post
          │
          ▼
processAiSummarize(postEl, action)
  ├── action='post': Extract post text + author
  ├── action='thread':
  │     sendMessage(GET_POST_THREAD, { postId })
  │         │
  │         ▼ background.js
  │     getPostThread(postId)   [api/posts.js]
  │     getUsersByIds(userIds)  [api/users.js]
  │     return { thread, userMap }
  │
  ├── Build prompt (với custom template nếu có)
  └── sendMessage(CALL_AI, { provider, apiKey, model, prompt })
          │
          ▼ background.js
      callAiProvider(prompt, apiKey, provider)  [api/ai.js]
          │
          ▼ External AI API
      return response text
          │
          ▼
      updateModal(content)  ← shimmer → result
```

### 3.4 Image Upload Flow

```
User chọn ảnh từ Image Picker
          │
          ▼
needsChatOpsConversion(mimeType)
  ├── false (JPEG/PNG/GIF): dùng trực tiếp
  └── true (WebP/AVIF/SVG/BMP):
        convertForChatOps(input)
          ├── SVG/BMP/TIFF → Canvas → PNG
          ├── WebP/AVIF animated → GIFEncoder → GIF
          └── WebP/AVIF static  → Canvas → PNG
          │
          ▼
openImageResizeModal(sources)
  ├── Slider scale 10-100%
  ├── Optional: openImageEditor() (draw/annotate)
  └── Khi Gửi:
        insertImageToChat(dataUrl)
          ├── dataURLtoBlob(dataUrl) → File object
          └── ClipboardEvent('paste') → Mattermost textarea
                  │
                  ▼
              Mattermost nhận file như người dùng paste thông thường
```

### 3.5 Username Resolution Flow (3-layer fallback)

```
getPostUsername(postEl)
          │
          ▼
Layer 1: React Bridge (inject.js)
  ├── fire 'chatops-username-request' custom event
  ├── inject.js: walk React Fiber UP 40 levels
  │   ├── Found props.post.username → return
  │   └── Found props.post.user_id → usernameFromStore(id)
  └── Wait 200ms for response
          │
          ▼ (nếu Layer 1 thất bại)
Layer 2: DOM Scraping
  ├── Walk backwards 30 post elements
  ├── Check data-username attribute
  ├── Parse user-popover_{username} ID patterns
  └── Parse avatar alt text (EN + VI patterns)
          │
          ▼ (nếu Layer 2 thất bại)
Layer 3: Display Name API
  ├── Extract display name từ DOM
  ├── Strip [...] và (...) brackets
  └── sendMessage(RESOLVE_DISPLAY_NAME)
          │ background.js
        searchUsers(displayName)
        → find best match
        → return username
```

---

## 4. Storage Architecture

```
chrome.storage.local (Unlimited storage permission)
│
├── chatops_config      Config + auth credentials (auto-sync từ cookies)
├── chatops_state       App state
├── chatops_settings    User preferences (theme, notifications, AI, ...)
├── chatops_memos       Array: tất cả tasks + memos
├── custom_memes        Array: base64 images library
├── sidepanel_tab       Current active tab
├── btn_position        Floating button position
└── [giphy_cache, etc]  Miscellaneous caches

chrome.storage.sync (Backup)
│
└── sync_memo_{id}      Từng memo/task được backup riêng lẻ
                        (split để bypass 8KB/item limit)

localStorage (Side Panel origin)
│
└── chatops_persist_{key}  UI state (form drafts, filter values)
```

---

## 5. Security Model

### Content Security Policy (CSP)
- **No eval()** — Không dùng dynamic code execution
- **No remote scripts** — Tất cả JS được bundle cùng extension
- **No inline event handlers** trong HTML — Dùng addEventListener
- External hosts được whitelist trong `host_permissions`:
  - `https://chat.runsystem.vn/*` — Mattermost
  - `https://generativelanguage.googleapis.com/*` — Gemini
  - `https://api.groq.com/*` — Groq
  - `https://openrouter.ai/*` — OpenRouter

### World Isolation
- **Isolated World** (content.js): Không access `window` của trang, không access React Fiber
- **Main World** (inject.js): Có access React Fiber/Redux, nhưng không access chrome.* APIs
- Bridge qua **Custom Events** (`chatops-username-request/response`)

### Authentication
- Auth cookies (`MMAUTHTOKEN`, `MMCSRF`) được tự động sync từ browser cookies
- Stored trong `chrome.storage.local` (không sync ra cloud)
- Injected vào mọi API request bởi `src/api/client.js`

---

## 6. Performance Considerations

| Kỹ thuật | Nơi dùng | Lý do |
|---|---|---|
| MutationObserver debounce 100ms | content.js | Tránh re-inject liên tục khi DOM thay đổi |
| `data-chatops-injected` flag | content.js | Tránh inject buttons nhiều lần vào cùng post |
| `runWithObserverDisabled()` | content.js | Tránh observer loop khi chính mình mutate DOM |
| GIF trending cache | content.js | Không gọi Giphy API lại sau khi đã load |
| `cachedSettings` | content.js | Tránh gọi storage trên hot paths (per-post injection) |
| Batch mutations với Set | content.js | Gom nhóm, xử lý một lần thay vì N lần |
| API call parallel | search.tab.js, mentions.tab.js | `Promise.all()` cho user/channel fetches |
| Pagination | search.tab.js | Infinite scroll, không load tất cả cùng lúc |
| `requestAnimationFrame` | sidepanel.js | DOM updates mượt mà |
