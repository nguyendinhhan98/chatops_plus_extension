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
 * Parses simple Markdown and converts text to rich HTML (links, bold, italic, code, newlines) safely
 */
export function formatRichText(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  let html = escapeHtml(unsafe);
  
  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>');
  
  // Parse inline code `code` (monospace, styled nicely)
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg-2, #f5f5f7); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #d1325d;">$1</code>');
  
  // Parse bold **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Parse italic *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Parse Markdown images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" class="meme-img" style="max-width: 50%; height: auto; display: block; border-radius: 4px; margin-top: 6px; cursor: zoom-in;" />');

  // Parse Markdown links [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" class="post-link" style="color:var(--accent);text-decoration:underline;word-break:break-all;">$1</a>');
  
  // Parse raw URLs (excluding links already processed or quotes)
  html = html.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" class="post-link" style="color:var(--accent);text-decoration:underline;word-break:break-all;">$2</a>');
  
  return html;
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
export function renderPostList(posts, usersMap, baseUrl, teamName, channelsMap, keyword = '') {
  if (!posts || posts.length === 0) return '';

  return posts.map((post) => {
    const user = usersMap[post.user_id];
    const channel = channelsMap[post.channel_id];
    const author = user ? formatUserDisplayName(user) : language.unknown;
    const channelName = channel ? getChannelLabel(channel) : language.unknown;
    const permalink = makePermalinkSync(post.id, baseUrl, teamName);

    let contentHtml = formatRichText(post.message);

    if (keyword && keyword.length >= 2) {
      const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      contentHtml = contentHtml.replace(regex, '<mark class="highlight">$1</mark>');
    }

    return `
      <div class="post-item" id="item_${post.id}">
        <div class="post-header" style="display:flex; align-items:center;">
          <button class="collapse-btn" data-id="${post.id}" style="margin-right: 4px;" title="Expand/Collapse">▶</button>
          <div class="post-header-left" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; gap:8px; align-items:center;">
            <span class="post-author" style="font-weight:600;">${escapeHtml(author)}</span>
            <span class="post-channel" style="color:var(--text-3); font-size:11px;">${language.in} ${escapeHtml(channelName)}</span>
          </div>
          <span class="post-time" style="font-size:11px; color:var(--text-3); flex-shrink:0; margin-left:8px;">${formatUnixMsToVN(post.create_at)}</span>
        </div>
        <div class="post-body collapsible-body collapsed" style="margin-top:4px;">${contentHtml}</div>
        <div class="post-actions">
           <a href="${permalink}" class="post-jump-link" data-post-id="${post.id}" data-root-id="${post.root_id || ''}" title="${language.viewMessage}">↗</a>
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
 * Renders a missed mention post item
 */
export function renderMentionItem(post, author, permalink) {
  const authorName = author ? formatUserDisplayName(author) : '(Unknown)';
  const escapedText = formatRichText(post.message);
  
  return `
    <div class="post-item missed-mention-item" id="item_${post.id}">
      <div class="post-header" style="display:flex; align-items:center;">
        <button class="collapse-btn" data-id="${post.id}" style="margin-right: 4px;" title="Expand/Collapse">▶</button>
        <span class="post-author" style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight:600;">${escapeHtml(authorName)}</span>
        <span class="post-time" title="${formatUnixMsToVN(post.create_at)}" style="flex-shrink: 0; margin-left: 8px; font-size:11px; color:var(--text-3);">${formatRelativeTime(post.create_at)}</span>
      </div>
      <div class="post-body collapsible-body collapsed" style="margin-top:4px;">${escapedText}</div>
      <div class="post-actions">
        <a href="${permalink}" target="_blank" class="post-jump-link" data-post-id="${post.id}" data-root-id="${post.root_id || ''}" title="${language.openInChatOps || 'Open in ChatOps'}">↗</a>
      </div>
      <div class="mention-reactions-row" style="display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-top: 8px;">
        <button class="mention-react-btn" data-post-id="${post.id}" data-emoji="white_check_mark" title="React with :white_check_mark:">✅</button>
        <button class="mention-react-btn" data-post-id="${post.id}" data-emoji="eyes" title="React with :eyes:">👀</button>
        <button class="mention-react-btn" data-post-id="${post.id}" data-emoji="thumbsup" title="React with :+1:">👍</button>
      </div>
    </div>
  `;
}
