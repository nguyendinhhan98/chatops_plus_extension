/**
 * Side Panel Logic — ChatOps Chrome Extension
 *
 * Full-featured panel with tabs:
 * - Search: Tìm kiếm posts với filters
 * - Channels: Duyệt channels, xem posts
 * - Users: Tìm kiếm users
 * - Mentions: Kiểm tra mention bị bỏ lỡ (deep scan)
 * - Leave: Tra cứu xin trễ/nghỉ
 */

import { getMyProfile, searchUsers, getUsersByIds, getUserByEmail, getUsers } from '../src/api/users.js';
import { searchChannels, getChannelById, getChannelByName, getMyChannelMembers, getPublicChannels, getMyChannels } from '../src/api/channels.js';
import { setupAutocomplete } from './autocomplete.js';
import { setupMultiSelect } from './multiselect.js';
import {
  searchPosts,
  getChannelPosts,
  getPostThread,
  getPostReactions,
} from '../src/api/posts.js';
import { getTeamByName, getMyTeams } from '../src/api/teams.js';
import { getConfig } from '../src/api/client.js';
import {
  formatUnixMsToVN,
  formatRelativeTime,
  parseFlexibleDate,
  toUnixMs,
  getLastWeekRange,
} from '../src/utils/date.js';
import {
  formatUserDisplayName,
  formatChannelLabel,
  escapeHtml,
  renderUserCard,
  renderChannelCard,
  renderPostList,
  makePermalinkSync,
} from '../src/utils/formatter.js';

// ─── State ───
let currentUser = null;
let cachedConfig = null;
let currentTeam = null;
let searchInMS = null;
let searchFromAC = null;
let leaveChannelMS = null;
let leaveUserAC = null;
let mentionChannelMS = null;

let searchState = { page: 0, hasMore: false, terms: '', isSearching: false };
let leaveState = { channels: [], currentChannelIdx: 0, beforeId: undefined, user: null, fromMs: 0, toMs: 0, hasMore: false, isLoading: false, postsCache: [] };

// ─── Init ───
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const selectEl = document.getElementById('spWorkspaceSelect');

  try {
    // Timeout 10s để phát hiện nếu API treo
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: Không thể kết nối — Kiểm tra Cookie trong Settings')), 10000)
    );

    const initPromise = async () => {
      cachedConfig = await getConfig();
      currentUser = await getMyProfile();
      const teams = await getMyTeams();
      await setupWorkspaceSelector(teams);
      chrome.runtime.sendMessage({ type: 'SIDE_PANEL_STATE', state: 'OPEN' });
    };

    await Promise.race([initPromise(), timeoutPromise]);
  } catch (err) {
    console.error('[ChatOps Ext] Init failed:', err);
    if (selectEl) {
      const opt = document.createElement('option');
      opt.value = "";
      opt.textContent = `❌ ${err.message}`;
      selectEl.innerHTML = '';
      selectEl.appendChild(opt);
      selectEl.style.color = '#ef4444';
      selectEl.style.fontSize = '11px';
    }
  }

  setupTabs();
  setupSearch();
  setupSmartSelects();
  setupMentions();
  setupLeave();
  setupMemo();
  setupState();

  // Check if opened with a specific tab
  chrome.storage.local.get(['sidePanelTab'], (result) => {
    if (result.sidePanelTab) {
      switchTab(result.sidePanelTab);
      chrome.storage.local.remove('sidePanelTab');
    }
  });

  // Infinite Scroll Listener for Search
  document.getElementById('spSearchResults').addEventListener('scroll', (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      if (searchState.hasMore && !searchState.isSearching) {
        performSpSearch(true);
      }
    }
  });

  // Infinite Scroll Listener for Leave Tracker
  document.getElementById('spLeaveResults').addEventListener('scroll', (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      if (leaveState.hasMore && !leaveState.isLoading) {
        searchLeave(true);
      }
    }
  });

  // Global click listener cho .post-link để mở thẳng trong tab hiện tại
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.post-link');
    if (link) {
      e.preventDefault();
      const url = link.href;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('chat.runsystem.vn')) {
          chrome.tabs.update(tabs[0].id, { url });
        } else {
          chrome.tabs.create({ url });
        }
      });
    }
  });

  window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: 'SIDE_PANEL_STATE', state: 'CLOSED' });
  });

  // Lắng nghe yêu cầu kiểm tra trạng thái từ background hoặc signal cập nhật memo
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING_SIDE_PANEL') {
      sendResponse({ open: true });
    } else if (message.type === 'MEMO_UPDATED') {
      if (typeof loadMemos === 'function') loadMemos();
    }
  });
}

// ─── Workspace Selector ───
async function setupWorkspaceSelector(teams) {
  const select = document.getElementById('spWorkspaceSelect');
  if (!teams || teams.length === 0) {
    select.innerHTML = '<option value="">Không có Workspace</option>';
    return;
  }

  select.innerHTML = teams.map(t => `<option value="${t.id}">${escapeHtml(t.display_name)}</option>`).join('');

  // Lấy workspace đã lưu trước đó, hoặc default config
  const saved = await new Promise(r => chrome.storage.local.get(['spCurrentTeamId'], r));
  let defaultTeam = teams.find(t => t.id === saved.spCurrentTeamId);
  
  if (!defaultTeam && cachedConfig.teamName) {
    defaultTeam = teams.find(t => t.name === cachedConfig.teamName);
  }
  
  currentTeam = defaultTeam || teams[0];
  select.value = currentTeam.id;

  select.addEventListener('change', (e) => {
    const teamId = e.target.value;
    currentTeam = teams.find(t => t.id === teamId);
    chrome.storage.local.set({ spCurrentTeamId: teamId });
    resetDataOnWorkspaceChange();
  });
}

function resetDataOnWorkspaceChange() {
  if (searchInMS) searchInMS.reset();
  if (searchFromAC) searchFromAC.reset();
  if (leaveChannelMS) leaveChannelMS.reset();
  if (leaveUserAC) leaveUserAC.reset();
  if (mentionChannelMS) mentionChannelMS.reset();
  
  document.getElementById('spSearchResults').innerHTML = '<div class="empty-state">Nhập từ khóa và nhấn tìm kiếm</div>';
  document.getElementById('spLeaveResults').innerHTML = '<div class="empty-state">Nhập thông tin và nhấn tra cứu</div>';
  document.getElementById('spMentionResults').innerHTML = '<div class="empty-state">Click "Quét mentions" để bắt đầu</div>';

  // Re-fetch default channel for Leave tracker in the new team
  getChannelByName(currentTeam.id, 'check.off.later')
    .then(channel => {
      if (leaveChannelMS) leaveChannelMS.setSelected([channel]);
    })
    .catch(() => {});
}

// ─── Tab Routing ───
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });
}

function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  // Update tab content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
}

// ─── State Management ───
function setupState() {
  restoreState();
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('change', saveState);
    input.addEventListener('input', saveState);
  });
}

function saveState() {
    const state = {
    search: {
      terms: document.getElementById('spSearchTerms')?.value || '',
      from: document.getElementById('spSearchFrom')?.value || '',
      inChannels: searchInMS ? searchInMS.getSelected() : [],
      after: document.getElementById('spSearchAfter')?.value || '',
      before: document.getElementById('spSearchBefore')?.value || '',
    },
    mentions: {
      hours: document.getElementById('spMentionHours')?.value || '24',
      direct: document.getElementById('spMentionDirect')?.checked !== false,
      here: document.getElementById('spMentionHere')?.checked || false,
      channel: document.getElementById('spMentionChannel')?.checked || false,
      channels: mentionChannelMS ? mentionChannelMS.getSelected() : []
    },
    leave: {
      user: document.getElementById('spLeaveUser')?.value || '',
      channels: leaveChannelMS ? leaveChannelMS.getSelected() : [],
      from: document.getElementById('spLeaveFrom')?.value || '',
      to: document.getElementById('spLeaveTo')?.value || '',
    }
  };
  chrome.storage.local.set({ spState: state });
}

function restoreState() {
  chrome.storage.local.get(['spState'], (res) => {
    if (!res.spState) return;
    const s = res.spState;
    if (s.search && document.getElementById('spSearchTerms')) {
      document.getElementById('spSearchTerms').value = s.search.terms || '';
      document.getElementById('spSearchFrom').value = s.search.from || '';
      document.getElementById('spSearchIn').value = s.search.in || '';
      document.getElementById('spSearchAfter').value = s.search.after || '';
      document.getElementById('spSearchBefore').value = s.search.before || '';
    }
    if (s.mentions && document.getElementById('spMentionHours')) {
      document.getElementById('spMentionHours').value = s.mentions.hours || '24';
      if (s.mentions.direct !== undefined) document.getElementById('spMentionDirect').checked = s.mentions.direct;
      if (s.mentions.here !== undefined) document.getElementById('spMentionHere').checked = s.mentions.here;
      if (s.mentions.channel !== undefined) document.getElementById('spMentionChannel').checked = s.mentions.channel;
      if (s.mentions.channels && mentionChannelMS) mentionChannelMS.setSelected(s.mentions.channels);
    }
    if (s.leave && document.getElementById('spLeaveUser')) {
      document.getElementById('spLeaveUser').value = s.leave.user || '';
      document.getElementById('spLeaveFrom').value = s.leave.from || '';
      document.getElementById('spLeaveTo').value = s.leave.to || '';
      if (s.leave.channels && leaveChannelMS) leaveChannelMS.setSelected(s.leave.channels);
    }
    if (s.search && s.search.inChannels && searchInMS) {
      searchInMS.setSelected(s.search.inChannels);
    }
  });
}

// ─── Search Tab ───
function setupSearch() {
  const btnSearch = document.getElementById('btnSpSearch');
  const termsInput = document.getElementById('spSearchTerms');

  btnSearch.addEventListener('click', () => performSpSearch(false));
  termsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSpSearch(false);
  });
}

async function performSpSearch(isLoadMore = false) {
  if (searchState.isSearching) return;
  const resultsEl = document.getElementById('spSearchResults');

  if (!isLoadMore) {
    const terms = document.getElementById('spSearchTerms').value.trim();
    const from = document.getElementById('spSearchFrom').value.trim();
    const inChannels = searchInMS ? searchInMS.getSelected() : [];
    const after = document.getElementById('spSearchAfter').value;
    const before = document.getElementById('spSearchBefore').value;

    if (!terms && !from && inChannels.length === 0) {
      resultsEl.innerHTML = '<div class="empty-state">Vui lòng nhập ít nhất 1 tiêu chí tìm kiếm</div>';
      return;
    }

    let searchTerms = terms;
    if (from) searchTerms += ` from:${from}`;
    if (inChannels.length > 0) {
      searchTerms += inChannels.map(c => ` in:${c.name}`).join('');
    }
    if (after) searchTerms += ` after:${after}`;
    if (before) searchTerms += ` before:${before}`;

    searchState.terms = searchTerms.trim();
    searchState.page = 0;
    searchState.hasMore = true;
    resultsEl.innerHTML = '<div class="loading-state"><span class="spinner"></span> Đang tìm kiếm...</div>';
  } else {
    const btn = document.getElementById('btnLoadMoreSearch');
    if (btn) btn.innerHTML = '<span class="spinner"></span> Đang tải...';
  }

  searchState.isSearching = true;

  try {
    const team = currentTeam;
    const result = await searchPosts(team.id, {
      terms: searchState.terms,
      is_or_search: false,
      page: searchState.page,
      per_page: 20
    });

    const posts = result.order.map((id) => result.posts[id]).filter(Boolean);
    
    if (posts.length < 20) searchState.hasMore = false;
    searchState.page++;

    if (!isLoadMore && posts.length === 0) {
      resultsEl.innerHTML = '<div class="empty-state">Không tìm thấy kết quả nào</div>';
      searchState.isSearching = false;
      return;
    }

    const userIds = [...new Set(posts.map((p) => p.user_id))];
    const users = await getUsersByIds(userIds);
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const channelIds = [...new Set(posts.map((p) => p.channel_id))];
    const channelsMap = {};
    await Promise.all(
      channelIds.map(async (cid) => {
        try { channelsMap[cid] = await getChannelById(cid); } catch {}
      })
    );

    const html = renderPostList(posts, usersMap, cachedConfig.chatopsUrl, currentTeam.name, channelsMap);
    
    if (!isLoadMore) {
      resultsEl.innerHTML = `
        <div class="result-count">📋 Kết quả cho: "${escapeHtml(searchState.terms)}"</div>
        <div id="searchPostList">${html}</div>
      `;
    } else {
      document.getElementById('searchPostList').insertAdjacentHTML('beforeend', html);
      const oldBtn = document.getElementById('btnLoadMoreSearch');
      if (oldBtn) oldBtn.remove();
    }

    if (searchState.hasMore) {
      resultsEl.insertAdjacentHTML('beforeend', `<div class="loading-state" id="btnLoadMoreSearch"><span class="spinner"></span> Đang tải thêm...</div>`);
    }

  } catch (err) {
    if (!isLoadMore) resultsEl.innerHTML = `<div class="empty-state" style="color:var(--error)">❌ ${escapeHtml(err.message)}</div>`;
  } finally {
    searchState.isSearching = false;
  }
}

// ─── Smart Selects (Autocomplete & MultiSelect) ───
function setupSmartSelects() {
  const getTeamId = async () => {
    return currentTeam ? currentTeam.id : null;
  };

  // Tìm tin nhắn từ ai (trả về username)
  searchFromAC = setupAutocomplete(
    'spSearchFrom',
    {
      defaultFetch: async (page, perPage) => getUsers(page, perPage, await getTeamId()),
      searchFetch: async (term) => searchUsers(term, await getTeamId())
    },
    (user) => renderUserCard(user),
    (user) => user.username
  );

  // Tìm tin nhắn trong channel (MultiSelect)
  searchInMS = setupMultiSelect(
    'spSearchIn',
    {
      defaultFetch: async (page, perPage) => {
        const channels = await getMyChannels(await getTeamId());
        return channels.slice(page * perPage, (page + 1) * perPage);
      },
      searchFetch: async (term) => searchChannels(await getTeamId(), term)
    },
    (channel) => renderChannelCard(channel),
    (channel) => channel.id,
    (channel) => channel.name
  );

  // Tìm form xin nghỉ của ai (trả về email)
  leaveUserAC = setupAutocomplete(
    'spLeaveUser',
    {
      defaultFetch: async (page, perPage) => getUsers(page, perPage, await getTeamId()),
      searchFetch: async (term) => searchUsers(term, await getTeamId())
    },
    (user) => renderUserCard(user),
    (user) => user.email || user.username
  );

  // Tìm form xin nghỉ trong channel (MultiSelect)
  leaveChannelMS = setupMultiSelect(
    'spLeaveChannel',
    {
      defaultFetch: async (page, perPage) => {
        const channels = await getMyChannels(await getTeamId());
        return channels.slice(page * perPage, (page + 1) * perPage);
      },
      searchFetch: async (term) => searchChannels(await getTeamId(), term)
    },
    (channel) => renderChannelCard(channel),
    (channel) => channel.id,
    (channel) => channel.name
  );

  // Set default for Leave Channel after setup
  getTeamId()
    .then(teamId => getChannelByName(teamId, 'check.off.later'))
    .then(channel => {
      if (leaveChannelMS && leaveChannelMS.getSelected().length === 0) {
        leaveChannelMS.setSelected([channel]);
      }
    })
    .catch(console.warn);

  // Chọn channel muốn kiểm tra mention riêng
  mentionChannelMS = setupMultiSelect(
    'spMentionChannelsMS',
    {
      defaultFetch: async (page, perPage) => {
        const channels = await getMyChannels(await getTeamId());
        return channels.slice(page * perPage, (page + 1) * perPage);
      },
      searchFetch: async (term) => searchChannels(await getTeamId(), term)
    },
    (channel) => renderChannelCard(channel),
    (channel) => channel.id,
    (channel) => channel.name
  );
}

// ─── Mentions Tab ───
function setupMentions() {
  document.getElementById('btnSpScanMentions').addEventListener('click', scanMentionsDeep);
}

async function scanMentionsDeep() {
  if (!currentUser) {
    document.getElementById('spMentionResults').innerHTML =
      '<div class="empty-state" style="color:var(--error)">❌ Chưa kết nối. Kiểm tra Settings.</div>';
    return;
  }

  const hours = parseInt(document.getElementById('spMentionHours').value, 10);
  const direct = document.getElementById('spMentionDirect').checked;
  const here = document.getElementById('spMentionHere').checked;
  const channelFlag = document.getElementById('spMentionChannel').checked;
  const mentionChannels = mentionChannelMS ? mentionChannelMS.getSelected() : [];
  
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;
  const resultsEl = document.getElementById('spMentionResults');

  resultsEl.innerHTML = `
    <div class="progress-bar"><div class="progress-fill" id="mentionProgress" style="width:0%"></div></div>
    <div class="loading-state"><span class="spinner"></span> Đang quét channels...</div>
  `;

  try {
    const team = currentTeam;
    let targetChannels = [];
    if (mentionChannels.length > 0) {
      targetChannels = mentionChannels.map(c => ({ channel_id: c.id }));
    } else {
      targetChannels = await getMyChannelMembers(team.id);
    }

    const results = [];
    const BATCH_SIZE = 5;
    let processed = 0;

    for (let i = 0; i < targetChannels.length; i += BATCH_SIZE) {
      const batch = targetChannels.slice(i, i + BATCH_SIZE);
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

            // Check handled
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
              const channelLabel = channelInfo ? formatChannelLabel(channelInfo) : 'Unknown Channel';
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

    // Render
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
        const authorName = author ? formatUserDisplayName(author) : '(Unknown)';
        const permalink = makePermalinkSync(post.id, cachedConfig.chatopsUrl, currentTeam.name);

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
      }).join('');
      html += `</div>`;
    }

    resultsEl.innerHTML = html;
  } catch (err) {
    resultsEl.innerHTML = `<div class="empty-state" style="color:var(--error)">❌ ${escapeHtml(err.message)}</div>`;
  }
}

function hasMention(message, username, direct, here, channelFlag) {
  const lower = message.toLowerCase();
  if (direct && lower.includes(`@${username.toLowerCase()}`)) return true;
  if (here && lower.includes('@here')) return true;
  if (channelFlag && (lower.includes('@all') || lower.includes('@channel'))) return true;
  return false;
}


function setupLeave() {
  document.getElementById('btnSpSearchLeave').addEventListener('click', () => searchLeave(false));

  // Quick Actions
  const setDatesAndSearch = (daysBack) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - daysBack);
    
    // YYYY-MM-DD
    document.getElementById('spLeaveTo').value = to.toISOString().split('T')[0];
    document.getElementById('spLeaveFrom').value = from.toISOString().split('T')[0];
    
    // Save state and trigger search
    document.getElementById('spLeaveTo').dispatchEvent(new Event('change', { bubbles: true }));
    searchLeave(false);
  };

  const btnToday = document.getElementById('btnPresetToday');
  const btnWeek = document.getElementById('btnPresetWeek');
  const btnMonth = document.getElementById('btnPresetMonth');

  if (btnToday) btnToday.addEventListener('click', () => setDatesAndSearch(0));
  if (btnWeek) btnWeek.addEventListener('click', () => setDatesAndSearch(7));
  if (btnMonth) btnMonth.addEventListener('click', () => setDatesAndSearch(30));
}

async function searchLeave(isLoadMore = false) {
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

    resultsEl.innerHTML = '<div class="loading-state"><span class="spinner"></span> Đang tra cứu...</div>';

    let user = null;
    if (userEmail) {
      const email = userEmail.includes('@') ? userEmail : `${userEmail}@runsystem.net`;
      try {
        user = await getUserByEmail(email);
      } catch (err) {
        resultsEl.innerHTML = `<div class="empty-state" style="color:var(--error)">❌ Không tìm thấy user với email: ${escapeHtml(email)}</div>`;
        return;
      }
    }

    const lastWeek = getLastWeekRange();
    const fromDate = dateFrom ? parseFlexibleDate(dateFrom) : lastWeek.from;
    const toDate = dateTo ? parseFlexibleDate(dateTo) : lastWeek.to;

    if (!fromDate || !toDate) {
      resultsEl.innerHTML = '<div class="empty-state" style="color:var(--error)">❌ Định dạng ngày không hợp lệ</div>';
      return;
    }

    toDate.setHours(23, 59, 59, 999);
    const fromMs = toUnixMs(fromDate);
    const toMs = toUnixMs(toDate);

    leaveState = {
      channels,
      currentChannelIdx: 0,
      beforeId: undefined,
      user,
      fromMs,
      toMs,
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
    const team = currentTeam;
    const keywords = ['xin phép', 'đi trễ', 'về sớm', 'làm bù', 'có việc', 'xin nghỉ', 'nghỉ phép', 'nghỉ ốm', 'wfh', 'off', 'late'];
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
          if (keywords.some(kw => lower.includes(kw))) {
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
      const oldBtn = document.getElementById('btnLoadMoreLeave');
      if (oldBtn) oldBtn.remove();
      leaveState.isLoading = false;
      return;
    }

    // Render matchingPosts
    const userIds = [...new Set(matchingPosts.map((p) => p.user_id))];
    const users = await getUsersByIds(userIds);
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const html = matchingPosts.map((post) => {
      const u = usersMap[post.user_id];
      const author = u ? escapeHtml(u.username) : 'Unknown';
      const permalink = makePermalinkSync(post.id, cachedConfig.chatopsUrl, team.name);
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
      const oldBtn = document.getElementById('btnLoadMoreLeave');
      if (oldBtn) oldBtn.remove();
    }

    if (leaveState.hasMore) {
      resultsEl.insertAdjacentHTML('beforeend', `<div class="loading-state" id="btnLoadMoreLeave"><span class="spinner"></span> Đang tải thêm...</div>`);
    }

  } catch (err) {
    if (!isLoadMore) resultsEl.innerHTML = `<div class="empty-state" style="color:var(--error)">❌ ${escapeHtml(err.message)}</div>`;
  } finally {
    leaveState.isLoading = false;
  }
}

// ─── Memo Tab ───
function setupMemo() {
  const btnClearAll = document.getElementById('btnClearAllMemos');
  const memoList = document.getElementById('memoList');

  // Load memos initially
  loadMemos();

  btnClearAll.addEventListener('click', async () => {
    if (confirm('Bạn có chắc muốn xóa tất cả ghi chú không?')) {
      // Xóa tất cả alarms liên quan
      const res = await chrome.storage.local.get(['memos']);
      const memos = res.memos || [];
      memos.forEach(m => chrome.alarms.clear(m.id));
      
      await chrome.storage.local.set({ memos: [] });
      loadMemos();
    }
  });

  // Event delegation for delete buttons
  memoList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-delete-memo')) {
      const id = e.target.dataset.id;
      const res = await chrome.storage.local.get(['memos']);
      const memos = (res.memos || []).filter(m => m.id !== id);
      await chrome.storage.local.set({ memos });
      chrome.alarms.clear(id);
      loadMemos();
    }
  });

  // Refresh khi tab Memo được click
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'memo') {
      btn.addEventListener('click', loadMemos);
    }
  });
}

async function loadMemos() {
  const memoList = document.getElementById('memoList');
  if (!memoList) return;

  const res = await chrome.storage.local.get(['memos']);
  const allItems = res.memos || [];

  const tasks = allItems.filter(m => m.type === 'task');
  const notes = allItems.filter(m => m.type === 'note');

  if (allItems.length === 0) {
    memoList.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 40px; margin-bottom: 12px; opacity: 0.5;">📌</div>
        Chưa có dữ liệu.<br>Bấm nút 📌 trên tin nhắn để tạo Task hoặc Ghi chú.
      </div>`;
    return;
  }

  let html = '';

  // ─── Tasks Section ───
  if (tasks.length > 0) {
    const pendingCount = tasks.filter(t => !t.done).length;
    html += `<div class="memo-section-title">📋 Tasks ${pendingCount > 0 ? `(${pendingCount} chưa xong)` : ''}</div>`;
    html += tasks.map(task => {
      const isDone = task.done;
      const reminderTime = task.reminder ? new Date(task.reminder).getTime() : null;
      const reminderStr = reminderTime ? formatUnixMsToVN(reminderTime) : 'Lặp mỗi 5p';

      return `
        <div class="memo-item ${isDone ? 'memo-done' : ''}" id="item_${task.id}">
          <div class="memo-item-header">
            <label class="memo-checkbox-container">
              <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${isDone ? 'checked' : ''}>
              <span class="memo-checkmark-custom"></span>
            </label>
            <div class="memo-content">
              ${task.postText ? `<div class="memo-post-preview">"${escapeHtml(task.postText)}"</div>` : ''}
              <div class="memo-note-text">${escapeHtml(task.note || 'Không có nội dung')}</div>
            </div>
          </div>
          <div class="memo-footer">
            <div class="memo-meta">
              <span class="${!isDone ? 'reminder-active' : ''}">
                ${isDone ? '✅ Hoàn thành' : `⏰ ${reminderStr}`}
              </span>
            </div>
            <button class="btn-delete-memo" data-id="${task.id}" title="Xóa">×</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── Notes Section ───
  if (notes.length > 0) {
    html += `<div class="memo-section-title">📝 Ghi chú</div>`;
    html += notes.map(note => `
      <div class="memo-item" id="item_${note.id}">
        <div class="memo-content">
          ${note.postText ? `<div class="memo-post-preview">"${escapeHtml(note.postText)}"</div>` : ''}
          <div class="memo-note-text">${escapeHtml(note.note || 'Ghi chú trống')}</div>
        </div>
        <div class="memo-footer">
          <div class="memo-meta">
            <span>📅 ${formatUnixMsToVN(note.createdAt)}</span>
          </div>
          <button class="btn-delete-memo" data-id="${note.id}" title="Xóa">×</button>
        </div>
      </div>
    `).join('');
  }

  memoList.innerHTML = html;

  // Add event listeners for checkboxes
  memoList.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.id;
      const r = await chrome.storage.local.get(['memos']);
      const memos = r.memos || [];
      const task = memos.find(m => m.id === id);
      if (task) {
        task.done = cb.checked;
        task.doneAt = cb.checked ? Date.now() : null;
        await chrome.storage.local.set({ memos });
        if (cb.checked) {
          chrome.alarms.clear(id);
        } else {
          const nextTime = Date.now() + 5 * 60 * 1000;
          chrome.runtime.sendMessage({ type: 'SET_TASK_ALARM', taskId: id, time: nextTime });
        }
        loadMemos(); // Re-render to update UI state
      }
    });
  });

  // Re-attach delete listeners (they use event delegation in setupMemo, but for clarity...)
}
