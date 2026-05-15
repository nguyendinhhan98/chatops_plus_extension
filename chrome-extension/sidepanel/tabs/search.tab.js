/**
 * Search Tab Module — ChatOps Chrome Extension
 */

import { searchPosts } from '../../src/api/posts.js';
import { getUsersByIds, getUsers, searchUsers } from '../../src/api/users.js';
import { getChannelById, getMyChannels, searchChannels } from '../../src/api/channels.js';
import { setupAutocomplete } from '../autocomplete.js';
import { setupMultiSelect } from '../multiselect.js';
import { 
  renderPostList, 
  renderUserCard, 
  renderChannelCard, 
  escapeHtml 
} from '../../src/utils/formatter.js';
import { showLoading, showError } from '../../src/utils/ui.js';
import { SEARCH_PAGE_SIZE } from '../../src/constants.js';

let _state = null;
let searchState = { page: 0, hasMore: false, terms: '', isSearching: false };
let searchInMS = null;
let searchFromAC = null;

export function setup(state) {
  _state = state;
  const btnSearch = document.getElementById('btnSpSearch');
  const termsInput = document.getElementById('spSearchTerms');

  btnSearch.addEventListener('click', () => performSpSearch(false));
  termsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSpSearch(false);
  });

  const getTeamId = () => _state.getTeam()?.id;

  searchFromAC = setupAutocomplete(
    'spSearchFrom',
    {
      defaultFetch: async (page, perPage) => getUsers(page, perPage, getTeamId()),
      searchFetch: async (term) => searchUsers(term, getTeamId())
    },
    (user) => renderUserCard(user),
    (user) => user.username
  );

  searchInMS = setupMultiSelect(
    'spSearchIn',
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

  // Infinite Scroll
  document.getElementById('spSearchResults').addEventListener('scroll', (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      if (searchState.hasMore && !searchState.isSearching) {
        performSpSearch(true);
      }
    }
  });
}

export function reset() {
  if (searchInMS) searchInMS.reset();
  if (searchFromAC) searchFromAC.reset();
  document.getElementById('spSearchResults').innerHTML = '<div class="empty-state">Nhập từ khóa và nhấn tìm kiếm</div>';
}

export function getSelects() {
  return { searchInMS, searchFromAC };
}

export async function performSpSearch(isLoadMore = false) {
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
    showLoading(resultsEl, 'Đang tìm kiếm...');
  } else {
    const btn = document.getElementById('btnLoadMoreSearch');
    if (btn) btn.innerHTML = '<span class="spinner"></span> Đang tải...';
  }

  searchState.isSearching = true;

  try {
    const team = _state.getTeam();
    const config = _state.getConfig();
    const result = await searchPosts(team.id, {
      terms: searchState.terms,
      is_or_search: false,
      page: searchState.page,
      per_page: SEARCH_PAGE_SIZE
    });

    const posts = result.order.map((id) => result.posts[id]).filter(Boolean);
    
    if (posts.length < SEARCH_PAGE_SIZE) searchState.hasMore = false;
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

    const html = renderPostList(posts, usersMap, config.chatopsUrl, team.name, channelsMap);
    
    if (!isLoadMore) {
      resultsEl.innerHTML = `
        <div class="result-count">📋 Kết quả cho: "${escapeHtml(searchState.terms)}"</div>
        <div id="searchPostList">${html}</div>
      `;
    } else {
      document.getElementById('searchPostList').insertAdjacentHTML('beforeend', html);
      document.getElementById('btnLoadMoreSearch')?.remove();
    }

    if (searchState.hasMore) {
      resultsEl.insertAdjacentHTML('beforeend', `<div class="loading-state" id="btnLoadMoreSearch"><span class="spinner"></span> Đang tải thêm...</div>`);
    }

  } catch (err) {
    if (!isLoadMore) showError(resultsEl, err.message);
  } finally {
    searchState.isSearching = false;
  }
}
