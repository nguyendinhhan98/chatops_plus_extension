# Content Scripts — ChatOps++

> Files: `content/loader.js`, `content/inject.js`, `content/content.js`

---

## 1. Tổng Quan

Content scripts là layer chạy **trực tiếp trên trang Mattermost** (`https://chat.runsystem.vn`). Đây là nơi toàn bộ UI enhancement được inject vào DOM, sự kiện được lắng nghe, và tính năng được kích hoạt khi user tương tác.

### Ba File và Vai Trò

```
loader.js      ─── Entry point, bridge ESM limitation của Chrome
    │
    └── content.js (ESM, Isolated World)
            │
            ├── Inject vào <head> → inject.js (Main World)
            │                              │
            │   ◄── Custom Events ─────────┘
            │
            ├── MutationObserver → Detect DOM changes
            ├── Quick Action Buttons → Inject vào mỗi post
            ├── Image Picker → Inject cạnh emoji button
            ├── Quick Note/Task Popover → Modal
            ├── Reminder Banner → Fixed overlay
            └── PWA Panel → Iframe fallback
```

### Chrome Security Boundaries

| | Isolated World (content.js) | Main World (inject.js) |
|---|---|---|
| Truy cập chrome.* APIs | ✅ | ❌ |
| Truy cập window của trang | ❌ | ✅ |
| Truy cập React Fiber | ❌ | ✅ |
| Truy cập Redux store | ❌ | ✅ |
| Truy cập DOM | ✅ | ✅ |

---

## 2. `loader.js` — ESM Bridge

### Vấn Đề
Chrome MV3 content scripts trong `manifest.json` không thể dùng ES Modules trực tiếp (không hỗ trợ `import` statement và không chạy như `type="module"`).

### Giải Pháp
```js
// loader.js được khai báo trong manifest (type thông thường)
// Sau đó dùng dynamic import() để load content.js như ESM
(async () => {
  const src = chrome.runtime.getURL('content/content.js') + '?t=' + Date.now();
  await import(src);
})();
```

**`?t=Date.now()`**: Cache-busting — đảm bảo Chrome load phiên bản mới nhất sau mỗi extension update. Không có điều này, Chrome có thể cache phiên bản cũ.

---

## 3. `inject.js` — React Fiber Bridge (Main World)

### Tại Sao Cần File Này?

Mattermost là React app. User info trong mỗi post được lưu trong React component state, không phải DOM attributes thuần. Để lấy username từ một post element, phải traverse React Fiber tree.

Content.js (isolated world) không access được React Fiber. Inject.js chạy trong Main World nên access được.

### Cách Inject

```js
// Trong content.js
const script = document.createElement('script');
script.src = chrome.runtime.getURL('content/inject.js');
document.head.appendChild(script);
```

### Các Hàm Trong inject.js

#### `findReduxStore()` — Tìm Redux Store
```
1. Lấy element #root (Mattermost app root)
2. Tìm key __reactFiber$ hoặc __reactInternalInstance$ trên root
3. BFS (queue) qua React Fiber tree, tối đa 200 nodes
4. Nhận biết Redux Provider: node.store?.getState === 'function'
5. Trả về store object (hoặc null)
```

#### `getPostInfo(el)` — Extract User Info Từ Post Element
```
Walk UP React Fiber tree từ post DOM element (tối đa 40 levels):
  
  Ưu tiên 1: props.post.user_id + props.post.username
    → Return ngay, BREAK (tránh leo lên post cha)
  
  Ưu tiên 2: props.user / sender / profile / author / member / creator
    → Nếu object có .username → dùng
  
  Ưu tiên 3: props.username (string, không chứa khoảng trắng)
  
  Fallback: Chỉ có userId, không có username
    → usernameFromStore(userId)  ← Tra Redux state
    → state.entities.users.profiles[userId].username
```

#### Event Bridge — Cầu Nối Hai Worlds

```js
// inject.js lắng nghe trong Main World
window.addEventListener('chatops-username-request', (e) => {
  const { postId } = e.detail;
  const el = document.getElementById(`post_${postId}`)
           || document.getElementById(`rhsPost_${postId}`);
  const info = getPostInfo(el);
  window.dispatchEvent(new CustomEvent('chatops-username-response', {
    detail: { postId, username: info.username, userId: info.userId }
  }));
});

// content.js gửi request từ Isolated World
window.dispatchEvent(new CustomEvent('chatops-username-request', {
  detail: { postId: 'abc123' }
}));
window.addEventListener('chatops-username-response', handler);
```

---

## 4. `content.js` — Core Content Script

### Initialization Flow

```
IIFE async bắt đầu
  │
  ├── loadLanguage()                   Load i18n
  ├── chrome.storage.local.get(...)    Load settings + memos
  │
  ├── injectMainWorldScript()          Inject inject.js vào <head>
  ├── injectDynamicTheme()             CSS variables + font Inter
  │
  ├── MutationObserver setup           Watch DOM changes
  ├── chrome.runtime.onMessage         Listen background messages
  │
  ├── setInterval(alignButtonToSidebar, 2000)   Floating button
  ├── updateFloatingBadgeCount()       Badge count
  │
  └── Khi tất cả setup xong:
      injectQuickNoteButtons(document.body)   Initial inject
      injectImageButton()
```

### 4.1 MutationObserver — DOM Change Detection

```js
// Observe toàn bộ document.body
observer = new MutationObserver((mutations) => {
  // Guard: disconnect nếu extension bị unload
  if (!chrome.runtime?.id) {
    observer.disconnect();
    return;
  }
  
  // Batch vào Set để deduplicate
  mutations.forEach(m => {
    mutatedSubtrees.add(m.target.closest('[id^="post_"]') || m.target);
  });
  
  // Debounce 100ms
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Check pathname change (channel navigation)
    if (window.location.pathname !== lastPathname) {
      handleChannelChange();
      lastPathname = window.location.pathname;
    }
    
    // Re-inject vào các subtrees đã thay đổi
    mutatedSubtrees.forEach(subtree => {
      injectQuickNoteButtons(subtree);
      // Check emoji button mới xuất hiện
    });
    
    mutatedSubtrees.clear();
  }, 100);
});

observer.observe(document.body, { childList: true, subtree: true });
```

### 4.2 Quick Action Buttons — `injectQuickNoteButtons(target)`

Function quan trọng nhất. Inject action buttons vào mỗi Mattermost post.

```
1. Tìm tất cả post elements trong target:
   Selectors: .post:not([data-chatops-injected]),
              [id^="post_"]:not([data-chatops-injected]),
              [id^="rhsPost_"]:not([data-chatops-injected])

2. Với mỗi post:
   a. Skip nếu post bị xóa (post--deleted class hoặc "(message deleted)" text)
   b. Mark data-chatops-injected="true" (tránh inject lại)
   c. Tìm action area: .post-menu, .post__actions, .dot-menu__container
   d. Tạo div.chatops-action-group
   e. Insert trước/sau native actions (theo settings.customButtonsPosition)

3. Với mỗi button type (kiểm tra settings trước):
   
   🎯 task-btn (floatingButtons.quickTask):
     Click → openQuickNote(postEl, btn, 'task')
   
   📒 note-btn (floatingButtons.quickNote):
     Click → openQuickNote(postEl, btn, 'note')
   
   💬 quick-reply-btn (floatingButtons.quickReply):
     Click:
       1. getPostUsername(postEl)  ← 3-layer fallback
       2. findReplyButton(postEl).click()  ← Click native reply
       3. Poll RHS textarea 100ms intervals, timeout 5s
       4. insertTextIntoTextarea(textarea, '@username ')
   
   📋 quick-copy-btn (floatingButtons.quickCopy):
     Click → Extract post text → copyToClipboard(text)
   
   🔥 spam-btn (floatingButtons.spamReactions):
     Click → sendMessage(SPAM_POST_REACTIONS, { postId })
   
   ↩️ retract-btn (floatingButtons.spamReactions):
     Click → sendMessage(RETRACT_POST_REACTIONS, { postId })
   
   🎭 clone-btn (floatingButtons.reactAlong):
     Click → sendMessage(CLONE_POST_REACTIONS, { postId })
   
   🗑️ msg-delete-btn (settings.quickDelete, chỉ post của mình):
     Click → Confirm → sendMessage(DELETE_POST, { postId })
```

### 4.3 Username Resolution — `getPostUsername(postEl)`

3-layer fallback system:

```
Layer 1: React Bridge (fastest, most accurate)
  ├── cleanPostId(postEl) → postId
  ├── Dispatch 'chatops-username-request' custom event
  ├── Wait 200ms for 'chatops-username-response'
  ├── Nếu username trả về → return username ✅
  └── Nếu chỉ có userId → sendMessage(RESOLVE_USER_ID) → return

Layer 2: DOM Scraping (fallback)
  ├── Walk backwards qua 30 post elements cùng level
  ├── Với mỗi element:
  │   ├── Check data-username attribute
  │   ├── Parse #user-popover_{username} ID pattern
  │   └── Parse avatar alt text (EN + VI patterns)
  └── Return khi tìm thấy match

Layer 3: Display Name API (last resort)
  ├── Tìm display name trong post DOM (.user-popover__name, etc.)
  ├── Strip [Dept] hoặc (Role) patterns
  └── sendMessage(RESOLVE_DISPLAY_NAME, { displayName })
          → background searchUsers(displayName)
          → return best match username
```

### 4.4 Quick Note/Task/Group Reminder Popover — `openQuickNote()`

```
openQuickNote(postEl, anchorBtn, mode, overrideText)
  │
  ├── getOrCreatePopover()   ← Tạo/cache modal DOM
  │   ├── Form fields: title, textarea, category, datetime
  │   ├── Flatpickr datetime picker
  │   ├── Preset offset dropdown (+5m/+15m/+30m/+1h/+2h/+4h/+6h/+8h)
  │   ├── "Repeat daily" checkbox
  │   └── Group Reminder specific settings (khi mode='group_reminder'):
  │       ├── Ẩn trường title, category, và các dropdown chọn team/channel/tag
  │       ├── Tự động resolve target channel và teamId dựa trên URL hiện tại
  │       ├── Bổ sung Format Toolbar (In đậm, In nghiêng, Code, Gạch ngang, Trích dẫn) và các nút chèn nhanh tag (@all, @here)
  │       └── Textarea tích hợp Auto-complete @mention danh sách thành viên dựa trên keyword (gọi SEARCH_USERS_AUTOCOMPLETE)
  │
  ├── Text extraction (cho mode='task'):
  │   ├── Ưu tiên: window.getSelection() nếu selection nằm trong post
  │   ├── Fallback: .post-message__text innerText
  │   └── Append: markdown của images trong post (![img](url))
  │
  └── Position popover cạnh anchor button (hoặc center màn hình nếu tạo từ chatbox)

Khi save (saveTask):
  ├── Validate: phải có reminder time (và target channel nếu là group_reminder)
  ├── Build task/reminder object (type: 'task' | 'memo' | 'group_reminder')
  ├── chrome.storage.local[MEMOS].push(task)
  ├── sendMessage(MEMO_UPDATED)   → sidepanel refresh list
  └── sendMessage(SET_TASK_ALARM) → background set chrome alarm
```

#### `injectGroupReminderButton()`
Injects a 📢 button next to the emoji/file buttons under the main Mattermost chatbox and the RHS chatbox, allowing users to schedule a group reminder directly from the chat UI.

### 4.5 Image System

#### `insertImageToChat(url)`

Cơ chế inject ảnh vào Mattermost textarea:

```
Nếu url là data: (base64):
  1. needsChatOpsConversion(mimeType) → convert nếu cần
  2. dataURLtoBlob(url) → File object
  3. ClipboardEvent('paste') với DataTransfer chứa File
  4. Dispatch event vào textarea
  → Mattermost nhận như người dùng paste file thực

Nếu url là http/https:
  1. Tìm textarea đang active
  2. Insert markdown: ![image](url)
  3. Trigger React input events
```

#### `insertAndMaybeSend(url, forceSend = false)`

Wrapper xung quanh `insertImageToChat` hỗ trợ tự động gửi tin nhắn:
1. Gọi `insertImageToChat(url)` để chèn ảnh/GIF.
2. Kiểm tra nếu `forceSend` được bật hoặc cài đặt `pickerAutoSend` là `true`.
3. Nếu gửi trực tiếp: chờ 150ms để text/attachment load rồi tự động thực hiện:
   - Gọi `parentForm.requestSubmit()` để gửi form một cách native và độc lập với ngôn ngữ hiển thị.
   - Nếu không thành công, tìm và nhấp vào nút Gửi sử dụng các bộ chọn đa ngôn ngữ (`send`, `gửi`).
   - Nếu vẫn thất bại, dispatch phím `Enter` giả lập vào textarea.


#### Image Editor (`openImageEditor`)

Canvas-based drawing editor:
- **Tools**: Brush, Shapes (Rect/Circle/Triangle/Line dropdown), Arrow, Text, Eraser, **Upload Custom Background** (cho phép tải ảnh cá nhân lên làm nền để vẽ đè), **Ctrl+V Paste Background** (hỗ trợ nhấn Ctrl+V/Cmd+V để dán trực tiếp ảnh từ clipboard làm nền vẽ).
- **Colors**: 6 preset + native color wheel
- **Size**: Slider 2–50px
- **Undo**: Stack tối đa 20 states (ctx.getImageData snapshots)
- **Text**: `<textarea>` overlay → blur → render lên canvas

#### Image Converter Pipeline

```
User upload file
  │
  ▼
needsChatOpsConversion(type, filename)
  ├── JPEG/PNG/GIF (không animated) → false, dùng trực tiếp
  └── WebP/AVIF/SVG/BMP/TIFF → true, cần convert
          │
          ▼
convertForChatOps(input)   [src/utils/imageConverter.js]
  ├── SVG/BMP/TIFF → Canvas → PNG data URL
  ├── WebP/AVIF với ImageDecoder API:
  │   ├── frameCount > 1 → GIFEncoder → GIF data URL
  │   │   ├── Scale nếu > 1024px
  │   │   └── Alpha detection per-frame
  │   └── frameCount = 1 → Canvas → PNG data URL
  └── Unknown → Canvas → PNG data URL
          │
          ▼
openImageResizeModal(sources)
  ├── Slider resize 10-100%
  ├── Optional: openImageEditor()
  └── insertImageToChat(finalDataUrl)
```

### 4.6 Reminder Banner — `showReminderBanner()`

```
showReminderBanner(text, taskId, isTask, postId, taskTeamName, isDaily)
  │
  ├── Đọc cachedSettings:
  │   ├── notificationPosition (6 vị trí)
  │   ├── notificationSize     (small/medium/large)
  │   └── notificationAnimation
  │
  ├── Tạo banner element với:
  │   ├── Close button (×)
  │   ├── Progress bar (BANNER_DURATION = 15s)
  │   ├── Text (collapse/expand nếu > 80 chars)
  │   └── Task buttons (nếu isTask):
  │       ├── "✓ Đã xong" → sendMessage(MARK_TASK_DONE)
  │       ├── "⏭ Bỏ qua hôm nay" → sendMessage(SKIP_TASK_DAILY)
  │       └── "📌 Xem tin nhắn" → handleNotificationJump()
  │
  └── Position theo setting:
      top-right, top-left, bottom-right, bottom-left,
      top-center, bottom-center, center
```

### 4.6.1 Missed Reminders Digest Banner — `checkAndShowOverdueDigest()`

Hệ thống tự động quét các công việc trễ hạn khi người dùng mở trang Mattermost và hiển thị một banner tổng hợp thông báo ở góc màn hình.

```
checkAndShowOverdueDigest(memos)
  │
  ├── Tìm các task pending có reminder < now (trễ hạn)
  ├── Loại trừ các task đã bị dismiss trong session hiện tại (sessionStorage)
  ├── Nếu số lượng > 0:
  │   ├── Tạo banner fixed ở góc màn hình (dựa trên setting notificationPosition)
  │   ├── Hiển thị số lượng task trễ hạn
  │   ├── Thêm button "Xem các công việc bị lỡ" để mở sidepanel và chuyển sang tab tasks
  │   └── Lưu các task ID đã dismissed vào sessionStorage khi đóng banner
```

### 4.7 PWA Side Panel

Khi Chrome native Side Panel API không hoạt động (PWA window):

```
openPwaSidePanel()
  ├── Tạo container div (fixed, right: 0, width: 360px)
  ├── Tạo iframe src="sidepanel/sidepanel.html?mode=pwa"
  ├── Tạo drag resizer bar (bên trái)
  │   ├── onmousedown/mousemove/mouseup để resize
  │   ├── Min: 320px, Max: 75vw
  │   └── Lưu width vào storage
  └── Squeeze main content:
      document.getElementById('root').style.marginRight = width + 'px'
```

---

## 5. Helper Functions Reference

### DOM Utilities
| Function | Mô tả |
|---|---|
| `cleanPostId(postEl)` | Extract pure ID từ `post_abc123` → `abc123` |
| `findReplyButton(el)` | Tìm native Mattermost reply button (4 fallback levels) |
| `insertTextIntoTextarea(textarea, text)` | Insert text bypass React controlled input |
| `tagUserInChat(username, isRhs)` | Insert `@username ` vào chat textarea |
| `handleChannelChange()` | Reset buttons khi navigate channel mới |
| `runWithObserverDisabled(fn)` | Tạm tắt observer khi mutate DOM |

### Image Utilities
| Function | Mô tả |
|---|---|
| `getBase64Size(dataURL)` | Tính kích thước bytes từ base64 string |
| `formatSize(bytes)` | Format bytes → "1.23 MB" |
| `dataURLtoBlob(dataurl)` | Convert base64 → Blob |
| `createBlankWhiteImage(w, h)` | Tạo canvas trắng 800×600 |
| `compressImage(file, maxW, maxH, quality, cb)` | Canvas compress với aspect ratio |

### Notification
| Function | Mô tả |
|---|---|
| `showToast(msg)` | Toast notification nhỏ, top-right |
| `playNotificationSound()` | Web Audio API dual-tone (D5 + A5) |
| `showReminderBanner(...)` | Banner overlay với progress bar |

---

## 6. Anti-Patterns & Guards

### Prevent Injection Loop
```js
// PHẢI mark element trước khi mutate DOM
post.setAttribute('data-chatops-injected', 'true');
runWithObserverDisabled(() => {
  actionGroup.appendChild(button);
  post.querySelector('.post-menu').prepend(actionGroup);
});
```

### Prevent Button Busy State
```js
// Tránh double-click trigger
if (replyBtn.dataset.busy) return;
replyBtn.dataset.busy = 'true';
// ... async operation ...
delete replyBtn.dataset.busy;
```

### Extension Context Guard
```js
// Khi extension reload, chrome.runtime.id bị undefined
if (!chrome.runtime?.id) {
  observer.disconnect();
  return;
}
```

### isLocalTaskUpdate Flag
```js
// Trong tasks.tab.js
// Tránh storage.onChanged trigger re-render khi chính mình update
isLocalTaskUpdate = true;
await chrome.storage.local.set({ chatops_memos: updated });
isLocalTaskUpdate = false;
```
