/**
 * UI Formatting and Template Rendering Utilities
 */

import { formatUnixMsToVN, formatRelativeTime } from './date.js';
import { language } from '../lang.js';

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates a ChatOps permalink URL
 */
export function makePermalinkSync(postId, baseUrl, teamName) {
  return `${baseUrl}/${teamName}/pl/${postId}`;
}

/**
 * Formats user display name (First Last or Username)
 */
export function formatUserDisplayName(user) {
  if (!user) return language.unknown;
  if (user.first_name || user.last_name) {
    return `${user.first_name} ${user.last_name}`.trim();
  }
  return user.username || user.email;
}

/**
 * Renders a list of search result posts
 */
export function renderPostList(posts, usersMap, baseUrl, teamName, channelsMap) {
  if (!posts || posts.length === 0) return '';

  return posts.map((post) => {
    const user = usersMap[post.user_id];
    const channel = channelsMap[post.channel_id];
    const author = user ? formatUserDisplayName(user) : language.unknown;
    const channelName = channel ? (channel.display_name || channel.name) : language.unknown;
    const permalink = makePermalinkSync(post.id, baseUrl, teamName);

    return `
      <div class="post-item">
        <div class="post-header">
          <span class="post-author">${escapeHtml(author)}</span>
          <span class="post-channel">${language.in} ${escapeHtml(channelName)}</span>
          <span class="post-time">${formatUnixMsToVN(post.create_at)}</span>
        </div>
        <div class="post-body">${escapeHtml(post.message).replace(/\n/g, '<br>')}</div>
        <div class="post-actions">
           <a href="${permalink}" class="post-link">🔗 ${language.viewMessage}</a>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renders a user card for autocomplete
 */
export function renderUserCard(user) {
  const name = formatUserDisplayName(user);
  return `
    <div class="ac-user-card">
      <div class="ac-user-info">
        <div class="ac-user-name">${escapeHtml(name)}</div>
        <div class="ac-user-sub">@${escapeHtml(user.username)}</div>
      </div>
    </div>
  `;
}

/**
 * Gets a human-readable label for a channel
 */
export function getChannelLabel(channel) {
  if (!channel) return language.unknown;
  
  // If we have a display name that isn't just a raw hash, use it.
  // Note: DMs enriched with usernames will have a proper display_name.
  if (channel.display_name && !channel.display_name.includes('__')) {
    return channel.display_name;
  }
  
  // Fallback for DMs without enriched names
  if (channel.type === 'D' || (channel.name && channel.name.includes('__'))) {
    return language.directMessage;
  }
  
  return channel.display_name || channel.name || channel.id;
}

/**
 * Renders a channel card for multi-select
 */
export function renderChannelCard(channel) {
  const typeIcon = channel.type === 'P' ? '🔒' : (channel.type === 'D' ? '👤' : '#️⃣');
  const displayName = getChannelLabel(channel);
  
  // Only show internal name for non-DM channels if it's different from the display name
  const internalName = (channel.name && channel.name !== displayName && !channel.name.includes('__')) ? channel.name : '';
  
  return `
    <div class="ms-channel-card">
      <span class="ms-channel-icon">${typeIcon}</span>
      <div class="ms-channel-info">
        <div class="ms-channel-name">${escapeHtml(displayName)}</div>
        ${internalName ? `<div class="ms-channel-sub">${escapeHtml(internalName)}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Renders a leave request post item
 */
export function renderLeaveItem(post, user, permalink) {
  const author = user ? escapeHtml(user.username) : 'Unknown';
  return `
    <div class="leave-item">
      <div class="post-header">
        <span class="post-author">@${author}</span>
        <span class="post-channel">${language.in} ${escapeHtml(post._channelName)}</span>
        <span class="post-time">${formatUnixMsToVN(post.create_at)}</span>
      </div>
      <div class="leave-message">${escapeHtml(post.message).replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
         <a href="${permalink}" class="post-link">🔗 ${language.viewMessage}</a>
      </div>
    </div>
  `;
}

/**
 * Renders a missed mention post item
 */
export function renderMentionItem(post, author, permalink) {
  const authorName = author ? formatUserDisplayName(author) : '(Unknown)';
  return `
    <div class="post-item">
      <div class="post-header">
        <span class="post-author">${escapeHtml(authorName)}</span>
        <span class="post-time" title="${formatUnixMsToVN(post.create_at)}">${formatRelativeTime(post.create_at)}</span>
      </div>
      <div class="post-body">${escapeHtml(post.message).replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
        <a href="${permalink}" target="_blank" class="post-link">🔗 ${language.openInChatOps}</a>
      </div>
    </div>
  `;
}
