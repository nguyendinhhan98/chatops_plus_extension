/**
 * ChatOps Channels API — Chrome Extension
 * Port 1:1 từ src/chatops/api/channels.ts
 */

import { apiGet, apiPost } from './client.js';

/**
 * Lấy thông tin channel theo ID.
 */
export function getChannelById(channelId) {
  return apiGet(`/channels/${channelId}`);
}

/**
 * Lấy thông tin channel theo team ID và tên (slug).
 */
export function getChannelByName(teamId, channelName) {
  return apiGet(`/teams/${teamId}/channels/name/${channelName}`);
}

/**
 * Tìm kiếm channel trong team theo display name hoặc slug.
 */
export function searchChannels(teamId, term) {
  return apiPost(`/teams/${teamId}/channels/search`, { term });
}

/**
 * Lấy tất cả public channel mà user hiện tại có thể thấy trong team.
 */
export function getPublicChannels(teamId, page = 0, perPage = 200) {
  return apiGet(`/teams/${teamId}/channels`, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * Lấy tất cả channels (Public & Private) mà user hiện tại đang tham gia trong team.
 * Đã lọc bỏ các channel Direct Message (D) và Group (G).
 */
export async function getMyChannels(teamId) {
  const channels = await apiGet(`/users/me/teams/${teamId}/channels`);
  return channels.filter(c => c.type === 'O' || c.type === 'P');
}

/**
 * Lấy hoặc tạo kênh DM giữa hai user.
 */
export function getOrCreateDMChannel(userId1, userId2) {
  return apiPost('/channels/direct', [userId1, userId2]);
}

/**
 * Lấy danh sách tất cả ChannelMember của user hiện tại trong một team.
 */
export function getMyChannelMembers(teamId) {
  return apiGet(`/users/me/teams/${teamId}/channels/members`);
}
