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
  enrichChannels,
  filterChannels,
  escapeHtml,
  showLoading, 
  showError,
  initCommonFlatpickr
} from '../../src/utils/index.js';
import { UI_CONFIG } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;
let searchState = { page: 0, hasMore: false, terms: '', isSearching: false };
let searchInMS = null;
let searchFromAC = null;
let _joinedChannelsCache = null;

/**
 * Initializes the Search Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;
  const btnSearch = document.getElementById('btnSpSearch');
  const termsInput = document.getElementById('spSearchTerms');

  const updateSearchButtonState = () => {
    const hasText = termsInput.value.trim().length > 0;
    if (hasText) {
      btnSearch.disabled = false;
      btnSearch.style.opacity = '1';
      btnSearch.style.cursor = 'pointer';
    } else {
      btnSearch.disabled = true;
      btnSearch.style.opacity = '0.5';
      btnSearch.style.cursor = 'not-allowed';
    }
  };

  const btnClearSearch = document.getElementById('btnSpClearSearch');
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      termsInput.value = '';
      btnClearSearch.style.display = 'none';
      updateSearchButtonState();
      termsInput.focus();
      const resultsEl = document.getElementById('spSearchResults');
      if (resultsEl) resultsEl.innerHTML = `<div class="empty-state">${language.searchEmptyState}</div>`;
      searchState.terms = '';
    });
  }

  termsInput.addEventListener('input', () => {
    if (btnClearSearch) {
      btnClearSearch.style.display = termsInput.value.length > 0 ? 'block' : 'none';
    }
    updateSearchButtonState();
  });

  // Set initial state
  updateSearchButtonState();

  btnSearch.addEventListener('click', () => {
    if (termsInput.value.trim().length > 0) {
      performSpSearch(false);
    }
  });
  termsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && termsInput.value.trim().length > 0) {
      performSpSearch(false);
    }
  });

  // Toggle Collapse
  const btnToggle = document.getElementById('btnToggleSearch');
  const searchForm = document.getElementById('spSearchForm');
  if (btnToggle && searchForm) {
    btnToggle.addEventListener('click', () => {
      searchForm.classList.toggle('collapsed');
      btnToggle.classList.toggle('collapsed');
    });
  }

  // Include DM toggle - Clear cache to force re-fetch with new filter
  document.getElementById('chkSearchIncludeDM').addEventListener('change', () => {
    _joinedChannelsCache = null;
    if (searchInMS) searchInMS.reset();
  });

  const getTeamId = () => _state.getTeam()?.id;

  searchFromAC = setupAutocomplete(
    'spSearchFrom',
    {
      defaultFetch: async (page, perPage) => getUsers(page, perPage, getTeamId()),
      searchFetch: async (term) => searchUsers(term, getTeamId())
    },
    (user) => renderUserCard(user),
    (user) => {
      // Store the username for the search logic
      document.getElementById('spSearchFrom').dataset.username = user.username;
      // Return the full name for display
      const name = (user.first_name || user.last_name) 
        ? `${user.first_name} ${user.last_name}`.trim() 
        : user.username;
      return name;
    }
  );

  document.getElementById('spSearchFrom').addEventListener('input', (e) => {
    // If user types manually, clear the stored username
    delete e.target.dataset.username;
  });



  searchInMS = setupMultiSelect(
    'spSearchIn',
    {
      defaultFetch: async (page, perPage) => {
        const includeDM = document.getElementById('chkSearchIncludeDM').checked;
        if (!_joinedChannelsCache) {
          _joinedChannelsCache = await getMyChannels(getTeamId());
        }
        let filtered = filterChannels(_joinedChannelsCache, includeDM);
        const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
        return enrichChannels(paginated, _state.getUser());
      },
      searchFetch: async (term) => {
        const includeDM = document.getElementById('chkSearchIncludeDM').checked;
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

  // Implement infinite scroll for search results
  document.getElementById('spSearchResults').addEventListener('scroll', (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      if (searchState.hasMore && !searchState.isSearching) {
        performSpSearch(true);
      }
    }
  });

  // Initialize Flatpickr on Before/After search dates
  const afterInput = document.getElementById('spSearchAfter');
  const beforeInput = document.getElementById('spSearchBefore');
  if (afterInput) {
    initCommonFlatpickr(afterInput, {
      enableTime: false,
      dateFormat: "Y-m-d"
    });
  }
  if (beforeInput) {
    initCommonFlatpickr(beforeInput, {
      enableTime: false,
      dateFormat: "Y-m-d"
    });
  }
}

/**
 * Clears the search results and resets the form
 */
export function clearResults() {
  const resultsEl = document.getElementById('spSearchResults');
  resultsEl.innerHTML = `<div class="empty-state">${language.searchEmptyState}</div>`;
  searchState = { page: 0, hasMore: false, terms: '', isSearching: false, originalKeyword: '' };
  
  // Clear input fields
  const fromInput = document.getElementById('spSearchFrom');
  fromInput.value = '';
  delete fromInput.dataset.username;
  const termsInput = document.getElementById('spSearchTerms');
  termsInput.value = '';
  const afterEl = document.getElementById('spSearchAfter');
  const beforeEl = document.getElementById('spSearchBefore');
  if (afterEl?._flatpickr) afterEl._flatpickr.clear();
  else if (afterEl) afterEl.value = '';

  if (beforeEl?._flatpickr) beforeEl._flatpickr.clear();
  else if (beforeEl) beforeEl.value = '';
  document.getElementById('chkSearchIncludeDM').checked = false;
  const btnClearSearch = document.getElementById('btnSpClearSearch');
  if (btnClearSearch) btnClearSearch.style.display = 'none';
  
  // Reset multi-select for channels
  if (searchInMS) searchInMS.reset();

  // Trigger auto-save
  termsInput.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Resets the UI state of the tab
 */
export function reset() {
  _joinedChannelsCache = null;
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
  const btnSearch = document.getElementById('btnSpSearch');

  if (!isLoadMore) {
    const terms = document.getElementById('spSearchTerms').value.trim();
    const fromInput = document.getElementById('spSearchFrom');
    let from = fromInput.value.trim();
    // Use the stored username if available, otherwise use input text
    if (fromInput.dataset.username && from) {
      from = fromInput.dataset.username;
    }
    const inChannels = searchInMS ? searchInMS.getSelected() : [];
    const after = document.getElementById('spSearchAfter').value;
    const before = document.getElementById('spSearchBefore').value;

    if (!terms && !from && inChannels.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">${language.searchCriteriaRequired}</div>`;
      return;
    }

    if (terms && terms.length < 2) {
      resultsEl.innerHTML = `<div class="empty-state">${language.searchKeywordHelper}</div>`;
      return;
    }

    // Close the Action Modal
    if (window.ModalManager) {
      window.ModalManager.close();
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
    searchState.originalKeyword = terms; // Save for highlighting
    searchState.page = 0;
    searchState.hasMore = true;
    
    showLoading(resultsEl, language.searching);
    btnSearch.classList.add('loading');
    btnSearch.innerHTML = `<span class="spinner"></span>`;
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
      resultsEl.innerHTML = `<div class="empty-state">${language.noResultsFriendly}</div>`;
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

    const html = renderPostList(posts, usersMap, config.chatopsUrl, team.name, channelsMap, searchState.originalKeyword);
    
    if (!isLoadMore) {
      resultsEl.innerHTML = `
        <div class="result-header">
          <div class="result-count">${language.resultsFor}: "${escapeHtml(searchState.terms)}"</div>
          <button class="btn-clear-search" id="btnClearSearch">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
            ${language.clearResults}
          </button>
        </div>
        <div id="searchPostList">${html}</div>
      `;
      document.getElementById('btnClearSearch')?.addEventListener('click', clearResults);
    } else {
      document.getElementById('searchPostList').insertAdjacentHTML('beforeend', html);
      document.getElementById('btnLoadMoreSearch')?.remove();
    }

    if (searchState.hasMore) {
      resultsEl.insertAdjacentHTML('beforeend', `<div class="loading-state" id="btnLoadMoreSearch"><span class="spinner"></span> ${language.loadingMore}</div>`);
    }

    // Only show collapse button if the text actually overflows
    document.getElementById('searchPostList')?.querySelectorAll('.post-item').forEach(card => {
      const textEl = card.querySelector('.post-body');
      const collapseBtn = card.querySelector('.collapse-btn');
      // Only process items where the collapse button hasn't been hidden yet
      if (textEl && collapseBtn && collapseBtn.style.display !== 'none') {
        const isOverflowing = textEl.scrollHeight > textEl.clientHeight + 1;
        if (!isOverflowing) {
          collapseBtn.style.display = 'none';
        }
      }
    });

  } catch (err) {
    if (!isLoadMore) showError(resultsEl, err.message);
  } finally {
    searchState.isSearching = false;
    btnSearch.classList.remove('loading');
    btnSearch.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
      </svg>
    `;
    const termsInput = document.getElementById('spSearchTerms');
    if (termsInput) {
      termsInput.dispatchEvent(new Event('input'));
    }
  }
}
