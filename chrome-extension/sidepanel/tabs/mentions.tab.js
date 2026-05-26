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
  searchChannels,
  addPostReaction
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
let scannedResults = [];
let allScannedUsersMap = {};
let currentMentionPage = 0;
let isScanning = false;

/**
 * Initializes the Mentions Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;
  document.getElementById('btnSpScanMentions').addEventListener('click', scanMentionsDeep);

  if (typeof window.convertToCustomDropdown === 'function') {
    window.convertToCustomDropdown('spMentionHours', null, '42px');
  }

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

  // Implement infinite scroll for mention results
  const resultsEl = document.getElementById('spMentionResults');
  if (resultsEl) {
    resultsEl.addEventListener('scroll', (e) => {
      const el = e.target;
      if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
        const totalMissed = scannedResults.reduce((sum, r) => sum + r.posts.length, 0);
        const maxPosts = (currentMentionPage + 1) * 20;
        if (totalMissed > maxPosts && !isScanning) {
          currentMentionPage++;
          renderScannedMentions(true);
        }
      }
    });
  }
}

/**
 * Clears the scan results and resets the tab state
 */
export function clearResults() {
  scannedResults = [];
  allScannedUsersMap = {};
  currentMentionPage = 0;
  isScanning = false;
  const resultsEl = document.getElementById('spMentionResults');
  if (resultsEl) {
    resultsEl.innerHTML = `<div class="empty-state">${language.scanMentionsStart}</div>`;
  }
  const mentionBadge = document.getElementById('mentionTabBadge');
  if (mentionBadge) {
    mentionBadge.textContent = '';
  }
}

/**
 * Resets the UI state of the tab
 */
export function reset() {
  _joinedChannelsCache = null;
  if (mentionChannelMS) mentionChannelMS.reset();
  clearResults();
}

export function getSelects() {
  return { mentionChannelMS };
}

/**
 * Renders the scanned mentions with pagination (20 items at a time)
 * @param {boolean} isLoadMore 
 */
function renderScannedMentions(isLoadMore = false) {
  const resultsEl = document.getElementById('spMentionResults');
  const cachedConfig = _state.getConfig();
  const currentTeam = _state.getTeam();
  const currentUser = _state.getUser();

  const totalMissed = scannedResults.reduce((sum, r) => sum + r.posts.length, 0);
  const mentionBadge = document.getElementById('mentionTabBadge');
  if (mentionBadge) {
    mentionBadge.textContent = totalMissed > 0 ? totalMissed : '';
  }
  const maxPosts = (currentMentionPage + 1) * 20;

  // Slice results up to maxPosts
  let postCount = 0;
  const paginatedResults = [];
  for (const group of scannedResults) {
    if (postCount >= maxPosts) break;
    const remaining = maxPosts - postCount;
    if (group.posts.length <= remaining) {
      paginatedResults.push(group);
      postCount += group.posts.length;
    } else {
      paginatedResults.push({
        channelLabel: group.channelLabel,
        posts: group.posts.slice(0, remaining)
      });
      postCount += remaining;
    }
  }

  let html = '';
  if (!isLoadMore) {
    html += `
      <div class="result-header">
        <div class="result-count">⚠️ ${language.mentionsFound.replace('{count}', totalMissed).replace('{channels}', scannedResults.length)}</div>
        <button class="btn-clear-search" id="btnClearMentions">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
          ${language.clearResults}
        </button>
      </div>
      <div id="mentionPostList">
    `;
  }

  let postsHtml = '';
  for (const group of paginatedResults) {
    postsHtml += `<div class="mention-channel-group">`;
    postsHtml += `<div class="mention-channel-label">${escapeHtml(group.channelLabel)}</div>`;
    postsHtml += group.posts.map((post) => {
      const author = allScannedUsersMap[post.user_id];
      const permalink = makePermalinkSync(post.id, cachedConfig.chatopsUrl, currentTeam.name);
      return renderMentionItem(post, author, permalink);
    }).join('');
    postsHtml += `</div>`;
  }

  if (!isLoadMore) {
    html += postsHtml;
    html += `</div>`;
    resultsEl.innerHTML = html;
    document.getElementById('btnClearMentions')?.addEventListener('click', clearResults);
  } else {
    const listEl = document.getElementById('mentionPostList');
    if (listEl) {
      listEl.innerHTML = postsHtml;
    }
  }

  // Remove existing Load More button if any
  document.getElementById('btnLoadMoreMentions')?.remove();

  // Show Load More button if there are more posts to load
  const hasMore = totalMissed > maxPosts;
  if (hasMore) {
    resultsEl.insertAdjacentHTML('beforeend', `
      <div class="loading-state" id="btnLoadMoreMentions" style="cursor: pointer; padding: 12px; text-align: center; font-weight: 600; color: var(--accent); border: 1px dashed var(--border); margin-top: 12px; border-radius: 8px; background: rgba(28, 88, 217, 0.04); transition: all 0.2s ease; font-size: 13.5px;" onmouseover="this.style.background='rgba(28, 88, 217, 0.08)'" onmouseout="this.style.background='rgba(28, 88, 217, 0.04)'">
        ${language.loadMoreBtn || 'Load More'}
      </div>
    `);
    document.getElementById('btnLoadMoreMentions')?.addEventListener('click', () => {
      currentMentionPage++;
      renderScannedMentions(true);
    });
  }

  // Bind reaction buttons click event
  resultsEl.querySelectorAll('.mention-react-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const postId = btn.getAttribute('data-post-id');
      const emoji = btn.getAttribute('data-emoji');
      const userId = currentUser.id;

      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';

      try {
        await addPostReaction(userId, postId, emoji);
        btn.style.opacity = '1';
        btn.classList.add('reacted');
      } catch (err) {
        console.error('[ChatOps Ext] Failed to add reaction:', err);
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });
  });

  // Only show collapse button if the text actually overflows
  setTimeout(() => {
    resultsEl.querySelectorAll('.post-item').forEach(card => {
      const textEl = card.querySelector('.post-body');
      const collapseBtn = card.querySelector('.collapse-btn');
      if (textEl && collapseBtn) {
        const isOverflowing = textEl.scrollHeight > textEl.clientHeight + 1;
        if (!isOverflowing) {
          collapseBtn.style.display = 'none';
        }
      }
    });
  }, 100);
}

let isCancelled = false;

/**
 * Performs a deep scan for missed mentions across channels
 */
async function scanMentionsDeep() {
  const currentUser = _state.getUser();
  const currentTeam = _state.getTeam();
  const resultsEl = document.getElementById('spMentionResults');
  const btnScan = document.getElementById('btnSpScanMentions');

  if (!currentUser) {
    showError(resultsEl, language.notConnected);
    return;
  }

  // Close the Action Modal
  if (window.ModalManager) {
    window.ModalManager.close();
  }

  const hours = parseInt(document.getElementById('spMentionHours').value, 10);
  const direct = document.getElementById('spMentionDirect').checked;
  const here = document.getElementById('spMentionHere').checked;
  const channelFlag = document.getElementById('spMentionChannel').checked;
  const scanDMs = document.getElementById('spMentionDMs').checked;
  const mentionChannels = mentionChannelMS ? mentionChannelMS.getSelected() : [];
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;
  
  resultsEl.innerHTML = `
    <div style="font-size: 12.5px; color: var(--text-2); text-align: center; margin-bottom: 14px; padding: 0 16px; line-height: 1.45; font-style: italic;">
      💡 <span data-i18n="scanTimeNotice">${language.scanTimeNotice}</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" id="mentionProgress" style="width:0%"></div></div>
    <div class="loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 100%; min-height: 150px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="spinner"></span> <span>${language.scanningChannels}</span>
      </div>
      <button id="btnStopMentionScan" class="btn-stop-search">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <rect width="12" height="12" x="2" y="2" rx="1.5" />
        </svg>
        ${language.stopScanning}
      </button>
    </div>
  `;

  document.getElementById('btnStopMentionScan')?.addEventListener('click', () => {
    isCancelled = true;
    isScanning = false;
    if (btnScan) {
      btnScan.classList.remove('loading');
      btnScan.disabled = false;
      btnScan.style.opacity = '1';
    }
    clearResults();
  });
 
  isScanning = true;
  isCancelled = false;
  if (btnScan) {
    btnScan.classList.add('loading');
  }

  try {
    const allChannels = await getMyChannels(currentTeam.id).catch(() => []);
    const channelsMap = Object.fromEntries(allChannels.map(c => [c.id, c]));
    if (isCancelled) return;
 
    let targetChannels = [];
    if (mentionChannels.length > 0) {
      targetChannels = mentionChannels.map(c => ({ channel_id: c.id }));
    } else {
      const allMemberships = await getMyChannelMembers(currentTeam.id);
      if (scanDMs) {
        targetChannels = allMemberships;
      } else {
        targetChannels = allMemberships.filter(m => {
          const chan = channelsMap[m.channel_id];
          if (!chan) return true; // Keep if unknown to be safe
          return chan.type !== 'D' && chan.type !== 'G' && !(chan.name && chan.name.includes('__'));
        });
      }
    }

    const scanResults = [];
    let processed = 0;

    // Scan in batches to avoid overwhelming the API
    for (let i = 0; i < targetChannels.length; i += UI_CONFIG.MENTION_BATCH_SIZE) {
      if (isCancelled) return;
      const batch = targetChannels.slice(i, i + UI_CONFIG.MENTION_BATCH_SIZE);
      await Promise.all(
        batch.map(async (member) => {
          try {
            if (isCancelled) return;
            const postList = await getChannelPosts(member.channel_id, {
              since: sinceMs,
              per_page: 200,
            });
            if (isCancelled) return;

            let channelInfo = channelsMap[member.channel_id];
            if (!channelInfo) {
              channelInfo = await getChannelById(member.channel_id).catch(() => null);
              if (channelInfo) channelsMap[member.channel_id] = channelInfo;
            }
            if (isCancelled) return;

            const isDm = channelInfo && channelInfo.type === 'D';
            const isDmOrGm = channelInfo && (channelInfo.type === 'D' || channelInfo.type === 'G' || (channelInfo.name && channelInfo.name.includes('__')));

            const mentionedPosts = postList.order
              .map((id) => postList.posts[id])
              .filter(Boolean)
              .filter((post) => {
                if (post.create_at < sinceMs) return false; // Strict hours check
                if (post.user_id === currentUser.id) return false;
                if (post.type && post.type !== '') return false; // Skip system messages
                
                // In a 1-on-1 DM, all messages from the other user are relevant to us!
                if (isDm) return true;
                
                return hasMention(post.message, currentUser.username, direct, here, channelFlag);
              });

            if (mentionedPosts.length === 0) return;
            if (isCancelled) return;

            const trulyMissed = [];
            for (const post of mentionedPosts) {
              if (isCancelled) return;
              if (isDmOrGm) {
                // For DMs/GMs, check if reacted or if user sent any message in this channel after
                const reactions = await getPostReactions(post.id).catch(() => []);
                if (isCancelled) return;
                const reacted = Array.isArray(reactions) && reactions.some((r) => r.user_id === currentUser.id);
                
                const hasRepliedInChannel = Object.values(postList.posts).some(
                  (p) => p.user_id === currentUser.id && p.create_at > post.create_at
                );

                if (!reacted && !hasRepliedInChannel) {
                  trulyMissed.push(post);
                }
              } else {
                // For regular channels, use standard thread/reaction logic
                const [thread, reactions] = await Promise.all([
                  getPostThread(post.id).catch(() => ({ posts: {} })),
                  getPostReactions(post.id).catch(() => []),
                ]);
                if (isCancelled) return;

                const replied = Object.values(thread.posts).some(
                  (p) => p.user_id === currentUser.id && p.id !== post.id
                );
                const reacted = Array.isArray(reactions) && reactions.some((r) => r.user_id === currentUser.id);

                if (!replied && !reacted) {
                  trulyMissed.push(post);
                }
              }
            }

            if (trulyMissed.length > 0 && !isCancelled) {
              const channelLabel = channelInfo ? getChannelLabel(channelInfo) : language.unknown;
              scanResults.push({ channelLabel, posts: trulyMissed });
            }
          } catch {}
        })
      );

      if (isCancelled) return;
      processed += batch.length;
      const progress = Math.min(100, Math.round((processed / targetChannels.length) * 100));
      const progressEl = document.getElementById('mentionProgress');
      if (progressEl) progressEl.style.width = `${progress}%`;
    }

    if (isCancelled) return;
    isScanning = false;

    if (scanResults.length === 0) {
      isScanning = false;
      resultsEl.innerHTML = `<div class="empty-state">${language.noMissedMentions.replace('{hours}', hours)}</div>`;
      return;
    }

    const allUserIds = [...new Set(scanResults.flatMap((r) => r.posts.map((p) => p.user_id)))];
    const users = await getUsersByIds(allUserIds);
    if (isCancelled) return;
    
    isScanning = false;

    // Store in module scoped variables for pagination rendering
    scannedResults = scanResults;
    allScannedUsersMap = Object.fromEntries(users.map((u) => [u.id, u]));
    currentMentionPage = 0;

    renderScannedMentions(false);

  } catch (err) {
    if (!isCancelled) {
      isScanning = false;
      showError(resultsEl, err.message);
    }
  } finally {
    if (btnScan) {
      btnScan.classList.remove('loading');
    }
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
