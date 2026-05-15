/**
 * Search Tab Module — ChatOps Chrome Extension
 */

import { 
  searchPosts, 
  getUsers, 
  searchUsers, 
  getChannelById, 
  getMyChannels, 
  searchChannels, 
  getUsersByIds 
} from '../../src/api/index.js';
import { setupAutocomplete } from '../autocomplete.js';
import { setupMultiSelect } from '../multiselect.js';
import { 
  renderPostList,
  renderUserCard, 
  renderChannelCard, 
  getChannelLabel,
  escapeHtml,
  showLoading, 
  showError 
} from '../../src/utils/index.js';
import { UI_CONFIG } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;
let searchState = { page: 0, hasMore: false, terms: '', isSearching: false };
let searchInMS = null;
let searchFromAC = null;

/**
 * Initializes the Search Tab
 * @param {Object} state - Centralized state module
 */
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

  searchInMS = setupMultiSelect(
    'spSearchIn',
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

  // Implement infinite scroll for search results
  document.getElementById('spSearchResults').addEventListener('scroll', (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      if (searchState.hasMore && !searchState.isSearching) {
        performSpSearch(true);
      }
    }
  });
}

/**
 * Resets the UI state of the tab
 */
export function reset() {
  if (searchInMS) searchInMS.reset();
  if (searchFromAC) searchFromAC.reset();
  document.getElementById('spSearchResults').innerHTML = `<div class="empty-state">${language.searchEmptyState}</div>`;
}

export function getSelects() {
  return { searchInMS, searchFromAC };
}

/**
 * Executes a post search based on UI criteria
 * @param {boolean} isLoadMore 
 */
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
      resultsEl.innerHTML = `<div class="empty-state">${language.searchCriteriaRequired}</div>`;
      return;
    }

    // Build the search query string
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
    showLoading(resultsEl, language.searching);
  } else {
    const btn = document.getElementById('btnLoadMoreSearch');
    if (btn) btn.innerHTML = `<span class="spinner"></span> ${language.loading}`;
  }

  searchState.isSearching = true;

  try {
    const team = _state.getTeam();
    const config = _state.getConfig();
    const result = await searchPosts(team.id, {
      terms: searchState.terms,
      is_or_search: false,
      page: searchState.page,
      per_page: UI_CONFIG.SEARCH_PAGE_SIZE
    });

    const posts = result.order.map((id) => result.posts[id]).filter(Boolean);
    
    if (posts.length < UI_CONFIG.SEARCH_PAGE_SIZE) searchState.hasMore = false;
    searchState.page++;

    if (!isLoadMore && posts.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">${language.noResults}</div>`;
      searchState.isSearching = false;
      return;
    }

    // Fetch related authors and channels info
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
        <div class="result-count">${language.resultsFor}: "${escapeHtml(searchState.terms)}"</div>
        <div id="searchPostList">${html}</div>
      `;
    } else {
      document.getElementById('searchPostList').insertAdjacentHTML('beforeend', html);
      document.getElementById('btnLoadMoreSearch')?.remove();
    }

    if (searchState.hasMore) {
      resultsEl.insertAdjacentHTML('beforeend', `<div class="loading-state" id="btnLoadMoreSearch"><span class="spinner"></span> ${language.loadingMore}</div>`);
    }

  } catch (err) {
    if (!isLoadMore) showError(resultsEl, err.message);
  } finally {
    searchState.isSearching = false;
  }
}
