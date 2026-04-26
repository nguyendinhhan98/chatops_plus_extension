---
name: pagination-pattern
description: Pattern phân trang để lấy toàn bộ posts trong khoảng thời gian dài. Dùng khi cần quét nhiều tin nhắn từ một channel bận rộn (hàng chục ngàn posts).
---

# Pagination Pattern — Lấy Posts theo Khoảng Thời Gian

## Vấn đề
ChatOps trả về tối đa **200 posts/request**. Channel bận rộn (35k+ posts) cần nhiều lần gọi.

## Hàm đã có sẵn — Dùng ngay!

```typescript
import { getAllChannelPostsInRange } from '../chatops/api/posts.js';
import { toUnixMs, getLastWeekRange } from '../utils/date.js';

const { from, to } = getLastWeekRange();
const posts = await getAllChannelPostsInRange(
  channelId,
  toUnixMs(from),   // Unix milliseconds
  toUnixMs(to)
);
```

## Cơ chế hoạt động (dùng `before` ID, không dùng `page`)

```
Lần 1: posts mới nhất → posts[N-1].id = "abc"
Lần 2: before="abc"  → posts cũ hơn → posts[N-1].id = "xyz"  
Lần 3: before="xyz"  → ... cho đến khi create_at < sinceMs
```

**Không dùng `page` number** khi kết hợp với `since` — đây là giới hạn của ChatOps API.
