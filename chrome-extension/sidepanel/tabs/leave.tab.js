/**
 * Leave Tracker Tab Module — ChatOps Chrome Extension
 */

import { getUserByEmail } from '../../src/api/users.js';
import { getChannelPosts } from '../../src/api/posts.js';
import { getChannelByName } from '../../src/api/channels.js';
import { setupMultiSelect } from '../multiselect.js';
import { setupAutocomplete } from '../autocomplete.js';
import { 
  renderUserCard, 
  renderChannelCard, 
  renderLeaveItem, 
  makePermalinkSync, 
  escapeHtml 
} from '../../src/utils/formatter.js';
import { 
  parseFlexibleDate, 
  toUnixMs, 
  getLastWeekRange, 
  formatUnixMsToVN 
} from '../../src/utils/date.js';
import { getUsers } from '../../src/api/users.js';
import { searchUsers } from '../../src/api/users.js';
import { getMyChannels } from '../../src/api/channels.js';
import { searchChannels } from '../../src/api/channels.js';
import { getUsersByIds } from '../../src/api/users.js';
import { showLoading, showError } from '../../src/utils/ui.js';
import { LEAVE_KEYWORDS, DEFAULTS } from '../../src/constants.js';

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

export function setup(state) {
  _state = state;
  const resultsEl = document.getElementById('spLeaveResults');

  // Event Listeners
  document.getElementById('btnSpSearchLeave').addEventListener('click', () => searchLeave(false));

  // Quick Actions
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

  // Smart Selects
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

  leaveChannelMS = setupMultiSelect(
    'spLeaveChannel',
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

  // Default channel
  setTimeout(() => {
    const teamId = getTeamId();
    if (teamId) {
      getChannelByName(teamId, DEFAULTS.LEAVE_CHANNEL)
        .then(channel => {
          if (leaveChannelMS && leaveChannelMS.getSelected().length === 0) {
            leaveChannelMS.setSelected([channel]);
          }
        })
        .catch(() => {});
    }
  }, 1000);
}

export function reset() {
  if (leaveChannelMS) leaveChannelMS.reset();
  if (leaveUserAC) leaveUserAC.reset();
  document.getElementById('spLeaveResults').innerHTML = '<div class="empty-state">Nhập thông tin và nhấn tra cứu</div>';
}

export function getSelects() {
  return { leaveChannelMS, leaveUserAC };
}

export async function searchLeave(isLoadMore = false) {
  if (leaveState.isLoading) return;
  const resultsEl = document.getElementById('spLeaveResults');

  if (!isLoadMore) {
    const userEmail = document.getElementById('spLeaveUser').value.trim();
    const dateFrom = document.getElementById('spLeaveFrom').value;
    const dateTo = document.getElementById('spLeaveTo').value;
    const channels = leaveChannelMS ? leaveChannelMS.getSelected() : [];

    if (channels.length === 0) {
      resultsEl.innerHTML = '<div class="empty-state">Vui lòng chọn ít nhất 1 channel (vd: CHECK.OFF.LATER)</div>';
      return;
    }

    showLoading(resultsEl, 'Đang tra cứu...');

    let user = null;
    if (userEmail) {
      const email = userEmail.includes('@') ? userEmail : `${userEmail}@runsystem.net`;
      try {
        user = await getUserByEmail(email);
      } catch (err) {
        showError(resultsEl, `Không tìm thấy user với email: ${escapeHtml(email)}`);
        return;
      }
    }

    const lastWeek = getLastWeekRange();
    const fromDate = dateFrom ? parseFlexibleDate(dateFrom) : lastWeek.from;
    const toDate = dateTo ? parseFlexibleDate(dateTo) : lastWeek.to;

    if (!fromDate || !toDate) {
      showError(resultsEl, 'Định dạng ngày không hợp lệ');
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
    if (btn) btn.innerHTML = '<span class="spinner"></span> Đang tải...';
  }

  try {
    const team = _state.getTeam();
    const config = _state.getConfig();
    let matchingPosts = [];
    
    while (matchingPosts.length < 20 && leaveState.currentChannelIdx < leaveState.channels.length) {
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
      resultsEl.innerHTML = `<div class="empty-state">🔍 Không tìm thấy tin nhắn xin trễ/nghỉ nào ${leaveState.user ? `của @${leaveState.user.username}` : 'trong khoảng thời gian này'}</div>`;
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
        <div class="result-count" id="leaveResultCount">📋 Đã tìm thấy ${leaveState.postsCache.length} tin nhắn</div>
        <div id="leavePostList">${html}</div>
      `;
    } else {
      document.getElementById('leavePostList').insertAdjacentHTML('beforeend', html);
      const countEl = document.getElementById('leaveResultCount');
      if (countEl) countEl.innerHTML = `📋 Đã tìm thấy ${leaveState.postsCache.length} tin nhắn`;
      document.getElementById('btnLoadMoreLeave')?.remove();
    }

    if (leaveState.hasMore) {
      resultsEl.insertAdjacentHTML('beforeend', `<div class="loading-state" id="btnLoadMoreLeave"><span class="spinner"></span> Đang tải thêm...</div>`);
    }

  } catch (err) {
    if (!isLoadMore) showError(resultsEl, err.message);
  } finally {
    leaveState.isLoading = false;
  }
}
