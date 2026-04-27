import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getMyProfile, getUserById, getUsersByIds } from '../chatops/api/users.js';
import { getMyChannelMembers, getChannelById } from '../chatops/api/channels.js';
import { getChannelPosts, getPostThread, getPostReactions } from '../chatops/api/posts.js';
import { getTeamByName } from '../chatops/api/teams.js';
import { formatUserDisplayName, makePermalink } from '../utils/formatter.js';
import { formatUnixMsToVN } from '../utils/date.js';
import { config } from '../config.js';
import type { ChatOpsPost, ChannelMember } from '../chatops/types.js';

/**
 * Lấy label đẹp cho channel — không bao giờ hiển thị raw ID.
 * - Public/Private: dùng display_name
 * - DM: resolve tên người kia từ API
 * - Group DM: dùng display_name (ChatOps đặt sẵn từ tên thành viên)
 */
async function resolveChannelLabel(channelId: string, myUserId: string): Promise<string> {
  try {
    const ch = await getChannelById(channelId);
    if (ch.type === 'D') {
      // DM channel: name có dạng "userid1__userid2", display_name = ""
      // Cần tìm ID của người kia và lấy tên thật
      const otherUserId = ch.name
        .split('__')
        .find((id) => id !== myUserId);
      if (otherUserId) {
        try {
          const otherUser = await getUserById(otherUserId);
          return `💬 DM với ${formatUserDisplayName(otherUser)}`;
        } catch {
          return `💬 DM`;
        }
      }
      return `💬 DM`;
    }
    if (ch.type === 'G') {
      return `👥 ${ch.display_name || 'Group DM'}`;
    }
    if (ch.type === 'P') {
      return `🔒 ${ch.display_name || ch.name}`;
    }
    return `📢 ${ch.display_name || ch.name}`;
  } catch {
    // Fallback khi không lấy được channel info — vẫn không hiện ID
    return `📢 (Channel không xác định)`;
  }
}


/**
 * Kiểm tra một post có mention đến username hay mention group không.
 * Các pattern: @username, @all, @channel, @here
 */
function hasMention(message: string, username: string, includeGroup: boolean): boolean {
  const lower = message.toLowerCase();
  const hasDirectMention = lower.includes(`@${username.toLowerCase()}`);
  if (hasDirectMention) return true;
  if (!includeGroup) return false;
  return (
    lower.includes('@all') ||
    lower.includes('@channel') ||
    lower.includes('@here')
  );
}

/**
 * Kiểm tra xem user đã xử lý tin nhắn này chưa.
 * Coi là "đã xử lý" nếu đã REPLY trong thread HOẶC đã REACTION.
 *
 * ⚡ Tối ưu: chạy song song cả 2 check để giảm 50% thời gian chờ.
 */
async function hasHandledPost(postId: string, myUserId: string): Promise<boolean> {
  const [replied, reacted] = await Promise.all([
    // Check 1: Đã reply trong thread chưa?
    getPostThread(postId)
      .then((thread) => Object.values(thread.posts).some(
        (p) => p.user_id === myUserId && p.id !== postId
      ))
      .catch(() => false),

    // Check 2: Đã reaction chưa?
    getPostReactions(postId)
      .then((reactions) => reactions.some((r) => r.user_id === myUserId))
      .catch(() => false),
  ]);

  if (replied) console.error(`[check-missed-mentions] post=${postId} → đã reply.`);
  if (reacted) console.error(`[check-missed-mentions] post=${postId} → đã reaction.`);

  return replied || reacted;
}

/**
 * Xử lý một channel: lấy posts có mention, lọc ra những cái thực sự chưa xử lý.
 * "Chưa xử lý" = chưa reply VÀ chưa reaction.
 */
async function processMentionsInChannel(
  channelId: string,
  sinceMs: number,
  myUserId: string,
  myUsername: string,
  includeGroup: boolean,
): Promise<ChatOpsPost[]> {
  const postList = await getChannelPosts(channelId, {
    since: sinceMs,
    per_page: 200, // Tối đa để không bỏ sót mention nào trong khoảng thời gian
  });

  // Bước 1: Lọc post có mention (bỏ qua post của mình và system message)
  const mentionedPosts = postList.order
    .map((id) => postList.posts[id])
    .filter(Boolean)
    .filter((post) => {
      if (post.user_id === myUserId) return false;
      if (post.type && post.type !== '') return false;
      return hasMention(post.message, myUsername, includeGroup);
    });

  if (mentionedPosts.length === 0) return [];

  // Bước 2: Lọc tiếp — chỉ giữ lại post mà mình CHƯA xử lý (reply hoặc reaction)
  const trulyMissed: ChatOpsPost[] = [];

  for (const post of mentionedPosts) {
    const alreadyHandled = await hasHandledPost(post.id, myUserId);
    if (!alreadyHandled) {
      trulyMissed.push(post);
    }
  }

  return trulyMissed;
}

export function registerCheckMissedMentions(server: McpServer): void {
  server.registerTool(
    'check-missed-mentions',
    {
      title: 'Kiểm tra mention bị bỏ lỡ',
      description:
        'Phát hiện các tin nhắn có mention (@username, @all, @channel, @here) ' +
        'mà bạn chưa xử lý.\n\n' +
        '**Logic "miss":** Chỉ tính là bị bỏ lỡ nếu bạn CHƯA reply VÀ CHƯA reaction trong thread đó. ' +
        'Đã reply hoặc đã thả icon → không tính là miss.\n\n' +
        '**Tối ưu:** Khi quét cả team, sẽ dùng since_hours để quét theo thời gian thực ' +
        '(không phụ thuộc mention_count của server — tránh bỏ sót khi đã click xem nhưng chưa xử lý).\n\n' +
        '**Cách dùng:**\n' +
        '- Quét cả team: chỉ cần gọi không có tham số (mặc định 24h).\n' +
        '- Quét channel cụ thể: truyền `channel_id`.\n' +
        '- Tuỳ chỉnh thời gian: truyền `since_hours` (tối đa 336h = 14 ngày).',
      annotations: {
        destructiveHint: false,
        readOnlyHint: true,
        openWorldHint: false,
      },
      inputSchema: z.object({
        team_name: z
          .string()
          .optional()
          .describe(
            `Slug của team cần kiểm tra. Mặc định: "${config.teamName ?? 'dn'}". ` +
            'Ví dụ: "dn", "runsystem".'
          ),
        channel_id: z
          .string()
          .optional()
          .describe(
            'Chỉ kiểm tra một channel cụ thể (theo ID). ' +
            'Dùng get_channel_info để lấy ID. ' +
            'Nếu không truyền → quét toàn bộ team.'
          ),
        include_group_mentions: z
          .boolean()
          .default(true)
          .describe(
            'Có bao gồm mention group (@all, @channel, @here) không. Mặc định: true.'
          ),
        since_hours: z
          .number()
          .int()
          .min(1)
          .max(336)
          .optional()
          .describe(
            'Quét bao nhiêu giờ trở lại. Mặc định: 24 giờ. Tối đa 336 giờ (14 ngày). ' +
            'Áp dụng cho cả chế độ channel cụ thể lẫn quét toàn team.'
          ),
      }),
    },
    async ({ team_name, channel_id, include_group_mentions, since_hours }) => {
      try {
        const me = await getMyProfile();
        const results: string[] = [];
        let totalMissed = 0;

        // Thời gian quét — dùng since_hours cho CẢ HAI chế độ
        // Không phụ thuộc mention_count của server (tránh bỏ sót khi đã "xem" nhưng chưa xử lý)
        const sinceHours = since_hours ?? 24;
        const sinceMs = Date.now() - sinceHours * 60 * 60 * 1000;

        // teamSlug dùng chung cho cả hai chế độ (để tạo permalink đúng)
        const teamSlug = team_name ?? config.teamName ?? 'dn';

        // --- Chế độ 1: Kiểm tra channel cụ thể ---
        if (channel_id) {
          console.error(
            `[check-missed-mentions] Chế độ channel cụ thể: ` +
            `channel=${channel_id}, since=${sinceHours}h trước`
          );

          const channelLabel = await resolveChannelLabel(channel_id, me.id);

          const missedPosts = await processMentionsInChannel(
            channel_id, sinceMs, me.id, me.username, include_group_mentions
          );

          if (missedPosts.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `✅ Không có mention bị bỏ lỡ trong ${channelLabel} (${sinceHours}h qua).`,
              }],
            };
          }

          totalMissed = missedPosts.length;

          // Lấy thông tin người gửi để hiển thị tên đầy đủ
          const senderIds = [...new Set(missedPosts.map((p) => p.user_id))];
          const senders = await getUsersByIds(senderIds);
          const sendersMap = Object.fromEntries(senders.map((u) => [u.id, u]));

          const postLines = missedPosts.slice(0, 10).map((post) => {
            const link = makePermalink(post.id, teamSlug);
            const sender = sendersMap[post.user_id];
            const senderName = sender ? formatUserDisplayName(sender) : '(Unknown)';
            const msgBody = post.message.replace(/\n/g, '\n    ');
            return `  • [${formatUnixMsToVN(post.create_at)}] ${senderName}:\n    ${msgBody}\n    🔗 ${link}`;
          });
          const moreCount = missedPosts.length - postLines.length;
          results.push([
            `🔔 ${channelLabel}`,
            ...postLines,
            ...(moreCount > 0 ? [`  ... và ${moreCount} tin nhắn khác`] : []),
          ].join('\n'));

        } else {
          // --- Chế độ 2: Quét toàn bộ team theo thời gian thực ---
          // KHÔNG dùng mention_count vì nó bị reset khi user click xem channel
          // mà chưa thực sự reply hay reaction.
          console.error(
            `[check-missed-mentions] Chế độ team: "${teamSlug}", since=${sinceHours}h trước`
          );

          const team = await getTeamByName(teamSlug);


          // Lấy tất cả channels user tham gia trong team
          const allMembers: ChannelMember[] = await getMyChannelMembers(team.id);

          console.error(
            `[check-missed-mentions] Quét ${allMembers.length} channel trong ${sinceHours}h qua...`
          );

          // Quét song song tất cả channel (giới hạn concurrency để không spam API)
          const BATCH_SIZE = 5;
          for (let i = 0; i < allMembers.length; i += BATCH_SIZE) {
            const batch = allMembers.slice(i, i + BATCH_SIZE);
            await Promise.all(
              batch.map(async (member) => {
                const missedPosts = await processMentionsInChannel(
                  member.channel_id,
                  sinceMs,
                  me.id,
                  me.username,
                  include_group_mentions,
                );

                if (missedPosts.length === 0) return;

                const channelLabel = await resolveChannelLabel(member.channel_id, me.id);

                totalMissed += missedPosts.length;

                // Lấy thông tin người gửi để hiển thị tên đầy đủ
                const senderIds = [...new Set(missedPosts.map((p) => p.user_id))];
                const senders = await getUsersByIds(senderIds);
                const sendersMap = Object.fromEntries(senders.map((u) => [u.id, u]));

                const postLines = missedPosts.slice(0, 5).map((post) => {
                  const link = makePermalink(post.id, member.channel_id ? teamSlug : undefined);
                  const sender = sendersMap[post.user_id];
                  const senderName = sender ? formatUserDisplayName(sender) : '(Unknown)';
                  const msgBody = post.message.replace(/\n/g, '\n    ');
                  return `  • [${formatUnixMsToVN(post.create_at)}] ${senderName}:\n    ${msgBody}\n    🔗 ${link}`;
                });
                const moreCount = missedPosts.length - postLines.length;
                results.push([
                  `🔔 ${channelLabel}`,
                  ...postLines,
                  ...(moreCount > 0 ? [`  ... và ${moreCount} tin nhắn khác`] : []),
                ].join('\n'));
              })
            );
          }
        }

        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text:
                `✅ Không có mention nào bị bỏ lỡ trong ${sinceHours}h qua!\n` +
                '(Đã reply hoặc đã reaction → không tính là miss.)',
            }],
          };
        }

        const summary = [
          `🔍 Phát hiện **${totalMissed} mention** chưa xử lý ở **${results.length} channel**:`,
          '',
          results.join('\n\n'),
          '',
          '💡 "Chưa xử lý" = chưa reply VÀ chưa reaction. Đã làm 1 trong 2 → không tính.',
        ].join('\n');

        return { content: [{ type: 'text', text: summary }] };

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[check-missed-mentions] ❌ Lỗi: ${errorMsg}`);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Lỗi khi kiểm tra mention: ${errorMsg}` }],
        };
      }
    },
  );
}
