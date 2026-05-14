/**
 * ChatOps Users API — Chrome Extension
 * Port 1:1 từ src/chatops/api/users.ts
 */

import { apiGet, apiPost } from './client.js';

/**
 * Lấy thông tin user theo ID.
 */
export function getUserById(userId) {
  return apiGet(`/users/${userId}`);
}

/**
 * Lấy thông tin user theo email.
 */
export function getUserByEmail(email) {
  return apiGet(`/users/email/${email}`);
}

/**
 * Lấy thông tin user theo username.
 */
export function getUserByUsername(username) {
  return apiGet(`/users/username/${username}`);
}

/**
 * Tìm kiếm user theo từ khóa (khớp với username, email, họ tên).
 * Có thể lọc theo teamId.
 */
export function searchUsers(term, teamId, limit = 20) {
  const payload = {
    term,
    limit,
    allow_inactive: false,
  };
  if (teamId) {
    payload.in_team_id = teamId;
    payload.team_id = teamId;
  }
  
  return apiPost('/users/search', payload);
}

/**
 * Lấy nhiều user cùng lúc theo danh sách ID — dùng 1 API call duy nhất.
 */
export function getUsersByIds(userIds) {
  if (userIds.length === 0) return Promise.resolve([]);
  return apiPost('/users/ids', userIds);
}

/**
 * Lấy profile của user đang xác thực.
 */
export function getMyProfile() {
  return apiGet('/users/me');
}

/**
 * Lấy danh sách users (có phân trang).
 * Có thể lọc theo teamId.
 */
export function getUsers(page = 0, perPage = 10, teamId = null) {
  const queryParams = {
    page: String(page),
    per_page: String(perPage)
  };
  if (teamId) queryParams.in_team = teamId;

  return apiGet('/users', queryParams);
}
