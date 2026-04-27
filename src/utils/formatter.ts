import { formatUnixMsToVN } from './date.js';
import { config } from '../config.js';
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
 * Lấy tên hiển thị đẹp của một user.
 * Ưu tiên: Họ Tên đầy đủ > nickname > username. Không bao giờ hiển thị ID.
 */
export function formatUserDisplayName(user: ChatOpsUser): string {
  const fullName = `${user.last_name} ${user.first_name}`.trim();
  if (fullName) return `${fullName} (@${user.username})`;
  if (user.nickname) return `${user.nickname} (@${user.username})`;
  return `@${user.username}`;
}

/**
 * Lấy label hiển thị đẹp của một channel.
 * Ưu tiên: display_name > name. DM channel (display_name rỗng) sẽ dùng name slug.
 * Không bao giờ hiển thị channel_id.
 */
export function formatChannelLabel(channel: ChatOpsChannel): string {
  const typeIcon =
    channel.type === 'D' ? '💬' :
    channel.type === 'G' ? '👥' :
    channel.type === 'P' ? '🔒' : '📢';
  const name = channel.display_name || channel.name || 'Unknown Channel';
  return `${typeIcon} ${name}`;
}

/**
 * Tạo permalink trực tiếp đến một post trong ChatOps.
 * Format: {CHATOPS_URL}/{team_name}/pl/{post_id}
 */
export function makePermalink(postId: string, teamName?: string): string {
  const base = config.chatopsUrl;
  const team = teamName ?? config.teamName ?? 'dn';
  return `${base}/${team}/pl/${postId}`;
}

/**
 * Format a list of posts into a readable summary.
 * Luôn hiển thị tên Channel, tên tác giả và link trực tiếp đến ChatOps.
 */
export function formatPostList(
  posts: ChatOpsPost[],
  usersMap: Record<string, ChatOpsUser> = {},
  page?: number,
  channelsMap: Record<string, ChatOpsChannel> = {},
  teamName?: string,
): string {
  const header = page !== undefined
    ? `📋 ${posts.length} tin nhắn từ channel (page ${page}):\n`
    : `📋 ${posts.length} tin nhắn tìm thấy:\n`;

  const body = posts
    .map((post, i) => {
      // Tác giả — dùng tên đầy đủ, không dùng ID
      const user = usersMap[post.user_id];
      const author = user ? formatUserDisplayName(user) : '(Unknown User)';

      const time = formatUnixMsToVN(post.create_at);

      // Channel — chỉ hiển thị khi có channelsMap (search_posts, v.v.)
      const ch = channelsMap[post.channel_id];
      const channelPrefix = ch ? `[${formatChannelLabel(ch)}] ` : '';

      // Permalink trực tiếp đến tin nhắn trong ChatOps
      const link = makePermalink(post.id, teamName);

      return `${i + 1}. ${channelPrefix}[${time}] ${author}:\n  ${post.message.replace(/\n/g, '\n  ')}\n  🔗 ${link}`;
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
