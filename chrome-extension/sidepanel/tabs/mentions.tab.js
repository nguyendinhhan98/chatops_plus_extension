/**
 * Mentions Tab Module — ChatOps Chrome Extension
 */

import { getMyChannelMembers, getChannelById } from '../../src/api/channels.js';
import { getChannelPosts, getPostThread, getPostReactions } from '../../src/api/posts.js';
import { getUsersByIds } from '../../src/api/users.js';
import { setupMultiSelect } from '../multiselect.js';
import { getMyChannels, searchChannels } from '../../src/api/channels.js';
import { 
  renderChannelCard, 
  renderMentionItem, 
  makePermalinkSync, 
  escapeHtml 
} from '../../src/utils/formatter.js';
import { showLoading, showError } from '../../src/utils/ui.js';
import { MENTION_BATCH_SIZE } from '../../src/constants.js';

let _state = null;
let mentionChannelMS = null;

export function setup(state) {
  _state = state;
  document.getElementById('btnSpScanMentions').addEventListener('click', scanMentionsDeep);

  const getTeamId = () => _state.getTeam()?.id;

  mentionChannelMS = setupMultiSelect(
    'spMentionChannelsMS',
    {
      defaultFetch: async (page, perPage) => {
        const channels = await getMyChannels(getTeamId());
        return channels.slice(page * perPage, (page + 1) * perPage);
      },
      searchFetch: async (term) => searchChannels(getTeamId(), term)
    },
    (channel) => renderChannelCard(channel),
    (channel) => channel.id,
    (channel) => channel.name
  );
}

export function reset() {
  if (mentionChannelMS) mentionChannelMS.reset();
  document.getElementById('spMentionResults').innerHTML = '<div class="empty-state">Click "Quét mentions" để bắt đầu</div>';
}

export function getSelects() {
  return { mentionChannelMS };
}

async function scanMentionsDeep() {
  const currentUser = _state.getUser();
  const currentTeam = _state.getTeam();
  const cachedConfig = _state.getConfig();
  const resultsEl = document.getElementById('spMentionResults');

  if (!currentUser) {
    showError(resultsEl, 'Chưa kết nối. Kiểm tra Settings.');
    return;
  }

  const hours = parseInt(document.getElementById('spMentionHours').value, 10);
  const direct = document.getElementById('spMentionDirect').checked;
  const here = document.getElementById('spMentionHere').checked;
  const channelFlag = document.getElementById('spMentionChannel').checked;
  const mentionChannels = mentionChannelMS ? mentionChannelMS.getSelected() : [];
  
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  resultsEl.innerHTML = `
    <div class="progress-bar"><div class="progress-fill" id="mentionProgress" style="width:0%"></div></div>
    <div class="loading-state"><span class="spinner"></span> Đang quét channels...</div>
  `;

  try {
    let targetChannels = [];
    if (mentionChannels.length > 0) {
      targetChannels = mentionChannels.map(c => ({ channel_id: c.id }));
    } else {
      targetChannels = await getMyChannelMembers(currentTeam.id);
    }

    const results = [];
    let processed = 0;

    for (let i = 0; i < targetChannels.length; i += MENTION_BATCH_SIZE) {
      const batch = targetChannels.slice(i, i + MENTION_BATCH_SIZE);
      await Promise.all(
        batch.map(async (member) => {
          try {
            const postList = await getChannelPosts(member.channel_id, {
              since: sinceMs,
              per_page: 200,
            });

            const mentionedPosts = postList.order
              .map((id) => postList.posts[id])
              .filter(Boolean)
              .filter((post) => {
                if (post.user_id === currentUser.id) return false;
                if (post.type && post.type !== '') return false;
                return hasMention(post.message, currentUser.username, direct, here, channelFlag);
              });

            if (mentionedPosts.length === 0) return;

            const trulyMissed = [];
            for (const post of mentionedPosts) {
              const [thread, reactions] = await Promise.all([
                getPostThread(post.id).catch(() => ({ posts: {} })),
                getPostReactions(post.id).catch(() => []),
              ]);

              const replied = Object.values(thread.posts).some(
                (p) => p.user_id === currentUser.id && p.id !== post.id
              );
              const reacted = Array.isArray(reactions) && reactions.some((r) => r.user_id === currentUser.id);

              if (!replied && !reacted) trulyMissed.push(post);
            }

            if (trulyMissed.length > 0) {
              const channelInfo = await getChannelById(member.channel_id).catch(() => null);
              const channelLabel = channelInfo ? (channelInfo.display_name || channelInfo.name) : 'Unknown Channel';
              results.push({ channelLabel, posts: trulyMissed });
            }
          } catch {}
        })
      );

      processed += batch.length;
      const progress = Math.min(100, Math.round((processed / targetChannels.length) * 100));
      const progressEl = document.getElementById('mentionProgress');
      if (progressEl) progressEl.style.width = `${progress}%`;
    }

    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">✅ Không có mention bị bỏ lỡ trong ${hours}h qua! 🎉</div>`;
      return;
    }

    const totalMissed = results.reduce((sum, r) => sum + r.posts.length, 0);
    const allUserIds = [...new Set(results.flatMap((r) => r.posts.map((p) => p.user_id)))];
    const users = await getUsersByIds(allUserIds);
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    let html = `<div class="mention-summary">⚠️ Phát hiện ${totalMissed} mention chưa xử lý trong ${results.length} channel</div>`;

    for (const group of results) {
      html += `<div class="mention-channel-group">`;
      html += `<div class="mention-channel-label">${escapeHtml(group.channelLabel)}</div>`;
      html += group.posts.map((post) => {
        const author = usersMap[post.user_id];
        const permalink = makePermalinkSync(post.id, cachedConfig.chatopsUrl, currentTeam.name);
        return renderMentionItem(post, author, permalink);
      }).join('');
      html += `</div>`;
    }

    resultsEl.innerHTML = html;
  } catch (err) {
    showError(resultsEl, err.message);
  }
}

function hasMention(message, username, direct, here, channelFlag) {
  const lower = message.toLowerCase();
  if (direct && lower.includes(`@${username.toLowerCase()}`)) return true;
  if (here && lower.includes('@here')) return true;
  if (channelFlag && (lower.includes('@all') || lower.includes('@channel'))) return true;
  return false;
}
