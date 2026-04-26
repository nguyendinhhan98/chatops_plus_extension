---
name: chatops-api
description: Hướng dẫn gọi ChatOps API v4. Dùng khi cần thêm API call mới, tra cứu endpoint có sẵn, hoặc hiểu cách các module API hoạt động trong project này.
---

# ChatOps API v4 — Reference

Client đã được setup tại `src/chatops/client.ts`. **Không tự tạo axios instance.** Luôn dùng `httpClient`.

## Users (`src/chatops/api/users.ts`)

| Hàm | Endpoint | Dùng khi |
|-----|----------|---------|
| `getUserById(id)` | `GET /users/{id}` | Biết ID |
| `getUserByEmail(email)` | `GET /users/email/{email}` | Biết email (phổ biến nhất) |
| `getUserByUsername(username)` | `GET /users/username/{username}` | Biết username |
| `getUsersByIds(ids[])` | `POST /users/ids` | Batch enrich nhiều posts |
| `searchUsers(term, limit?)` | `POST /users/search` | Tìm kiếm mờ |

## Channels (`src/chatops/api/channels.ts`)

| Hàm | Endpoint |
|-----|---------|
| `getChannelById(id)` | `GET /channels/{id}` |
| `getChannelByName(teamId, name)` | `GET /teams/{teamId}/channels/name/{name}` |
| `searchChannels(teamId, term)` | `POST /teams/{teamId}/channels/search` |

**Pattern tìm channel từ display name:**
1. `getTeamByName(slug)` → `team.id`
2. `searchChannels(team.id, displayName)` → `channel`

## Posts (`src/chatops/api/posts.ts`)

| Hàm | Dùng khi |
|-----|---------|
| `getChannelPosts(channelId, params)` | Lấy posts có phân trang |
| `searchPosts(teamId, params)` | Tìm kiếm với modifiers |
| `getAllChannelPostsInRange(channelId, sinceMs, untilMs?)` | Toàn bộ posts trong khoảng thời gian |

**Search modifiers:** `from:username`, `in:channel-slug`, `on:YYYY-MM-DD`, `before:`, `after:`

## Teams (`src/chatops/api/teams.ts`)

| Hàm | Endpoint |
|-----|---------|
| `getTeamByName(slug)` | `GET /teams/name/{slug}` |
| `getMyTeams()` | `GET /users/me/teams` |

## Types (`src/chatops/types.ts`)

```typescript
ChatOpsUser    → id, username, email, first_name, last_name, nickname, roles
ChatOpsTeam    → id, display_name, name (slug)
ChatOpsChannel → id, display_name, name (slug), type ('O'|'P'), total_msg_count
ChatOpsPost    → id, create_at (Unix ms!), user_id, channel_id, message
PostList       → { order: string[], posts: Record<string, ChatOpsPost> }
```
