/**
 * Channels API Module
 */

import { request } from './client.js';

/**
 * Get all channels the current user is a member of
 */
export async function getMyChannels(teamId) {
  return request(`/users/me/teams/${teamId}/channels`);
}

/**
 * Get channel details by ID
 */
export async function getChannelById(channelId) {
  return request(`/channels/${channelId}`);
}

/**
 * Get channel details by name (slug)
 */
export async function getChannelByName(teamId, name) {
  return request(`/teams/${teamId}/channels/name/${name}`);
}

/**
 * Search channels by name
 */
export async function searchChannels(teamId, term) {
  return request(`/teams/${teamId}/channels/search`, {
    method: 'POST',
    body: JSON.stringify({ term })
  });
}

/**
 * Get members of all channels the user is in (for mention scanning)
 */
export async function getMyChannelMembers(teamId) {
  return request(`/users/me/teams/${teamId}/channels/members`);
}

export async function getChannelFiles(channelId, page = 0) {
  const res = await request(`/channels/${channelId}/posts?page=${page}&per_page=100`);
  if (!res || !res.order || !res.posts) {
    return { files: [], hasMore: false };
  }
  const fileInfos = [];
  for (const postId of res.order) {
    const post = res.posts[postId];
    if (post && post.metadata && post.metadata.files) {
      fileInfos.push(...post.metadata.files);
    }
  }
  const hasMore = res.order && res.order.length >= 100;
  return { files: fileInfos, hasMore };
}

