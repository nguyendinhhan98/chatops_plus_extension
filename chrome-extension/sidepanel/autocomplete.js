/**
 * Smart Select (Autocomplete) Component cho ChatOps Extension
 */

export function setupAutocomplete(inputId, fetchOptions, renderFn, onSelectFn) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  const wrapper = inputEl.parentElement;
  
  // Tạo dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  wrapper.appendChild(dropdown);

  let timeoutId = null;
  let currentSearch = '';
  let currentPage = 0;
  const perPage = 10;
  let isLoading = false;
  let hasMore = true;

  async function loadData(isLoadMore = false) {
    if (isLoading) return;
    if (isLoadMore && (!hasMore || currentSearch !== '')) return; // Không load more khi đang search

    isLoading = true;
    
    if (!isLoadMore) {
      dropdown.innerHTML = '<div class="autocomplete-msg"><span class="spinner"></span> Đang tải...</div>';
      currentPage = 0;
      hasMore = true;
    } else {
      const spinner = document.createElement('div');
      spinner.className = 'autocomplete-msg load-more-spinner';
      spinner.innerHTML = '<span class="spinner"></span> Đang tải thêm...';
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
        hasMore = false; // Search API thường không hỗ trợ phân trang
      }

      if (!isLoadMore) dropdown.innerHTML = '';
      else {
        const spinner = dropdown.querySelector('.load-more-spinner');
        if (spinner) spinner.remove();
      }

      if (!isLoadMore && (!results || results.length === 0)) {
        dropdown.innerHTML = '<div class="autocomplete-msg">Không tìm thấy kết quả</div>';
        isLoading = false;
        return;
      }

      results.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'autocomplete-item';
        itemEl.innerHTML = renderFn(item);
        
        itemEl.addEventListener('mousedown', (evt) => {
          // Dùng mousedown để chạy trước khi blur event của input kịp kích hoạt
          evt.preventDefault(); 
          const displayValue = onSelectFn(item);
          inputEl.value = displayValue;
          dropdown.style.display = 'none';
          // Cập nhật state
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        dropdown.appendChild(itemEl);
      });
      
      currentPage++;
    } catch (err) {
      if (!isLoadMore) {
        dropdown.innerHTML = '<div class="autocomplete-msg" style="color:var(--error)">❌ Lỗi tải dữ liệu</div>';
      }
      hasMore = false;
    } finally {
      isLoading = false;
    }
  }

  // Handle scroll for Infinite Load
  dropdown.addEventListener('scroll', () => {
    if (dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - 20) {
      loadData(true);
    }
  });

  inputEl.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value === currentSearch && value !== '') return;
    
    currentSearch = value;

    // Debounce 300ms
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      dropdown.style.display = 'block';
      loadData(false);
    }, 300);
  });

  inputEl.addEventListener('focus', () => {
    dropdown.style.display = 'block';
    // Load default if empty and not already loaded
    if (currentSearch === '' && dropdown.children.length === 0) {
      loadData(false);
    }
  });

  inputEl.addEventListener('blur', () => {
    dropdown.style.display = 'none';
  });

  return {
    reset: () => {
      inputEl.value = '';
      currentSearch = '';
      currentPage = 0;
      hasMore = true;
      dropdown.innerHTML = '';
    }
  };
}
