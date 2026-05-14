/**
 * ChatOps Teams API — Chrome Extension
 * Port 1:1 từ src/chatops/api/teams.ts
 */

import { apiGet } from './client.js';

/**
 * Get team information by its URL name (slug).
 */
export function getTeamByName(teamName) {
  return apiGet(`/teams/name/${teamName}`);
}

/**
 * Get team information by its unique ID.
 */
export function getTeamById(teamId) {
  return apiGet(`/teams/${teamId}`);
}

/**
 * Get list of teams that the current user is a member of.
 */
export function getMyTeams() {
  return apiGet('/users/me/teams');
}
