/**
 * Emojis API Module
 */

import { request } from './client.js';

/**
 * Fetch custom emojis from the ChatOps server
 */
export async function getCustomEmojis(page = 0, perPage = 100) {
  return request(`/emoji?page=${page}&per_page=${perPage}&sort=name`);
}
