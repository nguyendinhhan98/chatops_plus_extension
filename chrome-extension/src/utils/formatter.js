/**
 * Formatter Utilities — Chrome Extension
 * Port từ src/utils/formatter.ts + thêm HTML rendering helpers.
 */

import { formatUnixMsToVN, formatRelativeTime } from './date.js';
import { getConfig } from '../api/client.js';

/**
 * Lấy tên hiển thị đẹp của một user.
 * Ưu tiên: Họ Tên đầy đủ > nickname > username.
 */
export function formatUserDisplayName(user) {
  const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim();
  if (fullName) return `${fullName} (@${user.username})`;
  if (user.nickname) return `${user.nickname} (@${user.username})`;
  return `@${user.username}`;
}

/**
 * Lấy label hiển thị đẹp của một channel.
 */
export function formatChannelLabel(channel) {
  const typeIcon =
    channel.type === 'D' ? '💬' :
    channel.type === 'G' ? '👥' :
    channel.type === 'P' ? '🔒' : '📢';
  const name = channel.display_name || channel.name || 'Unknown Channel';
  return `${typeIcon} ${name}`;
}

/**
 * Tạo permalink trực tiếp đến một post trong ChatOps.
 */
export async function makePermalink(postId, teamName) {
  const config = await getConfig();
  const team = teamName || config.teamName || 'dn';
  return `${config.chatopsUrl}/${team}/pl/${postId}`;
}

/**
 * Tạo permalink đồng bộ (dùng cached config).
 */
export function makePermalinkSync(postId, chatopsUrl, teamName) {
  return `${chatopsUrl}/${teamName || 'dn'}/pl/${postId}`;
}

/**
 * Escape HTML để ngăn XSS khi render nội dung tin nhắn.
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render một user info card thành HTML.
 */
export function renderUserCard(user) {
  return `
    <div class="user-card">
      <div class="user-avatar">${(user.first_name || user.username)[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(formatUserDisplayName(user))}</div>
        <div class="user-email">${escapeHtml(user.email || '')}</div>
        <div class="user-position">${escapeHtml(user.position || '')}</div>
      </div>
    </div>
  `;
}

/**
 * Render một channel info card thành HTML.
 */
export function renderChannelCard(channel) {
  const typeLabel = {
    O: 'Public',
    P: 'Private',
    D: 'Direct Message',
    G: 'Group',
  }[channel.type] || channel.type;

  return `
    <div class="channel-card">
      <div class="channel-icon">${formatChannelLabel(channel).split(' ')[0]}</div>
      <div class="channel-info">
        <div class="channel-name">${escapeHtml(channel.display_name || channel.name)}</div>
        <div class="channel-type">${typeLabel}</div>
        <div class="channel-purpose">${escapeHtml(channel.purpose || '')}</div>
      </div>
    </div>
  `;
}

/**
 * Render một post thành HTML theo phong cách ChatOps.
 */
export function renderPost(post, user, chatopsUrl, teamName, isConsecutive = false) {
  const authorName = user ? `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.username : '(Unknown)';
  const avatarUrl = user ? `${chatopsUrl}/api/v4/users/${user.id}/image` : null;
  const time = formatRelativeTime(post.create_at);
  const fullTime = formatUnixMsToVN(post.create_at);
  const permalink = makePermalinkSync(post.id, chatopsUrl, teamName);
  
  // Simple markdown image parsing
  let messageHtml = escapeHtml(post.message).replace(/\n/g, '<br>');
  messageHtml = messageHtml.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1" class="post-image" loading="lazy" />');

  const isPinned = post.is_pinned;
  const replyCount = post.reply_count || 0;

  if (isConsecutive) {
    return `
      <div class="post-item consecutive" data-post-id="${post.id}">
        <div class="post-avatar-spacer"></div>
        <div class="post-content">
          <div class="post-body">${messageHtml}</div>
          <div class="post-actions-hover">
            <button class="btn-post-action btn-reply" data-post-id="${post.id}" data-author="${authorName}" title="Trả lời">💬</button>
            <a href="${permalink}" target="_blank" class="btn-post-action" title="Mở trong ChatOps">🔗</a>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="post-item" data-post-id="${post.id}">
      <div class="post-avatar">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" />` : `<div class="avatar-placeholder">${authorName[0].toUpperCase()}</div>`}
      </div>
      <div class="post-content">
        <div class="post-header">
          <span class="post-author">${escapeHtml(authorName)}</span>
          <span class="post-time" title="${fullTime}">${time}</span>
          ${isPinned ? '<span class="post-badge pinned" title="Đã ghim">📌</span>' : ''}
        </div>
        <div class="post-body">${messageHtml}</div>
        <div class="post-actions">
          ${replyCount > 0 ? `<a href="${permalink}" target="_blank" class="post-thread-link">💬 ${replyCount} phản hồi</a>` : ''}
          <button class="btn-post-action btn-reply" data-post-id="${post.id}" data-author="${authorName}">Phản hồi</button>
          <a href="${permalink}" target="_blank" class="post-link">Mở</a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render danh sách posts thành HTML (Hỗ trợ grouping).
 */
export function renderPostList(posts, usersMap, chatopsUrl, teamName) {
  if (posts.length === 0) {
    return '<div class="empty-state">Không có tin nhắn nào.</div>';
  }

  let html = '';
  let lastPost = null;

  posts.forEach((post) => {
    const user = usersMap[post.user_id];
    // Group nếu cùng user và cách nhau dưới 3 phút
    const isConsecutive = lastPost && 
                         lastPost.user_id === post.user_id && 
                         (post.create_at - lastPost.create_at < 3 * 60 * 1000);
    
    html += renderPost(post, user, chatopsUrl, teamName, isConsecutive);
    lastPost = post;
  });

  return html;
}

/**
 * Render leave request post item
 * @param {Object} post 
 * @param {Object} user 
 * @param {string} permalink 
 */
export function renderLeaveItem(post, user, permalink) {
  const author = user ? escapeHtml(user.username) : 'Unknown';
  return `
    <div class="leave-item">
      <div class="post-header">
        <span class="post-author">@${author}</span>
        <span class="post-channel">in ${escapeHtml(post._channelName)}</span>
        <span class="post-time">${formatUnixMsToVN(post.create_at)}</span>
      </div>
      <div class="leave-message">${escapeHtml(post.message).replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
         <a href="${permalink}" class="post-link">🔗 Xem tin nhắn</a>
      </div>
    </div>
  `;
}

/**
 * Render missed mention post item
 * @param {Object} post 
 * @param {Object} author 
 * @param {string} permalink 
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
        <a href="${permalink}" target="_blank" class="post-link">🔗 Mở trong ChatOps</a>
      </div>
    </div>
  `;
}
