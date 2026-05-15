/**
 * Posts API Module
 */

import { request } from './client.js';

/**
 * Search posts across the team
 */
export async function searchPosts(teamId, params) {
  return request(`/teams/${teamId}/posts/search`, {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

/**
 * Get posts from a specific channel
 */
export async function getChannelPosts(channelId, params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/channels/${channelId}/posts?${query}`);
}

/**
 * Get full thread for a post
 */
export async function getPostThread(postId) {
  return request(`/posts/${postId}/thread`);
}

/**
 * Get reactions for a specific post
 */
export async function getPostReactions(postId) {
  return request(`/posts/${postId}/reactions`);
}
