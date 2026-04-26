import { httpClient, ensureAuthenticated } from '../client.js';
import type { ChatOpsUser } from '../types.js';

/**
 * Get user information by their unique ID.
 */
export async function getUserById(userId: string): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>(`/users/${userId}`);
  return res.data;
}

/**
 * Get user information by their email address.
 */
export async function getUserByEmail(email: string): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>(`/users/email/${email}`);
  return res.data;
}

/**
 * Get user information by their username.
 */
export async function getUserByUsername(username: string): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>(`/users/username/${username}`);
  return res.data;
}

/**
 * Search for users based on a term (matches username, email, first/last name).
 */
export async function searchUsers(term: string, limit = 20): Promise<ChatOpsUser[]> {
  await ensureAuthenticated();
  const res = await httpClient.post<ChatOpsUser[]>('/users/search', {
    term,
    limit,
    allow_inactive: false,
  });
  return res.data;
}

/**
 * Get multiple users by their IDs in a single request.
 */
export async function getUsersByIds(userIds: string[]): Promise<ChatOpsUser[]> {
  if (userIds.length === 0) return [];
  await ensureAuthenticated();
  const res = await httpClient.post<ChatOpsUser[]>('/users/ids', userIds);
  return res.data;
}

/**
 * Get profile of the currently authenticated user.
 */
export async function getMyProfile(): Promise<ChatOpsUser> {
  await ensureAuthenticated();
  const res = await httpClient.get<ChatOpsUser>('/users/me');
  return res.data;
}

