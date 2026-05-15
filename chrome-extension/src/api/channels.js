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
