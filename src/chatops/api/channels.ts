import { httpClient, ensureAuthenticated } from '../client.js';
import type { ChatOpsChannel, ChannelMember } from '../types.js';

/**
 * Lấy thông tin channel theo ID.
 */
export async function getChannelById(channelId: string): Promise<ChatOpsChannel> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsChannel>(`/channels/${channelId}`);
  return res.data;
}

/**
 * Lấy thông tin channel theo team ID và tên (slug).
 */
export async function getChannelByName(
  teamId: string,
  channelName: string
): Promise<ChatOpsChannel> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsChannel>(
    `/teams/${teamId}/channels/name/${channelName}`
  );
  return res.data;
}

/**
 * Tìm kiếm channel trong team theo display name hoặc slug.
 */
export async function searchChannels(
  teamId: string,
  term: string
): Promise<ChatOpsChannel[]> {
  await ensureAuthenticated();
  const res = await httpClient.post<ChatOpsChannel[]>(
    `/teams/${teamId}/channels/search`,
    { term }
  );
  return res.data;
}

/**
 * Lấy tất cả public channel mà user hiện tại có thể thấy trong team.
 */
export async function getPublicChannels(
  teamId: string,
  page = 0,
  perPage = 200
): Promise<ChatOpsChannel[]> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsChannel[]>(
    `/teams/${teamId}/channels?page=${page}&per_page=${perPage}`
  );
  return res.data;
}

/**
 * Lấy hoặc tạo kênh DM giữa hai user.
 */
export async function getOrCreateDMChannel(
  userId1: string,
  userId2: string
): Promise<ChatOpsChannel> {
  await ensureAuthenticated();
  const res = await httpClient.post<ChatOpsChannel>('/channels/direct', [userId1, userId2]);
  return res.data;
}

/**
 * Lấy danh sách tất cả ChannelMember của user hiện tại trong một team.
 * Mỗi object chứa mention_count và last_viewed_at.
 * Chỉ tốn 1 API call cho toàn bộ team.
 */
export async function getMyChannelMembers(teamId: string): Promise<ChannelMember[]> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChannelMember[]>(
    `/users/me/teams/${teamId}/channels/members`
  );
  return res.data;
}
