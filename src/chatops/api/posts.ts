import { httpClient, ensureAuthenticated } from '../client.js';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import type {
  ChatOpsPost,
  ChatOpsReaction,
  PostList,
  SearchPostsParams,
  GetChannelPostsParams,
  UploadFileResponse,
  PostMessageParams,
} from '../types.js';

/**
 * Lấy danh sách post trong channel theo trang.
 * Dùng `since` (Unix ms) để lọc theo thời gian.
 */
export async function getChannelPosts(
  channelId: string,
  params: GetChannelPostsParams = {}
): Promise<PostList> {
  await ensureAuthenticated();
  const { page = 0, per_page = 60, since, before, after } = params;

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('per_page', String(Math.min(per_page, 200)));
  if (since !== undefined) queryParams.set('since', String(since));
  if (before) queryParams.set('before', before);
  if (after) queryParams.set('after', after);

  const res = await httpClient.get<PostList>(
    `/channels/${channelId}/posts?${queryParams.toString()}`
  );
  return res.data;
}

/**
 * Tìm kiếm post trong team với cú pháp ChatOps search.
 */
export async function searchPosts(
  teamId: string,
  params: SearchPostsParams
): Promise<PostList> {
  await ensureAuthenticated();
  const res = await httpClient.post<PostList>(`/teams/${teamId}/posts/search`, params);
  return res.data;
}

/**
 * Lấy một post theo ID.
 */
export async function getPost(postId: string): Promise<ChatOpsPost> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsPost>(`/posts/${postId}`);
  return res.data;
}

/**
 * Lấy toàn bộ thread (bài gốc + replies) theo post ID.
 */
export async function getPostThread(postId: string): Promise<PostList> {
  await ensureAuthenticated();
  const res = await httpClient.get<PostList>(`/posts/${postId}/thread`);
  return res.data;
}

/**
 * Lấy danh sách reaction của một post.
 * Trả về mảng rỗng nếu không có reaction hoặc gặp lỗi.
 */
export async function getPostReactions(postId: string): Promise<ChatOpsReaction[]> {
  await ensureAuthenticated();
  try {
    const res = await httpClient.get<ChatOpsReaction[]>(`/posts/${postId}/reactions`);
    return res.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Lấy toàn bộ post trong channel theo khoảng thời gian — tự động phân trang.
 *
 * ⚠️ Chú ý hiệu năng: Mỗi vòng lặp tốn 1 API call.
 * Với channel bận rộn và khoảng thời gian dài, có thể tốn nhiều request.
 */
export async function getAllChannelPostsInRange(
  channelId: string,
  sinceMs: number,
  untilMs?: number
): Promise<ChatOpsPost[]> {
  await ensureAuthenticated();

  const allPosts: ChatOpsPost[] = [];
  let beforeId: string | undefined = undefined;
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

    // Lấy batch tiếp theo (cũ hơn) bằng cách dùng ID của post cũ nhất
    beforeId = posts[posts.length - 1].id;
  }

  return allPosts;
}

/**
 * Gửi một tin nhắn vào channel (hoặc reply vào thread nếu có parentId).
 */
export async function postMessage(params: PostMessageParams): Promise<void> {
  await ensureAuthenticated();

  const { message, channelId, parentId, fileIds } = params;

  const payload: Record<string, unknown> = {
    message,
    channel_id: channelId,
  };
  if (parentId) payload['parent_id'] = parentId;
  if (fileIds && fileIds.length > 0) payload['file_ids'] = fileIds;

  console.error(`[ChatOps] postMessage → channel=${channelId} files=${fileIds?.length ?? 0}`);

  await httpClient.post('/posts', payload, {
    headers: { 'content-type': 'application/json' },
    transformRequest: [(data) => JSON.stringify(data)],
  });
}

/**
 * Upload file lên ChatOps và trả về file_id.
 * @param channelId - ID của channel nhận file (bắt buộc theo API Mattermost)
 * @param filePath  - Đường dẫn tuyệt đối đến file trên ổ cứng
 */
export async function uploadFile(channelId: string, filePath: string): Promise<string> {
  await ensureAuthenticated();

  // Kiểm tra file tồn tại trước khi upload
  await access(filePath);

  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('channel_id', channelId);
  form.append('files', createReadStream(filePath));

  console.error(`[ChatOps] uploadFile → ${filePath} → channel=${channelId}`);

  const res = await httpClient.post<UploadFileResponse>('/files', form, {
    headers: form.getHeaders(),
  });

  const fileInfo = res.data.file_infos?.[0];
  if (!fileInfo?.id) {
    throw new Error('Upload thành công nhưng không nhận được file_id từ server.');
  }

  return fileInfo.id;
}
