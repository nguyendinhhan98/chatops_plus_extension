/**
 * Users API Module
 */

import { request } from './client.js';

/**
 * Get current user profile
 */
export async function getMyProfile() {
  return request('/users/me');
}

/**
 * Find user by email
 */
export async function getUserByEmail(email) {
  return request(`/users/email/${email}`);
}

/**
 * Get users list by team
 */
export async function getUsers(page = 0, perPage = 60, teamId = '') {
  const query = teamId ? `?in_team=${teamId}&page=${page}&per_page=${perPage}` : `?page=${page}&per_page=${perPage}`;
  return request(`/users${query}`);
}

/**
 * Search users by keyword
 */
export async function searchUsers(term, teamId = '') {
  const body = { term, allow_inactive: false };
  if (teamId) body.team_id = teamId;
  return request('/users/search', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Get multiple users by their IDs
 */
export async function getUsersByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return request('/users/ids', {
    method: 'POST',
    body: JSON.stringify(ids)
  });
}
