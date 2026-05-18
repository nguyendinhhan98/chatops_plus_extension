import { UI_CONFIG } from '../src/constants.js';
import { language } from '../src/lang.js';

/**
 * Smart Select (Autocomplete) Component — ChatOps Chrome Extension
 */

/**
 * Initializes a smart select component with autocomplete and infinite scroll
 */
export function setupAutocomplete(inputId, fetchOptions, renderFn, onSelectFn) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  const wrapper = inputEl.parentElement;
  
  const clearBtn = document.createElement('span');
  clearBtn.innerHTML = '✕';
  clearBtn.className = 'autocomplete-clear';
  clearBtn.style.display = inputEl.value ? 'flex' : 'none';
  clearBtn.title = 'Clear';
  wrapper.appendChild(clearBtn);
  
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  wrapper.appendChild(dropdown);

  let timeoutId = null;
  let currentSearch = '';
  let currentPage = 0;
  const perPage = UI_CONFIG.AUTOCOMPLETE_PAGE_SIZE;
  let isLoading = false;
  let hasMore = true;

  async function loadData(isLoadMore = false) {
    if (isLoading) return;
    if (isLoadMore && (!hasMore || currentSearch !== '')) return; // Don't load more during search

    isLoading = true;
    
    if (!isLoadMore) {
      dropdown.innerHTML = `<div class="autocomplete-msg"><span class="spinner"></span> ${language.loading}</div>`;
      currentPage = 0;
      hasMore = true;
    } else {
      const spinner = document.createElement('div');
      spinner.className = 'autocomplete-msg load-more-spinner';
      spinner.innerHTML = `<span class="spinner"></span> ${language.loadingMore}`;
      dropdown.appendChild(spinner);
    }

    try {
      let results = [];
      if (currentSearch === '') {
        if (fetchOptions.defaultFetch) {
          results = await fetchOptions.defaultFetch(currentPage, perPage);
          if (results.length < perPage) hasMore = false;
        } else {
          hasMore = false;
        }
      } else {
        if (fetchOptions.searchFetch) {
          results = await fetchOptions.searchFetch(currentSearch);
        }
        hasMore = false; // Search API usually doesn't support pagination
      }

      if (!isLoadMore) dropdown.innerHTML = '';
      else {
        const spinner = dropdown.querySelector('.load-more-spinner');
        if (spinner) spinner.remove();
      }

      if (!isLoadMore && (!results || results.length === 0)) {
        dropdown.innerHTML = `<div class="autocomplete-msg">${language.noResults}</div>`;
        isLoading = false;
        return;
      }

      results.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'autocomplete-item';
        itemEl.innerHTML = renderFn(item);
        
        itemEl.addEventListener('mousedown', (evt) => {
          // Use mousedown to execute before the input's blur event fires
          evt.preventDefault(); 
          const displayValue = onSelectFn(item);
          inputEl.value = displayValue;
          dropdown.style.display = 'none';
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        dropdown.appendChild(itemEl);
      });
      
      currentPage++;
    } catch (err) {
      if (!isLoadMore) {
        dropdown.innerHTML = `<div class="autocomplete-msg" style="color:var(--error)">❌ ${language.errorLoading}</div>`;
      }
      hasMore = false;
    } finally {
      isLoading = false;
    }
  }

  // Handle scroll for Infinite Load
  dropdown.addEventListener('scroll', () => {
    if (dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - UI_CONFIG.SCROLL_THRESHOLD_PX) {
      loadData(true);
    }
  });

  const updateClearBtn = () => {
    clearBtn.style.display = inputEl.value ? 'flex' : 'none';
  };
  
  inputEl.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    updateClearBtn();
    if (value === currentSearch && value !== '') return;
    
    currentSearch = value;

    // Debounce
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      dropdown.style.display = 'block';
      loadData(false);
    }, UI_CONFIG.DEBOUNCE_DELAY_MS);
  });

  inputEl.addEventListener('focus', () => {
    dropdown.style.display = 'block';
    if (currentSearch === '' && dropdown.children.length === 0) {
      loadData(false);
    }
  });

  inputEl.addEventListener('blur', () => {
    dropdown.style.display = 'none';
  });

  inputEl.addEventListener('change', updateClearBtn);
  
  // Need to observe value changes if changed programmatically (like on restore)
  setTimeout(updateClearBtn, 100);

  clearBtn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent input blur
    inputEl.value = '';
    if (inputEl.dataset.username) delete inputEl.dataset.username;
    currentSearch = '';
    clearBtn.style.display = 'none';
    dropdown.style.display = 'none';
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.focus();
  });

  return {
    reset: () => {
      inputEl.value = '';
      currentSearch = '';
      currentPage = 0;
      hasMore = true;
      dropdown.innerHTML = '';
      clearBtn.style.display = 'none';
    }
  };
}
