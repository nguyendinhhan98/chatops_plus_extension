/**
 * ChatOps Posts API — Chrome Extension
 * Port 1:1 từ src/chatops/api/posts.ts
 */

import { apiGet, apiPost } from './client.js';

/**
 * Lấy danh sách post trong channel theo trang.
 * Dùng `since` (Unix ms) để lọc theo thời gian.
 */
export function getChannelPosts(channelId, params = {}) {
  const { page = 0, per_page = 60, since, before, after } = params;
  const queryParams = {
    page: String(page),
    per_page: String(Math.min(per_page, 200)),
  };
  if (since !== undefined) queryParams.since = String(since);
  if (before) queryParams.before = before;
  if (after) queryParams.after = after;

  return apiGet(`/channels/${channelId}/posts`, queryParams);
}

/**
 * Tìm kiếm post trong team với cú pháp ChatOps search.
 */
export function searchPosts(teamId, params) {
  return apiPost(`/teams/${teamId}/posts/search`, params);
}

/**
 * Lấy một post theo ID.
 */
export function getPost(postId) {
  return apiGet(`/posts/${postId}`);
}

/**
 * Lấy toàn bộ thread (bài gốc + replies) theo post ID.
 */
export function getPostThread(postId) {
  return apiGet(`/posts/${postId}/thread`);
}

/**
 * Lấy danh sách reaction của một post.
 */
export async function getPostReactions(postId) {
  try {
    return await apiGet(`/posts/${postId}/reactions`);
  } catch {
    return [];
  }
}

/**
 * Lấy toàn bộ post trong channel theo khoảng thời gian — tự động phân trang.
 *
 * ⚠️ Chú ý hiệu năng: Mỗi vòng lặp tốn 1 API call.
 */
export async function getAllChannelPostsInRange(channelId, sinceMs, untilMs) {
  const allPosts = [];
  let beforeId = undefined;
  const perPage = 200;

  while (true) {
    const result = await getChannelPosts(channelId, {
      per_page: perPage,
      before: beforeId,
    });

    const posts = result.order.map((id) => result.posts[id]).filter(Boolean);
    if (posts.length === 0) break;

    let reachedStart = false;
    for (const post of posts) {
      if (post.create_at < sinceMs) {
        reachedStart = true;
        break;
      }
      if (!untilMs || post.create_at <= untilMs) {
        allPosts.push(post);
      }
    }

    if (reachedStart || posts.length < perPage) break;
    beforeId = posts[posts.length - 1].id;
  }

  return allPosts;
}

/**
 * Gửi một tin nhắn vào channel (hoặc reply vào thread nếu có parentId).
 */
export function postMessage({ message, channelId, parentId, fileIds }) {
  const payload = {
    message,
    channel_id: channelId,
  };
  if (parentId) payload.parent_id = parentId;
  if (fileIds && fileIds.length > 0) payload.file_ids = fileIds;

  return apiPost('/posts', payload);
}
