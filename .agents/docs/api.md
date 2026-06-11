# API Layer — ChatOps++

> Files: `src/api/`

---

## 1. Tổng Quan

API layer cung cấp interface để gọi các external APIs:
- **Mattermost REST API v4** — Backend chính
- **AI APIs** — Gemini, Groq, OpenRouter

Tất cả API calls **phải chạy trong background script** (Service Worker). Content scripts và sidepanel không được phép gọi Mattermost API trực tiếp — phải gửi message tới background.

```
src/api/
├── index.js      ← Barrel export (import từ đây)
├── client.js     ← HTTP client (auth + fetch wrapper)
├── users.js      ← /users endpoints
├── posts.js      ← /posts endpoints
├── channels.js   ← /channels endpoints
├── teams.js      ← /teams endpoints
├── emojis.js     ← /emoji endpoints
└── ai.js         ← Gemini / Groq / OpenRouter
```

---

## 2. HTTP Client (`src/api/client.js`)

### `getConfig()`

Đọc credentials từ `chrome.storage.local`:

```js
const config = await getConfig();
// config = {
//   chatopsUrl: 'https://chat.runsystem.vn',
//   cookie:     'MMAUTHTOKEN=xxx',
//   csrf:       'MMCSRF=xxx',
//   teamName:   'dn'
// }
```

Defaults: `chatopsUrl = CHATOPS_CONFIG.DEFAULT_URL`, `teamName = 'dn'`.

### `request(path, options)`

Wrapper tự động xử lý authentication:

```js
// Sử dụng
const users = await request('/users/me');
const result = await request('/posts', {
  method: 'POST',
  body: JSON.stringify({ channel_id: 'xxx', message: 'Hello' })
});
```

**Headers được inject tự động:**
```
Content-Type: application/json
X-Requested-With: XMLHttpRequest
Authorization: Bearer {MMAUTHTOKEN value}
X-CSRF-Token: {MMCSRF value}
```

**Error handling:**
- `401` → throw Error("Unauthorized - Please check your login status")
- Khác → parse JSON error message từ Mattermost response
- Network error → throw native error

**URL building:**
```
{chatopsUrl}/api/v4{path}
// → https://chat.runsystem.vn/api/v4/users/me
```

---

## 3. Users API (`src/api/users.js`)

| Function | Method | Endpoint | Mô tả |
|---|---|---|---|
| `getMyProfile()` | GET | `/users/me` | Profile của user đang đăng nhập |
| `getUserByEmail(email)` | GET | `/users/email/{email}` | Tìm user theo email |
| `getUsers(page, perPage, teamId)` | GET | `/users?in_team={teamId}&page={page}&per_page={perPage}` | Danh sách users có phân trang |
| `searchUsers(term, teamId='')` | POST | `/users/search` | Tìm kiếm users, chỉ active |
| `getUsersByIds(ids)` | POST | `/users/ids` | Batch lookup theo mảng IDs |

### Chi tiết `searchUsers`
```js
// Body gửi đi:
{
  term: 'searchTerm',
  team_id: teamId,      // optional
  allow_inactive: false  // chỉ active users
}
// Trả về: User[]
```

### Chi tiết `getUsersByIds`
```js
// Body: ['userId1', 'userId2', ...]
// Trả về: User[]
// Dùng khi cần resolve nhiều IDs cùng lúc (efficient)
```

---

## 4. Posts API (`src/api/posts.js`)

| Function | Method | Endpoint | Mô tả |
|---|---|---|---|
| `searchPosts(teamId, params)` | POST | `/teams/{teamId}/posts/search` | Tìm kiếm posts |
| `getChannelPosts(channelId, params)` | GET | `/channels/{channelId}/posts` | Posts trong channel |
| `getPostThread(postId)` | GET | `/posts/{postId}/thread` | Toàn bộ thread của một post |
| `getPostReactions(postId)` | GET | `/posts/{postId}/reactions` | Tất cả reactions |
| `addPostReaction(userId, postId, emojiName)` | POST | `/reactions` | Thêm reaction |
| `deletePostReaction(userId, postId, emojiName)` | DELETE | `/users/{userId}/posts/{postId}/reactions/{emojiName}` | Xóa reaction |
| `deletePost(postId)` | DELETE | `/posts/{postId}` | Xóa post |

### Chi tiết `searchPosts`
```js
// params object:
{
  terms: 'keyword from:username in:channel-name after:2024-01-01 before:2024-12-31',
  is_or_search: false,   // OR mode
  time_zone_offset: 0,
  page: 0,
  per_page: 20
}
// Trả về: { posts: {id: Post}, order: [id, ...] }
```

**Mattermost search operators trong `terms`:**
- `from:username` — Lọc theo người gửi
- `in:channel-name` — Lọc theo channel
- `after:YYYY-MM-DD` / `before:YYYY-MM-DD` — Lọc theo thời gian
- Default: AND search. Nhiều terms → tất cả phải match.

### Chi tiết `getPostThread`
```js
// Trả về: {
//   order: [postId1, postId2, ...],   // sorted by create_at
//   posts: { postId: Post },
//   has_next: bool
// }
```

### Chi tiết `addPostReaction`
```js
// Body:
{ user_id: userId, post_id: postId, emoji_name: 'thumbsup' }
// emoji_name: không có dấu ':' (vd: 'thumbsup', không phải ':thumbsup:')
```

---

## 5. Channels API (`src/api/channels.js`)

| Function | Method | Endpoint | Mô tả |
|---|---|---|---|
| `getMyChannels(teamId)` | GET | `/users/me/teams/{teamId}/channels` | Tất cả channels của user trong team |
| `getChannelById(channelId)` | GET | `/channels/{channelId}` | Channel theo ID |
| `getChannelByName(teamId, name)` | GET | `/teams/{teamId}/channels/name/{name}` | Channel theo slug |
| `searchChannels(teamId, term)` | POST | `/teams/{teamId}/channels/search` | Tìm kiếm channels |
| `getMyChannelMembers(teamId)` | GET | `/users/me/teams/{teamId}/channels/members` | Member info trong channels |

### `getMyChannelMembers` — Dùng cho Mention Scan

Trả về array `ChannelMember` objects với `last_viewed_at`, `msg_count`, `mention_count`, etc. Dùng để biết user đã đọc channel đến đâu.

---

## 6. Teams API (`src/api/teams.js`)

| Function | Method | Endpoint | Mô tả |
|---|---|---|---|
| `getMyTeams()` | GET | `/users/me/teams` | Tất cả teams của user |
| `getTeamByName(name)` | GET | `/teams/name/{name}` | Team theo slug name |

---

## 7. Emojis API (`src/api/emojis.js`)

| Function | Method | Endpoint | Mô tả |
|---|---|---|---|
| `getCustomEmojis(page=0, perPage=100)` | GET | `/emoji?page={}&per_page={}&sort=name` | Danh sách custom emojis, sorted by name |
| `searchCustomEmojis(term)` | POST | `/emoji/search` | Tìm kiếm custom emoji theo tên |

---

## 8. AI Integration (`src/api/ai.js`)

### Providers Được Hỗ Trợ

| Provider | Default Model | Base URL | Format |
|---|---|---|---|
| `gemini` | `gemini-2.0-flash` | `generativelanguage.googleapis.com` | Gemini-specific |
| `groq` | `llama-3.3-70b-versatile` | `api.groq.com` | OpenAI-compatible |
| `openrouter` | `openrouter/free` | `openrouter.ai` | OpenAI-compatible |

### `callAiProvider(prompt, apiKey, provider='gemini', options)`

**Gemini request format:**
```json
{
  "contents": [{ "parts": [{ "text": "prompt" }] }],
  "generationConfig": {
    "temperature": 0.4,
    "maxOutputTokens": 1024
  }
}
```

**Groq/OpenRouter request format (OpenAI-compatible):**
```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [{ "role": "user", "content": "prompt" }],
  "temperature": 0.4,
  "max_tokens": 1024
}
```

**Error codes chuẩn hóa:**
| Code | Ý nghĩa |
|---|---|
| `AI_INVALID_KEY` | API key sai hoặc không tồn tại |
| `AI_RATE_LIMIT` | Vượt rate limit (HTTP 429) |
| `AI_FORBIDDEN` | Không có quyền truy cập (HTTP 403) |
| `AI_EMPTY_RESPONSE` | AI trả về response rỗng |
| `AI_INVALID_PROVIDER` | Provider string không hợp lệ |

### `analyzeText(text, apiKey, action, lang, provider)`

**4 action types:**

```js
// action = 'summarize'
// Tóm tắt nội dung dạng bullet points
// → "• Point 1\n• Point 2\n..."

// action = 'actionItems'
// Trích xuất việc cần làm
// → "1. Do X by tomorrow\n2. Follow up with Y\n..."

// action = 'translate'
// lang='vi' → dịch sang Tiếng Việt
// lang='en' → dịch sang English

// action = 'rewrite'
// Viết lại chuyên nghiệp, lịch sự hơn
```

### `validateAiApiKey(apiKey, provider='gemini', modelName=null)`

Test API key với một request thực (prompt "Hi", maxTokens=5):

```js
const result = await validateAiApiKey('your-key', 'gemini');
// result = {
//   isValid: true,
//   errorType: null   // 'key' | 'model' | 'network' | 'unknown'
// }
```

**Error type phân loại:**
- `key` — API key sai → hướng dẫn lấy key mới
- `model` — Model name không tồn tại → hướng dẫn chọn model khác
- `network` — Lỗi mạng → kiểm tra kết nối

---

## 9. Patterns Khi Dùng API

### Pattern 1: Gọi từ Background Handler
```js
// src/background.js
case MESSAGE_TYPES.GET_USERS: {
  const users = await searchUsers(message.term, message.teamId);
  sendResponse({ success: true, data: users });
  break;
}
```

### Pattern 2: Gọi từ Sidepanel (thông qua background)
```js
// sidepanel/tabs/search.tab.js
// KHÔNG gọi API trực tiếp — phải qua background
// Ngoại lệ: search.tab.js có thể gọi trực tiếp nếu import được
// (sidepanel context có access tới src/ modules)
import { searchPosts } from '../../src/api/posts.js';
const results = await searchPosts(teamId, params);
```

### Pattern 3: Gọi từ Content Script (phải qua message)
```js
// content/content.js
// PHẢI gửi message tới background
chrome.runtime.sendMessage({
  type: MESSAGE_TYPES.RESOLVE_DISPLAY_NAME,
  displayName: 'Nguyễn Văn A'
}, (response) => {
  if (response?.username) {
    // use username
  }
});
```

### Pattern 4: Parallel API Calls
```js
// search.tab.js — fetch users và channels song song
const [usersMap, channelsMap] = await Promise.all([
  getUsersByIds(userIds).then(users =>
    Object.fromEntries(users.map(u => [u.id, u]))
  ),
  Promise.all(channelIds.map(id => getChannelById(id))).then(channels =>
    Object.fromEntries(channels.map(c => [c.id, c]))
  )
]);
```

---

## 10. Mattermost API Response Formats

### User Object
```json
{
  "id": "userId",
  "username": "johndoe",
  "email": "john@runsystem.net",
  "first_name": "John",
  "last_name": "Doe",
  "nickname": "JD",
  "position": "Developer"
}
```

### Post Object
```json
{
  "id": "postId",
  "user_id": "userId",
  "channel_id": "channelId",
  "message": "Post content",
  "create_at": 1234567890123,
  "update_at": 1234567890123,
  "root_id": "",
  "file_ids": []
}
```

### Channel Object
```json
{
  "id": "channelId",
  "name": "general",
  "display_name": "General",
  "type": "O",
  "team_id": "teamId",
  "header": "Channel description"
}
```

**Channel types:**
- `O` — Open (public channel)
- `P` — Private
- `D` — Direct Message
- `G` — Group Message

### Reaction Object
```json
{
  "user_id": "userId",
  "post_id": "postId",
  "emoji_name": "thumbsup",
  "create_at": 1234567890123
}
```
