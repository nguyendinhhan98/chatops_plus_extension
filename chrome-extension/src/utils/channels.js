/**
 * Shared Channel Utilities — ChatOps Chrome Extension
 * Centralized logic for filtering and enriching channel data (e.g., handling DMs).
 */

import { getUsersByIds } from '../api/users.js';

/**
 * Enriches a list of channels with human-readable display names for DMs
 * @param {Array} channels - List of channel objects
 * @param {Object} currentUser - The current logged-in user object
 * @returns {Promise<Array>} Enriched list of channels
 */
export async function enrichChannels(channels, currentUser) {
  if (!currentUser || !channels?.length) return channels;

  const dmChannels = channels.filter(c => c.type === 'D' || (c.name && c.name.includes('__')));
  if (!dmChannels.length) return channels;

  const otherUserIds = new Set();
  dmChannels.forEach(c => {
    const parts = c.name.split('__');
    const otherId = parts.find(id => id !== currentUser.id);
    if (otherId) otherUserIds.add(otherId);
  });

  if (otherUserIds.size > 0) {
    try {
      const users = await getUsersByIds([...otherUserIds]);
      const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
      dmChannels.forEach(c => {
        const parts = c.name.split('__');
        const otherId = parts.find(id => id !== currentUser.id);
        const user = usersMap[otherId];
        if (user) {
          c.display_name = (user.first_name || user.last_name) 
            ? `${user.first_name} ${user.last_name}`.trim() 
            : user.username;
        }
      });
    } catch (err) {
      console.warn('Failed to fetch DM usernames:', err);
    }
  }
  return channels;
}

/**
 * Checks if a channel is a Direct Message
 * @param {Object} channel 
 * @returns {Boolean}
 */
export function isDM(channel) {
  return channel.type === 'D' || (channel.name && channel.name.includes('__')) || channel.display_name === 'Tin nhắn trực tiếp';
}

/**
 * Filters channels based on type and DM inclusion
 * @param {Array} channels 
 * @param {Boolean} includeDM 
 * @returns {Array}
 */
export function filterChannels(channels, includeDM) {
  if (includeDM) return channels;
  return channels.filter(c => !isDM(c));
}
