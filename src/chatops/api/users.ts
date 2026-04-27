import { httpClient, ensureAuthenticated } from '../client.js';
import type { ChatOpsUser } from '../types.js';

/**
 * Lấy thông tin user theo ID.
 */
export async function getUserById(userId: string): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>(`/users/${userId}`);
  return res.data;
}

/**
 * Lấy thông tin user theo email.
 */
export async function getUserByEmail(email: string): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>(`/users/email/${email}`);
  return res.data;
}

/**
 * Lấy thông tin user theo username.
 */
export async function getUserByUsername(username: string): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>(`/users/username/${username}`);
  return res.data;
}

/**
 * Tìm kiếm user theo từ khóa (khớp với username, email, họ tên).
 */
export async function searchUsers(term: string, limit = 20): Promise<ChatOpsUser[]> {
  await ensureAuthenticated();
  const res = await httpClient.post<ChatOpsUser[]>('/users/search', {
    term,
    limit,
    allow_inactive: false,
  });
  return res.data;
}

/**
 * Lấy nhiều user cùng lúc theo danh sách ID — dùng 1 API call duy nhất.
 */
export async function getUsersByIds(userIds: string[]): Promise<ChatOpsUser[]> {
  if (userIds.length === 0) return [];
  await ensureAuthenticated();
  const res = await httpClient.post<ChatOpsUser[]>('/users/ids', userIds);
  return res.data;
}

/**
 * Lấy profile của user đang xác thực.
 */
export async function getMyProfile(): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>('/users/me');
  return res.data;
}
