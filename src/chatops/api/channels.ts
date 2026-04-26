import { httpClient, ensureAuthenticated } from '../client.js';
import type { ChatOpsChannel } from '../types.js';

/**
 * Get channel information by its unique ID.
 */
export async function getChannelById(channelId: string): Promise<ChatOpsChannel> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsChannel>(`/channels/${channelId}`);
  return res.data;
}

/**
 * Get channel information by team ID and channel name (slug).
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
 * Search for channels in a team by display name or name.
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
 * Get all public channels visible to the current user in a team.
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
 * Get or create a Direct Message channel between two users.
 */
export async function getOrCreateDMChannel(
  userId1: string,
  userId2: string
): Promise<ChatOpsChannel> {
  await ensureAuthenticated();
  const res = await httpClient.post<ChatOpsChannel>('/channels/direct', [userId1, userId2]);
  return res.data;
}

