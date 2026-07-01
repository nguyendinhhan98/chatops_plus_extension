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

function updateFabState() {
  const fab = document.getElementById('btnFabScanMentions');
  if (fab) {
    if (isScanning) {
      fab.style.display = 'none';
      return;
    } else {
      fab.style.display = 'flex';
    }
    const totalMissed = scannedResults.reduce((sum, r) => sum + r.posts.length, 0);
    if (totalMissed === 0) {
      fab.classList.add('empty-pulsing');
    } else {
      fab.classList.remove('empty-pulsing');
    }
  }
}

/**
 * Initializes the Mentions Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;
  document.getElementById('btnSpScanMentions').addEventListener('click', scanMentionsDeep);

  if (typeof window.convertToCustomDropdown === 'function') {
    const isModal = document.body.classList.contains('modal-mode') || window.location.search.includes('view=modal');
    window.convertToCustomDropdown('spMentionHours', null, isModal ? '30px' : '42px');
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
          const teamId = getTeamId();
          if (teamId === 'all') {
            const teams = _state.getTeams() || [];
            const lists = await Promise.all(teams.map(t => getMyChannels(t.id).catch(() => [])));
            const all = lists.flat();
            const seen = new Set();
            _joinedChannelsCache = all.filter(c => {
              if (!c || !c.id || seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            });
          } else {
            _joinedChannelsCache = await getMyChannels(teamId);
          }
        }
        let filtered = filterChannels(_joinedChannelsCache, includeDM);
        const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
        return enrichChannels(paginated, _state.getUser());
      },
      searchFetch: async (term) => {
        const includeDM = document.getElementById('spMentionIncludeDM').checked;
        if (!_joinedChannelsCache) {
          const teamId = getTeamId();
          if (teamId === 'all') {
            const teams = _state.getTeams() || [];
            const lists = await Promise.all(teams.map(t => getMyChannels(t.id).catch(() => [])));
            const all = lists.flat();
            const seen = new Set();
            _joinedChannelsCache = all.filter(c => {
              if (!c || !c.id || seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            });
          } else {
            _joinedChannelsCache = await getMyChannels(teamId);
          }
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
  updateFabState();
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
  updateFabState();
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
  updateFabState();
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
        <div class="result-actions">
          <button class="btn-react-all" id="btnReactAllMentions" title="${language.reactAllBtn || 'React tất cả'}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="vertical-align: middle;">${language.reactAllBtn || 'React All'}</span>
          </button>
          <button class="btn-clear-search" id="btnClearMentions">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
            <span>${language.clearResults}</span>
          </button>
        </div>
      </div>
      <div id="mentionPostList">
    `;
  }

  let postsHtml = '';
  for (const group of paginatedResults) {
    const label = group.channel ? getChannelLabel(group.channel) : (group.channelLabel || language.unknown);
    postsHtml += `<div class="mention-channel-group">`;
    postsHtml += `<div class="mention-channel-label">${escapeHtml(label)}</div>`;
    postsHtml += group.posts.map((post) => {
      const author = allScannedUsersMap[post.user_id];
      const permalink = makePermalinkSync(post.id, cachedConfig.chatopsUrl, post.teamName || currentTeam.name);
      return renderMentionItem(post, author, permalink);
    }).join('');
    postsHtml += `</div>`;
  }

  if (!isLoadMore) {
    html += postsHtml;
    html += `</div>`;
    resultsEl.innerHTML = html;
    document.getElementById('btnClearMentions')?.addEventListener('click', clearResults);

    // Wire Quick React All
    document.getElementById('btnReactAllMentions')?.addEventListener('click', async function () {
      const btn = this;
      const allPosts = scannedResults.flatMap(r => r.posts);
      if (allPosts.length === 0) return;

      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.innerHTML = `<span class="spinner" style="width:10px;height:10px;border-width:2px;"></span> Reacting...`;

      const REACT_BATCH = 5;
      const emoji = 'white_check_mark';
      const userId = currentUser.id;
      let done = 0;

      for (let i = 0; i < allPosts.length; i += REACT_BATCH) {
        const batch = allPosts.slice(i, i + REACT_BATCH);
        await Promise.all(batch.map(p => addPostReaction(userId, p.id, emoji).catch(() => {})));
        done += batch.length;
        btn.innerHTML = `<span class="spinner" style="width:10px;height:10px;border-width:2px;"></span> ${done}/${allPosts.length}`;
      }

      // Done — clear results
      clearResults();
    });
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
  window.allScannedPostsDebug = [];
  const currentUser = _state.getUser();
  const currentTeam = _state.getTeam();
  const resultsEl = document.getElementById('spMentionResults');
  const btnScan = document.getElementById('btnSpScanMentions');

  if (!currentUser) {
    showError(resultsEl, language.notConnected);
    return;
  }

  console.log('[ChatOps Ext Debug] === MENTIONS SCAN DEBUG ===');
  console.log('[ChatOps Ext Debug] Current User profile:', {
    id: currentUser.id,
    username: currentUser.username,
    first_name: currentUser.first_name,
    last_name: currentUser.last_name,
    nickname: currentUser.nickname,
    mention_keys: currentUser.notify_props?.mention_keys
  });

  // Close the Action Modal
  if (window.ModalManager) {
    window.ModalManager.close();
  }

  const hours = parseInt(document.getElementById('spMentionHours').value, 10);
  const direct = document.getElementById('spMentionDirect').checked;
  const here = document.getElementById('spMentionHere').checked;
  const channelFlag = document.getElementById('spMentionChannel').checked;
  const scanDMs = document.getElementById('spMentionDMs').checked;
  const onlyUnread = document.getElementById('spMentionOnlyUnread') ? document.getElementById('spMentionOnlyUnread').checked : true;
  const mentionChannels = mentionChannelMS ? mentionChannelMS.getSelected() : [];
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;
  const isModal = document.body.classList.contains('modal-mode') || window.location.search.includes('view=modal');
  
  resultsEl.innerHTML = `
    <div style="font-size: 12.5px; color: var(--text-2); text-align: center; margin-bottom: 14px; padding: 0 16px; line-height: 1.45; font-style: italic;">
      💡 <span data-i18n="${isModal ? 'scanTimeNoticeModal' : 'scanTimeNotice'}">${isModal ? language.scanTimeNoticeModal : language.scanTimeNotice}</span>
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
  updateFabState();
  if (btnScan) {
    btnScan.classList.add('loading');
  }

  try {
    let targetChannels = [];
    const channelsMap = {};
    
    if (currentTeam.id === 'all') {
      const teams = _state.getTeams() || [];
      await Promise.all(
        teams.map(async (t) => {
          try {
            const allChannels = await getMyChannels(t.id).catch(() => []);
            allChannels.forEach(c => {
              channelsMap[c.id] = c;
            });
            
            const allMemberships = await getMyChannelMembers(t.id);
            let filtered;
            if (scanDMs) {
              filtered = allMemberships;
            } else {
              filtered = allMemberships.filter(m => {
                const chan = channelsMap[m.channel_id];
                if (!chan) return true;
                return chan.type !== 'D' && chan.type !== 'G' && !(chan.name && chan.name.includes('__'));
              });
            }
            
            // Stamp each membership with team name to allow correct permalinks
            filtered.forEach(m => {
              m.teamName = t.name;
            });
            targetChannels.push(...filtered);
          } catch {}
        })
      );
      
      if (mentionChannels.length > 0) {
        targetChannels = mentionChannels.map(c => ({ channel_id: c.id, teamName: c.teamName || currentTeam.name }));
      }
    } else {
      // Normal single team scan
      const allChannels = await getMyChannels(currentTeam.id).catch(() => []);
      allChannels.forEach(c => { channelsMap[c.id] = c; });
      if (isCancelled) return;
 
      if (mentionChannels.length > 0) {
        targetChannels = mentionChannels.map(c => ({ channel_id: c.id, teamName: currentTeam.name }));
      } else {
        const allMemberships = await getMyChannelMembers(currentTeam.id);
        let filtered;
        if (scanDMs) {
          filtered = allMemberships;
        } else {
          filtered = allMemberships.filter(m => {
            const chan = channelsMap[m.channel_id];
            if (!chan) return true;
            return chan.type !== 'D' && chan.type !== 'G' && !(chan.name && chan.name.includes('__'));
          });
        }
        filtered.forEach(m => { m.teamName = currentTeam.name; });
        targetChannels = filtered;
      }
    }

    // Deduplicate target channels by channel_id
    const seenChannels = new Set();
    targetChannels = targetChannels.filter(c => {
      if (seenChannels.has(c.channel_id)) return false;
      seenChannels.add(c.channel_id);
      return true;
    });

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

            // Debug: expose all posts in this channel to a global array for easy user inspection
            if (!window.allScannedPostsDebug) window.allScannedPostsDebug = [];
            postList.order.forEach(id => {
              if (postList.posts[id]) {
                window.allScannedPostsDebug.push({
                  post: postList.posts[id],
                  channel: channelInfo?.display_name || member.channel_id,
                  team: member.teamName
                });
              }
            });

            const isDm = channelInfo && channelInfo.type === 'D';
            const isDmOrGm = channelInfo && (channelInfo.type === 'D' || channelInfo.type === 'G' || (channelInfo.name && channelInfo.name.includes('__')));

            const mentionedPosts = postList.order
              .map((id) => postList.posts[id])
              .filter(Boolean)
              .filter((post) => {
                const isMe = post.user_id === currentUser.id;
                const isSystem = post.type && post.type !== '';
                const isTooOld = post.create_at < sinceMs;
                const matched = isDm || hasMention(post.message, currentUser, direct, here, channelFlag);
                
                console.log(`[ChatOps Ext Debug] Post ${post.id}: isMe=${isMe}, isSystem=${isSystem}, isTooOld=${isTooOld}, matchedMention=${matched}, message="${post.message.substring(0, 100)}..."`);
                
                if (isTooOld) return false;
                if (isMe) return false;
                if (isSystem) return false;
                return matched;
              });

            if (mentionedPosts.length === 0) return;
            if (isCancelled) return;

            const trulyMissed = [];
            for (const post of mentionedPosts) {
              if (isCancelled) return;
              
              if (!onlyUnread) {
                // Stamp the post with the correct teamName
                post.teamName = member.teamName;
                trulyMissed.push(post);
                continue;
              }

              if (isDmOrGm) {
                // For DMs/GMs, check if reacted or if user sent any message in this channel after
                const reactions = await getPostReactions(post.id).catch(() => []);
                if (isCancelled) return;
                const reacted = Array.isArray(reactions) && reactions.some(
                  (r) => r.user_id === currentUser.id && r.emoji_name !== 'eye_speech_bubble'
                );
                
                const hasRepliedInChannel = Object.values(postList.posts).some(
                  (p) => p.user_id === currentUser.id && p.create_at > post.create_at
                );

                console.log(`[ChatOps Ext Debug] DM/GM filter for ${post.id}: reacted=${reacted}, hasRepliedInChannel=${hasRepliedInChannel}`);

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
                  (p) => p.user_id === currentUser.id && p.create_at > post.create_at
                );
                const reacted = Array.isArray(reactions) && reactions.some(
                  (r) => r.user_id === currentUser.id && r.emoji_name !== 'eye_speech_bubble'
                );

                console.log(`[ChatOps Ext Debug] Channel filter for ${post.id}: replied=${replied}, reacted=${reacted}`);

                if (!replied && !reacted) {
                  // Stamp the post with the correct teamName
                  post.teamName = member.teamName;
                  trulyMissed.push(post);
                }
              }
            }

            if (trulyMissed.length > 0 && !isCancelled) {
              scanResults.push({ channel: channelInfo, channelLabel: channelInfo ? getChannelLabel(channelInfo) : language.unknown, posts: trulyMissed });
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
      scannedResults = [];
      resultsEl.innerHTML = `<div class="empty-state">${language.noMissedMentions.replace('{hours}', hours)}</div>`;
      updateFabState();
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
function stripAccents(str) {
  if (typeof str !== 'string') return '';
  // Normalize and replace zero-width spaces/joiners, BOM, and non-breaking spaces
  const clean = str.normalize("NFD")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "") // Remove zero-width spaces and BOM
    .replace(/[\u00a0\xa0]/g, " ")             // Convert non-breaking spaces to standard spaces
    .replace(/\s+/g, " ");                     // Collapse consecutive whitespace to a single space
    
  return clean.replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

/**
 * Checks if a message contains a specific mention
 */
function hasMention(message, currentUser, direct, here, channelFlag) {
  const normMessage = stripAccents(message.toLowerCase());
  
  if (direct && currentUser) {
    const keysMap = new Map();
    
    // Helper to safely add normalized key variations
    const addKey = (val, allowStandalone) => {
      if (!val) return;
      const cleanVal = stripAccents(val.toLowerCase().trim());
      if (!cleanVal) return;
      
      // If key already exists, merge the allowStandalone flag
      if (keysMap.has(cleanVal)) {
        const existing = keysMap.get(cleanVal);
        existing.allowStandalone = existing.allowStandalone || allowStandalone;
      } else {
        keysMap.set(cleanVal, { value: cleanVal, allowStandalone });
      }
    };

    // 1. Username
    if (currentUser.username) {
      addKey(currentUser.username, true);
    }
    
    // 2. Nickname
    if (currentUser.nickname) {
      addKey(currentUser.nickname, true);
    }
    
    // 3. Custom Mattermost notification keys (e.g. hannd, @hannd)
    if (currentUser.notify_props && currentUser.notify_props.mention_keys) {
      const customKeys = currentUser.notify_props.mention_keys.split(',')
        .map(k => k.trim())
        .filter(k => k && k !== '@here' && k !== '@all' && k !== '@channel');
      for (const k of customKeys) {
        addKey(k, true);
      }
    }
    
    // 4. Full Name & Reversed Full Name
    const firstName = (currentUser.first_name || '').trim();
    const lastName = (currentUser.last_name || '').trim();
    
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) {
        addKey(fullName, true);
      }
      
      const reversedFullName = `${lastName} ${firstName}`.trim();
      if (reversedFullName) {
        addKey(reversedFullName, true);
      }
      
      // 5. Smart Given Name and Compound Name Extraction
      const commonFamilyNames = new Set([
        'nguyen', 'tran', 'le', 'pham', 'huynh', 'hoang', 'phan', 'vu', 'vo', 
        'dang', 'bui', 'do', 'ho', 'ngo', 'duong', 'ly', 'doan', 'lam', 
        'trinh', 'mai', 'dinh', 'phung', 'ha', 'luong', 'tang', 'ton', 'quach', 'mac', 'kim'
      ]);
      
      const commonMiddleNames = new Set([
        'thi', 'van', 'huu', 'duc', 'bach', 'kim', 'ngoc', 'minh'
      ]);
      
      const allWords = fullName.toLowerCase().split(/\s+/).map(w => stripAccents(w)).filter(Boolean);
      if (allWords.length > 1) {
        const firstWord = allWords[0];
        const lastWord = allWords[allWords.length - 1];
        
        // Add last word as given name candidate if it's not a common family name
        if (!commonFamilyNames.has(lastWord)) {
          addKey(lastWord, !commonMiddleNames.has(lastWord));
        }
        // Add first word as given name candidate if it's not a common family name
        if (!commonFamilyNames.has(firstWord)) {
          addKey(firstWord, !commonMiddleNames.has(firstWord));
        }
        
        // Also support middle name + given name (e.g. "Đình Hân" from "Nguyễn Đình Hân")
        if (allWords.length > 2) {
          const middleAndLast = allWords.slice(1).join(' ');
          addKey(middleAndLast, true);
          
          const lastTwoWords = allWords.slice(allWords.length - 2).join(' ');
          addKey(lastTwoWords, true);
        }
      }
    }

    // Now check all compiled keys against the message
    const compoundFilters = {
      'han': {
        lookahead: [' hoan', ' hanh']
      },
      'minh': {
        lookahead: [' hoa', ' chung', ' bach', ' man', ' triet'],
        lookbehind: ['binh ', 'thong ', 'chung ', 'u ', 'quang ', 'van ', 'gia ']
      },
      'viet': {
        lookahead: [' nam', ' kieu', ' vi', ' cong', ' quat', ' vit', ' dac']
      },
      'nam': {
        lookbehind: ['viet ', 'phuong ', 'mien ', 'trung ', 'bac ', 'dong ', 'tay ']
      },
      'anh': {
        lookbehind: ['tieng ', 'nguoi ', 'nuoc ', 'hinh ']
      }
    };

    const isTargetMessage = message.includes("vất vả") || message.includes("vat va");
    if (isTargetMessage) {
      const debugKeys = [];
      keysMap.forEach((val, key) => {
        debugKeys.push({ key, allowStandalone: val.allowStandalone });
      });
      console.log(`[ChatOps Ext Debug] === TARGET POST DETECTED ===`);
      console.log(`[ChatOps Ext Debug] message: "${message.substring(0, 150)}..."`);
      console.log(`[ChatOps Ext Debug] normMessage: "${normMessage.substring(0, 150)}..."`);
      console.log(`[ChatOps Ext Debug] currentUser profile:`, currentUser);
      console.log(`[ChatOps Ext Debug] Generated match keys:`, debugKeys);
    }

    for (const [_, keyObj] of keysMap) {
      let cleanKey = keyObj.value;
      if (cleanKey.startsWith('@')) {
        cleanKey = cleanKey.substring(1);
      }
      if (!cleanKey) continue;
      
      const escaped = cleanKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // A. Check for prefixed mention (e.g., @hannd, @Hân) - 100% safe
      let patternWithAt = '@' + escaped;
      if (/[a-z0-9_]$/i.test(cleanKey)) {
        patternWithAt = patternWithAt + '(?![a-z0-9_])';
      }
      const regexWithAt = new RegExp(patternWithAt, 'i');
      const matchedWithAt = regexWithAt.test(normMessage);
      if (isTargetMessage) {
        console.log(`[ChatOps Ext Debug] -> Checking prefix: key="${cleanKey}", pattern="${patternWithAt}", matched=${matchedWithAt}`);
      }
      if (matchedWithAt) {
        if (isTargetMessage) console.log(`[ChatOps Ext Debug] -> MATCHED on prefix!`);
        return true;
      }
      
      // B. Check for standalone word matching (only if allowed and length >= 2)
      if (keyObj.allowStandalone && cleanKey.length >= 2) {
        let pattern = escaped;
        if (/^[a-z0-9_]/i.test(cleanKey)) {
          pattern = '(?<![a-z0-9_])' + pattern;
        }
        if (/[a-z0-9_]$/i.test(cleanKey)) {
          pattern = pattern + '(?![a-z0-9_])';
        }
        
        // Apply compound filters if available
        const filter = compoundFilters[cleanKey];
        if (filter) {
          if (filter.lookahead && filter.lookahead.length > 0) {
            const laPatterns = filter.lookahead.map(la => stripAccents(la.toLowerCase())).join('|');
            pattern = pattern + `(?!${laPatterns})`;
          }
          if (filter.lookbehind && filter.lookbehind.length > 0) {
            const lbPatterns = filter.lookbehind.map(lb => stripAccents(lb.toLowerCase())).join('|');
            pattern = `(?<!${lbPatterns})` + pattern;
          }
        }
        
        const regex = new RegExp(pattern, 'i');
        const matchedStandalone = regex.test(normMessage);
        if (isTargetMessage) {
          console.log(`[ChatOps Ext Debug] -> Checking standalone: key="${cleanKey}", pattern="${pattern}", matched=${matchedStandalone}`);
        }
        if (matchedStandalone) {
          if (isTargetMessage) console.log(`[ChatOps Ext Debug] -> MATCHED on standalone!`);
          return true;
        }
      }
    }
  }
  
  const lowerMessage = message.toLowerCase();
  if (here && lowerMessage.includes('@here')) return true;
  if (channelFlag && (lowerMessage.includes('@all') || lowerMessage.includes('@channel'))) return true;
  return false;
}

export function reRender() {
  if (scannedResults && scannedResults.length > 0) {
    renderScannedMentions(false);
  }
}
