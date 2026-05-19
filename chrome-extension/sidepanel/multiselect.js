import { UI_CONFIG } from '../src/constants.js';
import { language } from '../src/lang.js';

/**
 * MultiSelect Component — ChatOps Chrome Extension
 */

/**
 * Initializes a multi-select component with autocomplete and infinite scroll
 */
export function setupMultiSelect(containerId, fetchOptions, renderFn, getValueFn, getLabelFn) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  container.classList.add('multiselect-container');
  
  const chipsWrapper = document.createElement('div');
  chipsWrapper.className = 'multiselect-chips';
  container.appendChild(chipsWrapper);

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'autocomplete-wrapper';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'autocomplete-input multiselect-input';
  input.placeholder = container.getAttribute('data-placeholder') || 'Search...';
  inputWrapper.appendChild(input);
  container.appendChild(inputWrapper);

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  inputWrapper.appendChild(dropdown);

  let selectedItems = [];
  let timeoutId = null;
  let currentSearch = '';
  let currentPage = 0;
  const perPage = UI_CONFIG.AUTOCOMPLETE_PAGE_SIZE;
  let isLoading = false;
  let hasMore = true;

  function renderChips() {
    chipsWrapper.innerHTML = '';
    selectedItems.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'multiselect-chip';
      chip.innerHTML = `
        <span class="chip-label">${getLabelFn(item)}</span>
        <span class="chip-remove">×</span>
      `;
      chip.querySelector('.chip-remove').addEventListener('click', () => {
        selectedItems = selectedItems.filter(i => getValueFn(i) !== getValueFn(item));
        renderChips();
        container.dispatchEvent(new Event('change', { bubbles: true }));
      });
      chipsWrapper.appendChild(chip);
    });
  }

  async function loadData(isLoadMore = false) {
    if (isLoading) return;
    if (isLoadMore && (!hasMore || currentSearch !== '')) return;

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
        hasMore = false;
      }

      if (!isLoadMore) dropdown.innerHTML = '';
      else {
        const spinner = dropdown.querySelector('.load-more-spinner');
        if (spinner) spinner.remove();
      }

      // Filter out already selected items
      results = results.filter(r => !selectedItems.some(s => getValueFn(s) === getValueFn(r)));

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
          evt.preventDefault();
          // Prevent duplicates
          if (selectedItems.some(s => getValueFn(s) === getValueFn(item))) return;
          
          selectedItems.push(item);
          input.value = '';
          currentSearch = '';
          renderChips();
          container.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Refresh the list to remove the selected item and keep dropdown open
          loadData(false);
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

  // Infinite Scroll logic
  dropdown.addEventListener('scroll', () => {
    if (dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - UI_CONFIG.SCROLL_THRESHOLD_PX) {
      loadData(true);
    }
  });

  input.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value === currentSearch && value !== '') return;
    
    currentSearch = value;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (document.activeElement === input) {
        dropdown.style.display = 'block';
        loadData(false);
      }
    }, UI_CONFIG.DEBOUNCE_DELAY_MS);
  });

  input.addEventListener('focus', () => {
    dropdown.style.display = 'block';
    if (currentSearch === '' && dropdown.children.length === 0) {
      loadData(false);
    }
  });

  input.addEventListener('blur', () => {
    dropdown.style.display = 'none';
  });

  return {
    getSelected: () => selectedItems,
    setSelected: (items) => {
      selectedItems = items || [];
      renderChips();
    },
    reset: () => {
      selectedItems = [];
      renderChips();
      dropdown.innerHTML = '';
      currentSearch = '';
      currentPage = 0;
      hasMore = true;
      input.value = '';
    }
  };
}
