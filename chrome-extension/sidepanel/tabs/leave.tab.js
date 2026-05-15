/**
 * Leave Tracker Tab Module — ChatOps Chrome Extension
 */

import { 
  getUserByEmail, 
  getChannelPosts, 
  getChannelByName, 
  getUsers, 
  searchUsers, 
  getMyChannels, 
  searchChannels, 
  getUsersByIds 
} from '../../src/api/index.js';
import { setupMultiSelect } from '../multiselect.js';
import { setupAutocomplete } from '../autocomplete.js';
import { 
  renderUserCard, 
  renderChannelCard, 
  renderLeaveItem, 
  getChannelLabel,
  makePermalinkSync, 
  escapeHtml,
  parseFlexibleDate, 
  toUnixMs, 
  getLastWeekRange, 
  formatUnixMsToVN,
  showLoading, 
  showError 
} from '../../src/utils/index.js';
import { LEAVE_KEYWORDS, CHATOPS_CONFIG } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;
let leaveState = { 
  channels: [], 
  currentChannelIdx: 0, 
  beforeId: undefined, 
  user: null, 
  fromMs: 0, 
  toMs: 0, 
  hasMore: false, 
  isLoading: false, 
  postsCache: [] 
};

let leaveChannelMS = null;
let leaveUserAC = null;

/**
 * Initializes the Leave Tracker tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;
  const resultsEl = document.getElementById('spLeaveResults');

  // Event Listeners
  document.getElementById('btnSpSearchLeave').addEventListener('click', () => searchLeave(false));

  // Quick Date Presets
  const setDatesAndSearch = (daysBack) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - daysBack);
    
    document.getElementById('spLeaveTo').value = to.toISOString().split('T')[0];
    document.getElementById('spLeaveFrom').value = from.toISOString().split('T')[0];
    
    document.getElementById('spLeaveTo').dispatchEvent(new Event('change', { bubbles: true }));
    searchLeave(false);
  };

  document.getElementById('btnPresetToday')?.addEventListener('click', () => setDatesAndSearch(0));
  document.getElementById('btnPresetWeek')?.addEventListener('click', () => setDatesAndSearch(7));
  document.getElementById('btnPresetMonth')?.addEventListener('click', () => setDatesAndSearch(30));

  // Initialize Smart Selects
  const getTeamId = () => _state.getTeam()?.id;

  leaveUserAC = setupAutocomplete(
    'spLeaveUser',
    {
      defaultFetch: async (page, perPage) => getUsers(page, perPage, getTeamId()),
      searchFetch: async (term) => searchUsers(term, getTeamId())
    },
    (user) => renderUserCard(user),
    (user) => user.email || user.username
  );

  const enrichChannels = async (channels) => {
    const me = _state.getUser();
    if (!me || !channels?.length) return channels;

    const dmChannels = channels.filter(c => c.type === 'D' || (c.name && c.name.includes('__')));
    if (!dmChannels.length) return channels;

    const otherUserIds = new Set();
    dmChannels.forEach(c => {
      const parts = c.name.split('__');
      const otherId = parts.find(id => id !== me.id);
      if (otherId) otherUserIds.add(otherId);
    });

    if (otherUserIds.size > 0) {
      try {
        const users = await getUsersByIds([...otherUserIds]);
        const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
        dmChannels.forEach(c => {
          const parts = c.name.split('__');
          const otherId = parts.find(id => id !== me.id);
          const user = usersMap[otherId];
          if (user) {
            c.display_name = (user.first_name || user.last_name) 
              ? `${user.first_name} ${user.last_name}`.trim() 
              : user.username;
          }
        });
      } catch (err) {
        console.warn('Failed to fetch DM usernames:', err);
      }
    }
    return channels;
  };

  leaveChannelMS = setupMultiSelect(
    'spLeaveChannel',
    {
      defaultFetch: async (page, perPage) => {
        const channels = await getMyChannels(getTeamId());
        const paginated = channels.slice(page * perPage, (page + 1) * perPage);
        return enrichChannels(paginated);
      },
      searchFetch: async (term) => {
        const channels = await searchChannels(getTeamId(), term);
        return enrichChannels(channels);
      }
    },
    (channel) => renderChannelCard(channel),
    (channel) => channel.id,
    (channel) => getChannelLabel(channel)
  );

  // Set default channel (e.g. CHECK.OFF.LATER)
  setTimeout(() => {
    const teamId = getTeamId();
    if (teamId) {
      getChannelByName(teamId, CHATOPS_CONFIG.LEAVE_CHANNEL)
        .then(channel => {
          if (leaveChannelMS && leaveChannelMS.getSelected().length === 0) {
            leaveChannelMS.setSelected([channel]);
          }
        })
        .catch(() => {});
    }
  }, 1000);
}

/**
 * Resets the UI state of the tab
 */
export function reset() {
  if (leaveChannelMS) leaveChannelMS.reset();
  if (leaveUserAC) leaveUserAC.reset();
  document.getElementById('spLeaveResults').innerHTML = `<div class="empty-state">${language.leaveEmptyState}</div>`;
}

export function getSelects() {
  return { leaveChannelMS, leaveUserAC };
}

/**
 * Searches for leave request posts
 * @param {boolean} isLoadMore 
 */
export async function searchLeave(isLoadMore = false) {
  if (leaveState.isLoading) return;
  const resultsEl = document.getElementById('spLeaveResults');

  if (!isLoadMore) {
    const userEmail = document.getElementById('spLeaveUser').value.trim();
    const dateFrom = document.getElementById('spLeaveFrom').value;
    const dateTo = document.getElementById('spLeaveTo').value;
    const channels = leaveChannelMS ? leaveChannelMS.getSelected() : [];

    if (channels.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">${language.selectChannelRequired}</div>`;
      return;
    }

    showLoading(resultsEl, language.searching);

    let user = null;
    if (userEmail) {
      const email = userEmail.includes('@') ? userEmail : `${userEmail}@${CHATOPS_CONFIG.EMAIL_DOMAIN}`;
      try {
        user = await getUserByEmail(email);
      } catch (err) {
        showError(resultsEl, language.userNotFound.replace('{email}', email));
        return;
      }
    }

    const lastWeek = getLastWeekRange();
    const fromDate = dateFrom ? parseFlexibleDate(dateFrom) : lastWeek.from;
    const toDate = dateTo ? parseFlexibleDate(dateTo) : lastWeek.to;

    if (!fromDate || !toDate) {
      showError(resultsEl, language.invalidDate);
      return;
    }

    toDate.setHours(23, 59, 59, 999);
    
    leaveState = {
      channels,
      currentChannelIdx: 0,
      beforeId: undefined,
      user,
      fromMs: toUnixMs(fromDate),
      toMs: toUnixMs(toDate),
      hasMore: true,
      isLoading: true,
      postsCache: []
    };
  } else {
    leaveState.isLoading = true;
    const btn = document.getElementById('btnLoadMoreLeave');
    if (btn) btn.innerHTML = `<span class="spinner"></span> ${language.loading}`;
  }

  try {
    const team = _state.getTeam();
    const config = _state.getConfig();
    let matchingPosts = [];
    
    // Batch processing channels until enough results are found or all channels scanned
    while (matchingPosts.length < UI_CONFIG.MAX_SCAN_RESULTS && leaveState.currentChannelIdx < leaveState.channels.length) {
      const channel = leaveState.channels[leaveState.currentChannelIdx];
      const result = await getChannelPosts(channel.id, {
        per_page: 100,
        before: leaveState.beforeId
      });
      
      const posts = result.order.map((id) => result.posts[id]).filter(Boolean);
      if (posts.length === 0) {
        leaveState.currentChannelIdx++;
        leaveState.beforeId = undefined;
        continue;
      }

      leaveState.beforeId = posts[posts.length - 1].id;

      let reachedStart = false;
      for (const p of posts) {
        if (p.create_at < leaveState.fromMs) {
          reachedStart = true;
          break;
        }
        if (p.create_at <= leaveState.toMs) {
          if (leaveState.user && p.user_id !== leaveState.user.id) continue;
          
          const lower = p.message.toLowerCase();
          if (LEAVE_KEYWORDS.some(kw => lower.includes(kw))) {
            p._channelName = channel.display_name || channel.name;
            matchingPosts.push(p);
          }
        }
      }

      if (reachedStart || posts.length < 100) {
        leaveState.currentChannelIdx++;
        leaveState.beforeId = undefined;
      }
    }

    if (leaveState.currentChannelIdx >= leaveState.channels.length) {
      leaveState.hasMore = false;
    }
    
    leaveState.postsCache.push(...matchingPosts);

    if (!isLoadMore && matchingPosts.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">🔍 ${language.noLeaveRequests} ${leaveState.user ? `cho @${leaveState.user.username}` : ''}</div>`;
      leaveState.isLoading = false;
      return;
    }

    if (matchingPosts.length === 0) {
      document.getElementById('btnLoadMoreLeave')?.remove();
      leaveState.isLoading = false;
      return;
    }

    const userIds = [...new Set(matchingPosts.map((p) => p.user_id))];
    const users = await getUsersByIds(userIds);
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const html = matchingPosts.map((post) => {
      const u = usersMap[post.user_id];
      const permalink = makePermalinkSync(post.id, config.chatopsUrl, team.name);
      return renderLeaveItem(post, u, permalink);
    }).join('');

    if (!isLoadMore) {
      resultsEl.innerHTML = `
        <div class="result-count" id="leaveResultCount">📋 ${language.foundMessages.replace('{count}', leaveState.postsCache.length)}</div>
        <div id="leavePostList">${html}</div>
      `;
    } else {
      document.getElementById('leavePostList').insertAdjacentHTML('beforeend', html);
      const countEl = document.getElementById('leaveResultCount');
      if (countEl) countEl.innerHTML = `📋 ${language.foundMessages.replace('{count}', leaveState.postsCache.length)}`;
      document.getElementById('btnLoadMoreLeave')?.remove();
    }

    if (leaveState.hasMore) {
      resultsEl.insertAdjacentHTML('beforeend', `<div class="loading-state" id="btnLoadMoreLeave"><span class="spinner"></span> ${language.loadingMore}</div>`);
    }

  } catch (err) {
    if (!isLoadMore) showError(resultsEl, err.message);
  } finally {
    leaveState.isLoading = false;
  }
}
