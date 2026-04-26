import { formatUnixMsToVN } from './date.js';
import type {
  ChatOpsUser,
  ChatOpsChannel,
  ChatOpsPost,
} from '../chatops/types.js';

/**
 * Format user information into a readable text block.
 */
export function formatUserInfo(user: ChatOpsUser): string {
  return [
    `👤 User: ${user.username}`,
    `📛 Name: ${user.last_name} ${user.first_name}`,
    `📧 Email: ${user.email}`,
    `🏷️  Nickname: ${user.nickname || '(not set)'}`,
    `💼 Position: ${user.position || '(not set)'}`,
    `🔑 Roles: ${user.roles}`,
    `🆔 ID: ${user.id}`,
  ].join('\n');
}

/**
 * Format channel information into a readable text block.
 */
export function formatChannelInfo(channel: ChatOpsChannel): string {
  return [
    `📢 Channel: ${channel.display_name}`,
    `🔗 Name: ${channel.name}`,
    `📋 Type: ${{ O: 'Public', P: 'Private', D: 'Direct Message', G: 'Group' }[channel.type] ?? channel.type}`,
    `💬 Header: ${channel.header || '(not set)'}`,
    `📝 Purpose: ${channel.purpose || '(not set)'}`,
    `💌 Total messages: ${channel.total_msg_count}`,
    `🆔 ID: ${channel.id}`,
  ].join('\n');
}

/**
 * Format a list of posts into a readable summary.
 */
export function formatPostList(
  posts: ChatOpsPost[],
  usersMap: Record<string, ChatOpsUser> = {},
  page?: number
): string {
  const header = page !== undefined 
    ? `📋 ${posts.length} tin nhắn từ channel (page ${page}):\n`
    : `📋 ${posts.length} tin nhắn tìm thấy:\n`;

  const body = posts
    .map((post, i) => {
      const user = usersMap[post.user_id];
      const author = user ? `@${user.username} (${user.email})` : `User ${post.user_id}`;
      const time = formatUnixMsToVN(post.create_at);
      return `${i + 1}. [${time}] ${author}:\n  ${post.message.replace(/\n/g, '\n  ')}`;
    })
    .join('\n\n');

  return header + '\n' + body;
}

/**
 * Specifically format leave/late requests for summary.
 */
export function formatLeaveRequests(
  posts: ChatOpsPost[],
  user: ChatOpsUser,
  channelName: string,
  fromDateLabel: string,
  toDateLabel: string
): string {
  const header = [
    `🔍 Kết quả tìm kiếm xin trễ/nghỉ`,
    `👤 User: @${user.username} (${user.email})`,
    `📢 Channel: ${channelName}`,
    `📅 Thời gian: ${fromDateLabel} → ${toDateLabel}`,
    `📊 Tổng: ${posts.length} tin nhắn`,
    `────────────────────────────────────────────────────────────`,
  ].join('\n');

  const body = posts
    .map((post) => {
      const time = formatUnixMsToVN(post.create_at);
      return `• ${time} - ${post.message}`;
    })
    .join('\n');

  return header + '\n\n' + body;
}
