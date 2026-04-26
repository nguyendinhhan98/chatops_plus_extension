import { httpClient, ensureAuthenticated } from '../client.js';
import type { ChatOpsTeam } from '../types.js';

/**
 * Get team information by its URL name (slug).
 */
export async function getTeamByName(teamName: string): Promise<ChatOpsTeam> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsTeam>(`/teams/name/${teamName}`);
  return res.data;
}

/**
 * Get team information by its unique ID.
 */
export async function getTeamById(teamId: string): Promise<ChatOpsTeam> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsTeam>(`/teams/${teamId}`);
  return res.data;
}

/**
 * Get list of teams that the current user is a member of.
 */
export async function getMyTeams(): Promise<ChatOpsTeam[]> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsTeam[]>('/users/me/teams');
  return res.data;
}
