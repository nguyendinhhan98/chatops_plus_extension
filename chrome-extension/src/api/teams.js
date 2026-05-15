/**
 * Teams API Module
 */

import { request } from './client.js';

/**
 * Get all teams current user is a member of
 */
export async function getMyTeams() {
  return request('/users/me/teams');
}

/**
 * Get team details by name (slug)
 */
export async function getTeamByName(name) {
  return request(`/teams/name/${name}`);
}
