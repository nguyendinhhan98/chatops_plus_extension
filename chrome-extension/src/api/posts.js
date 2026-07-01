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

/**
 * Add a reaction to a specific post
 */
export async function addPostReaction(userId, postId, emojiName) {
  return request('/reactions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      post_id: postId,
      emoji_name: emojiName
    })
  });
}

/**
 * Delete a reaction from a specific post
 */
export async function deletePostReaction(userId, postId, emojiName) {
  return request(`/users/${userId}/posts/${postId}/reactions/${emojiName}`, {
    method: 'DELETE'
  });
}

/**
 * Delete a specific post
 */
export async function deletePost(postId) {
  return request(`/posts/${postId}`, {
    method: 'DELETE'
  });
}

/**
 * Create a new post (send a message to a channel)
 */
export async function createPost(channelId, message, rootId = null) {
  const body = {
    channel_id: channelId,
    message: message
  };
  if (rootId) {
    body.root_id = rootId;
  }
  return request('/posts', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}
