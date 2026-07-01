# Background Service Worker — ChatOps++

> File: `src/background.js` + `src/background/`

---

## 1. Tổng Quan

Background Service Worker là **bộ não trung tâm** của extension, chạy trong context riêng biệt với privileges cao hơn content scripts. Đây là nơi duy nhất thực hiện các tác vụ cần quyền nâng cao:

- Xử lý Chrome Alarms (task reminders)
- Gọi Mattermost API
- Quản lý Side Panel lifecycle
- Đồng bộ authentication cookies
- Xử lý Context Menu actions

**Quan trọng (MV3):** Service Worker có thể bị Chrome terminate bất cứ lúc nào sau khoảng 5 phút không hoạt động. Không lưu state quan trọng vào biến — luôn dùng `chrome.storage`.

---

## 2. Entry Point: `src/background.js`

### 2.1 Khởi Tạo

```
chrome.runtime.onInstalled (hoặc startup)
          │
          ▼
initialize()
  ├── initializePanelManager()  → Pre-populate window/tab maps
  ├── setupSidePanel()          → Enable/disable panel per tab URL
  ├── setupCookieSync()         → Listen cookie changes
  ├── syncCookies()             → Initial credential sync
  ├── setupContextMenus()       → Create right-click menu items
  └── syncTaskAlarms()          → Re-synchronize task alarms on startup
```

**Context Menu items:**
- "Tạo nhanh công việc 🎯" — khi bôi đen text
- "Tạo nhanh ghi chú 📒" — khi bôi đen text

Khi click context menu → gửi `OPEN_QUICK_NOTE_FROM_CONTEXT_MENU` tới content script kèm selected text và mode ('task'/'note').

### 2.2 Alarm Handlers

```
chrome.alarms.onAlarm
  ├── name === 'check-mentions'  → handleMentionCheck()
  └── name.startsWith('task_')  → handleTaskAlarm(alarm.name)
```

### 2.3 Message Handlers

Xem bảng đầy đủ trong [AGENTS.md](../../AGENTS.md#4-message-types-ipc).

### 2.4 Key Internal Handlers

#### `handleMarkTaskDone(taskId, sendResponse)`
```
1. Xóa Chrome Alarm tương ứng
2. Tìm task trong chrome.storage.local['chatops_memos']
3. Set task.done = true, task.doneAt = Date.now()
4. Nếu task.repeatDaily:
   a. Tính ngày mai (hoặc ngày tiếp theo trong tương lai)
   b. Giữ nguyên giờ:phút
   c. Tạo alarm mới cho ngày đó
5. Lưu storage
6. sendResponse({ success: true })
```

#### `handleSkipTaskDaily(taskId, sendResponse)`
```
Tương tự handleMarkTaskDone nhưng:
- KHÔNG set done = true
- Chỉ reschedule sang ngày mai
```

#### `handleSpamReactions(postId, sendResponse)`
```
1. Load settings từ storage
2. getActiveEmojisFromSettings(settings):
   - Ưu tiên: reactionGroups[activeReactionGroupId].emojis
   - Fallback 1: settings.spamEmojis
   - Fallback 2: 10 emoji mặc định
3. Lấy profile hiện tại (getMyProfile)
4. Với mỗi emoji → addPostReaction(userId, postId, emoji)
   Delay 150ms giữa mỗi reaction
```

#### `handleCloneReactions(postId, sendResponse)`
```
1. getPostReactions(postId) → tất cả reactions
2. Filter: loại bỏ emojis mà current user đã react
3. Với mỗi emoji chưa react → addPostReaction(...)
   Delay 120ms
```

#### `handleRetractReactions(postId, sendResponse)`
```
1. getPostReactions(postId) → tất cả reactions
2. Filter: chỉ giữ reactions của current user
3. Với mỗi emoji → deletePostReaction(userId, postId, emoji)
   Delay 120ms
```

#### `handleGetPostThread(postId, sendResponse)`
```
1. getPostThread(postId) → thread object (Mattermost format)
2. Collect unique user_ids từ tất cả posts
3. getUsersByIds(userIds) → user array
4. Build userMap: { userId: username }
5. sendResponse({ thread, userMap })
```

#### `handleResolveDisplayName(displayName, sendResponse)`
```
1. searchUsers(displayName) → user array
2. Normalize displayName (strip diacritics, lowercase)
3. Score candidates:
   - full_name exact match → cao nhất
   - nickname match
   - username match
4. Return best match username
```

#### Notification Click Handler
```
chrome.notifications.onClicked
  1. Parse notificationId → tìm task trong storage
  2. Build permalink: {chatopsUrl}/{teamName}/pl/{postId}
  3. Set storage['sidepanel_tab'] = 'tasks'
  4. Focus tab ChatOps hiện có (không reload lại URL) hoặc tạo tab mới nếu chưa có
  5. Mở side panel
  6. Sau 300ms: sendMessage(SWITCH_TAB, 'tasks')
```

---

## 3. `src/background/alarms.js`

### `handleMentionCheck()`
Hiện tại chỉ clear badge (logic scan mentions đã được move sang sidepanel). Giữ hàm để tương thích với alarm schedule.

### `handleTaskAlarm(taskId)`

```
1. Load language strings (loadLanguage())
2. Load task từ storage theo taskId
3. Nếu task không tồn tại → clearAlarm + return
3.1. Nếu task.type === 'group_reminder':
   a. Lấy nội dung tin nhắn trực tiếp từ task.note.
   b. Gọi API createPost gửi tin nhắn tới targetChannelId.
   c. Broadcast SHOW_TOAST tới tất cả các tab ChatOps đang mở.
   d. Gọi rescheduleToNextDailyOccurrence(task, memos) để dời lịch hằng ngày và return.
4. Nếu task.done:
   a. Nếu task.repeatDaily:
      - Reset task: done=false, doneAt=null
      - Reset checklist items: semua checked=false
      - Tiếp tục notify (KHÔNG return)
   b. Nếu không repeatDaily → clearAlarm + return
4.1. Check Stale Alarm Guard:
   - Nếu là daily task: Chỉ coi là stale (bị bỏ qua không thông báo) nếu báo thức thuộc ngày lịch cũ khác so với ngày hiện tại (local time) và trễ hơn STALE_THRESHOLD_MS. Nếu thuộc cùng ngày, thông báo vẫn hiển thị bình thường.
   - Nếu là one-time task: Trễ hơn STALE_THRESHOLD_MS thì coi là stale (bị hủy).
   - Nếu stale: Tự động dời lịch báo thức sang lần kế tiếp đối với daily task và không hiển thị thông báo.
5. Build message:
   - Lấy task.postText (truncate 100 chars) + task.note
6. Check settings.notificationType:
   - 'in-page' hoặc 'both':
       Tìm tất cả tabs với URL chứa CHATOPS_CONFIG.DOMAIN
       sendMessage(SHOW_REMINDER, { text, taskId, postId, ... })
   - 'system' hoặc 'both':
       chrome.notifications.create({
         type: 'basic',
         requireInteraction: true,
         ...
       })
7. chrome.action.setBadgeText({ text: 'TASK' })
8. chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' })
9. Reschedule alarm: now + snoozeMinutes phút
```

### `syncTaskAlarms()`
Đồng bộ và đăng ký lại toàn bộ báo thức Chrome (`chrome.alarms`) cho các task đang active từ storage khi khởi tạo extension (giúp tránh việc mất báo thức khi extension reload hoặc trình duyệt restart).

```
1. Quét tất cả tasks trong chrome.storage.local['chatops_memos']
2. Xóa các báo thức Chrome cũ bắt đầu bằng 'task_'
3. Với mỗi task loại 'task' chưa hoàn thành (hoặc daily task kể cả đã done):
   - Nếu báo thức ở tương lai: Đăng ký báo thức mới
   - Nếu báo thức daily ở quá khứ (reminder <= now):
     a. Tự động tính toán dời ngày báo thức sang lần xảy ra tiếp theo trong tương lai
     b. Cập nhật thuộc tính reminder trong storage
     c. Reset trạng thái hoàn thành (task.done = false, checklist done = false)
     d. Tạo alarm mới trong Chrome
```

---

## 4. `src/background/cookie-sync.js`

### Tại Sao Cần File Này?

Mattermost dùng cookies để xác thực. Content scripts và side panel KHÔNG có direct access tới browser cookies (cần permission `cookies` + `host_permissions`). File này chạy trong background (có đủ quyền) để đồng bộ cookies vào `chrome.storage.local`, nơi mọi component có thể đọc.

### `syncCookies()`
```
1. getConfig() → lấy chatopsUrl (fallback: DEFAULT_URL)
2. Song song get 2 cookies:
   - chrome.cookies.get({ url, name: 'MMAUTHTOKEN' })
   - chrome.cookies.get({ url, name: 'MMCSRF' })
3. Nếu tìm được:
   - Storage['chatops_config'].cookie = 'MMAUTHTOKEN=<value>'
   - Storage['chatops_config'].csrf   = 'MMCSRF=<value>'
```

### `setupCookieSync()`
```
chrome.cookies.onChanged listener:
  Điều kiện để trigger syncCookies():
  ├── cookie.domain chứa CHATOPS_CONFIG.DOMAIN
  ├── change.removed === false (không phải xóa)
  └── cookie.name là MMAUTHTOKEN hoặc MMCSRF
```

---

## 5. `src/background/panel-manager.js`

### Vấn Đề Cần Giải Quyết

Mattermost có thể chạy ở 2 chế độ:
1. **Browser tab thông thường** — Dùng Chrome native Side Panel API
2. **PWA window** (Install as App) — Chrome Side Panel API KHÔNG hoạt động trong PWA windows

Panel manager phân biệt hai trường hợp này và xử lý phù hợp.

### State Maps (module-level, in-memory)

```js
sidePanelState: Map<tabId, 'OPEN' | 'CLOSED'>
windowTypes:    Map<winId, 'normal' | 'app' | 'popup'>
tabWindowIds:   Map<tabId, winId>
```

**Lưu ý:** Maps này bị reset khi Service Worker terminate. `initializePanelManager()` được gọi khi restart để rebuild từ `chrome.windows.getAll()`.

### `initializePanelManager()`
```
chrome.windows.getAll({ populate: true })
  └── Với mỗi window:
        ├── windowTypes.set(win.id, win.type)
        └── Với mỗi tab trong window:
              tabWindowIds.set(tab.id, win.id)
```

### `getWindowTypeForTab(tabId)`
```
1. Tra cứu: windowId = tabWindowIds.get(tabId)
2. Nếu có: return windowTypes.get(windowId)
3. Nếu miss: async self-heal
   chrome.windows.get(windowId) → update maps → return type
```

### `updatePanelVisibility(tabId, url)`
```
Điều kiện enable panel:
  ├── URL chứa CHATOPS_CONFIG.DOMAIN ('chat.runsystem.vn')
  └── window KHÔNG phải 'app' (PWA) hoặc 'popup'

Logic:
  Nếu ChatOps URL + normal window:
    chrome.sidePanel.setOptions({ tabId, enabled: true })
  Ngược lại:
    chrome.sidePanel.setOptions({ tabId, enabled: false })
```

### `toggleSidePanel(tabId)`
```
windowType = getWindowTypeForTab(tabId)

Nếu PWA window:
  sendMessage(TOGGLE_PWA_SIDE_PANEL) → content.js
  → content.js xử lý iframe panel

Nếu normal window, state = 'CLOSED':
  chrome.sidePanel.open({ tabId })
  sidePanelState.set(tabId, 'OPEN')
  Broadcast SIDE_PANEL_STATE update

Nếu normal window, state = 'OPEN':
  chrome.sidePanel.setOptions({ tabId, enabled: false })
  chrome.sidePanel.setOptions({ tabId, enabled: true })
  sidePanelState.set(tabId, 'CLOSED')
  Broadcast SIDE_PANEL_STATE update

Nếu error:
  Gửi OS notification hướng dẫn click icon extension
```

---

## 6. Cấu Trúc Constants Liên Quan

```js
// src/constants.js

ALARMS: {
  MENTION_CHECK: 'check-mentions',  // Periodic alarm mỗi 5 phút
  TASK_PREFIX: 'task_'               // Prefix cho task alarms
}

UI_CONFIG: {
  TOAST_DURATION: 2500,        // ms
  BANNER_DURATION: 15000,      // ms (15 giây)
  MENTION_CHECK_MINUTES: 5,    // phút
  DEBOUNCE_MS: 300,
  DEFAULT_SNOOZE_MINUTES: 5,
  REACTION_DELAY_MS: 150,      // ms giữa mỗi reaction (spam)
  RETRACT_DELAY_MS: 120        // ms giữa mỗi retract
}
```

---

## 7. Error Handling

Background handlers luôn wrap trong try/catch và gọi `sendResponse` với error:

```js
try {
  const result = await someAsyncOperation();
  sendResponse({ success: true, data: result });
} catch (error) {
  console.error('[ChatOps Background]', error);
  sendResponse({ success: false, error: error.message });
}
```

Content/sidepanel scripts check `response.success` trước khi dùng data.

---

## 8. Timing & Rate Limiting

| Tác vụ | Delay |
|---|---|
| Spam reactions | 150ms/reaction |
| Retract reactions | 120ms/reaction |
| Clone reactions | 120ms/reaction |
| Task alarm reschedule | Ngay sau notify |
| Notification click → open tab | 300ms (DOM settle) |
