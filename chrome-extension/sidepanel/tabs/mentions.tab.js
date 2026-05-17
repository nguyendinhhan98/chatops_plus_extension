/**
 * Mentions Tab Module — ChatOps Chrome Extension
 */

import { 
  getMyChannelMembers, 
  getChannelById, 
  getChannelPosts, 
  getPostThread, 
  getPostReactions, 
  getUsersByIds, 
  getMyChannels, 
  searchChannels 
} from '../../src/api/index.js';
import { setupMultiSelect } from '../multiselect.js';
import { 
  renderChannelCard, 
  renderMentionItem, 
  makePermalinkSync, 
  getChannelLabel,
  enrichChannels,
  filterChannels,
  escapeHtml,
  showLoading, 
  showError 
} from '../../src/utils/index.js';
import { UI_CONFIG } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;
let mentionChannelMS = null;
let _joinedChannelsCache = null;

/**
 * Initializes the Mentions Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;
  document.getElementById('btnSpScanMentions').addEventListener('click', scanMentionsDeep);

  // Toggle Collapse
  const btnToggle = document.getElementById('btnToggleMentions');
  const mentionsForm = document.getElementById('spMentionsForm');
  if (btnToggle && mentionsForm) {
    btnToggle.addEventListener('click', () => {
      mentionsForm.classList.toggle('collapsed');
      btnToggle.classList.toggle('collapsed');
    });
  }
  // Include DM toggle - Clear cache to force re-fetch with new filter
  document.getElementById('spMentionIncludeDM').addEventListener('change', () => {
    _joinedChannelsCache = null;
    if (mentionChannelMS) mentionChannelMS.reset();
  });

  const getTeamId = () => _state.getTeam()?.id;

  mentionChannelMS = setupMultiSelect(
    'spMentionChannelsMS',
    {
      defaultFetch: async (page, perPage) => {
        const includeDM = document.getElementById('spMentionIncludeDM').checked;
        if (!_joinedChannelsCache) {
          _joinedChannelsCache = await getMyChannels(getTeamId());
        }
        let filtered = filterChannels(_joinedChannelsCache, includeDM);
        const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
        return enrichChannels(paginated, _state.getUser());
      },
      searchFetch: async (term) => {
        const includeDM = document.getElementById('spMentionIncludeDM').checked;
        if (!_joinedChannelsCache) {
          _joinedChannelsCache = await getMyChannels(getTeamId());
        }
        const termLower = term.toLowerCase();
        let filtered = filterChannels(_joinedChannelsCache, includeDM);
        
        const enriched = await enrichChannels(filtered, _state.getUser());
        return enriched.filter(c => 
          (c.display_name && c.display_name.toLowerCase().includes(termLower)) || 
          (c.name && c.name.toLowerCase().includes(termLower))
        );
      }
    },
    (channel) => renderChannelCard(channel),
    (channel) => channel.id,
    (channel) => getChannelLabel(channel)
  );
}

/**
 * Resets the UI state of the tab
 */
export function reset() {
  if (mentionChannelMS) mentionChannelMS.reset();
  document.getElementById('spMentionResults').innerHTML = `<div class="empty-state">${language.scanMentionsStart}</div>`;
}

export function getSelects() {
  return { mentionChannelMS };
}

/**
 * Performs a deep scan for missed mentions across channels
 */
async function scanMentionsDeep() {
  const currentUser = _state.getUser();
  const currentTeam = _state.getTeam();
  const cachedConfig = _state.getConfig();
  const resultsEl = document.getElementById('spMentionResults');

  if (!currentUser) {
    showError(resultsEl, language.notConnected);
    return;
  }

  const hours = parseInt(document.getElementById('spMentionHours').value, 10);
  const direct = document.getElementById('spMentionDirect').checked;
  const here = document.getElementById('spMentionHere').checked;
  const channelFlag = document.getElementById('spMentionChannel').checked;
  const includeDM = document.getElementById('spMentionIncludeDM').checked;
  const mentionChannels = mentionChannelMS ? mentionChannelMS.getSelected() : [];
  
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  resultsEl.innerHTML = `
    <div class="progress-bar"><div class="progress-fill" id="mentionProgress" style="width:0%"></div></div>
    <div class="loading-state"><span class="spinner"></span> ${language.scanningChannels}</div>
  `;

  try {
    let targetChannels = [];
    if (mentionChannels.length > 0) {
      targetChannels = mentionChannels.map(c => ({ channel_id: c.id }));
    } else {
      const allMemberships = await getMyChannelMembers(currentTeam.id);
      if (includeDM) {
        targetChannels = allMemberships;
      } else {
        targetChannels = allMemberships.filter(m => !m.channel_name || !m.channel_name.startsWith('@'));
      }
    }

    const results = [];
    let processed = 0;

    // Scan in batches to avoid overwhelming the API
    for (let i = 0; i < targetChannels.length; i += UI_CONFIG.MENTION_BATCH_SIZE) {
      const batch = targetChannels.slice(i, i + UI_CONFIG.MENTION_BATCH_SIZE);
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
                if (post.type && post.type !== '') return false; // Skip system messages
                return hasMention(post.message, currentUser.username, direct, here, channelFlag);
              });

            if (mentionedPosts.length === 0) return;

            const trulyMissed = [];
            for (const post of mentionedPosts) {
              const [thread, reactions] = await Promise.all([
                getPostThread(post.id).catch(() => ({ posts: {} })),
                getPostReactions(post.id).catch(() => []),
              ]);

              // Check if already replied or reacted
              const replied = Object.values(thread.posts).some(
                (p) => p.user_id === currentUser.id && p.id !== post.id
              );
              const reacted = Array.isArray(reactions) && reactions.some((r) => r.user_id === currentUser.id);

              if (!replied && !reacted) trulyMissed.push(post);
            }

            if (trulyMissed.length > 0) {
              const channelInfo = await getChannelById(member.channel_id).catch(() => null);
              const channelLabel = channelInfo ? (channelInfo.display_name || channelInfo.name) : language.unknown;
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
      resultsEl.innerHTML = `<div class="empty-state">✅ ${language.noMissedMentions.replace('{hours}', hours)}</div>`;
      return;
    }

    const totalMissed = results.reduce((sum, r) => sum + r.posts.length, 0);
    const allUserIds = [...new Set(results.flatMap((r) => r.posts.map((p) => p.user_id)))];
    const users = await getUsersByIds(allUserIds);
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    let html = `<div class="mention-summary">⚠️ ${language.mentionsFound.replace('{count}', totalMissed).replace('{channels}', results.length)}</div>`;

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

/**
 * Checks if a message contains a specific mention
 */
function hasMention(message, username, direct, here, channelFlag) {
  const lower = message.toLowerCase();
  if (direct && lower.includes(`@${username.toLowerCase()}`)) return true;
  if (here && lower.includes('@here')) return true;
  if (channelFlag && (lower.includes('@all') || lower.includes('@channel'))) return true;
  return false;
}
