// Safe wrap for CSSStyleSheet.prototype.cssRules to avoid SecurityError in cross-origin environments (e.g. under macOS Chrome)
try {
  const originalCssRulesDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules');
  if (originalCssRulesDescriptor) {
    Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
      get: function() {
        try {
          return originalCssRulesDescriptor.get.call(this);
        } catch (e) {
          return [];
        }
      }
    });
  }
} catch (e) {
  console.warn('[ChatOps Ext] Failed to patch CSSStyleSheet cssRules getter:', e);
}

// Polyfill chrome APIs for browser environments/testing
if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
  window.chrome = window.chrome || {};
  
  const mockStorage = {
    local: {
      get: (keys, callback) => {
        const res = {};
        const processKey = (k) => {
          const val = localStorage.getItem(k);
          try {
            return val ? JSON.parse(val) : null;
          } catch (_) {
            return val;
          }
        };

        if (Array.isArray(keys)) {
          keys.forEach(k => {
            res[k] = processKey(k);
          });
        } else if (typeof keys === 'object' && keys !== null) {
          Object.keys(keys).forEach(k => {
            const val = processKey(k);
            res[k] = val !== null ? val : keys[k];
          });
        } else if (typeof keys === 'string') {
          res[keys] = processKey(keys);
        }

        if (typeof callback === 'function') {
          callback(res);
        }
        return Promise.resolve(res);
      },
      set: (obj, callback) => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(k => {
            localStorage.setItem(k, JSON.stringify(obj[k]));
          });
        }
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      },
      remove: (keys, callback) => {
        if (Array.isArray(keys)) {
          keys.forEach(k => localStorage.removeItem(k));
        } else if (typeof keys === 'string') {
          localStorage.removeItem(keys);
        }
        if (typeof callback === 'function') {
          callback();
        }
        return Promise.resolve();
      }
    },
    onChanged: {
      addListener: () => {}
    }
  };

  const mockRuntime = {
    getManifest: () => ({ version: '3.4.1' }),
    sendMessage: () => {},
    onMessage: {
      addListener: () => {}
    }
  };

  const mockAlarms = {
    clear: () => {},
    create: () => {}
  };

  const mockTabs = {
    query: (queryInfo, callback) => {
      if (typeof callback === 'function') {
        callback([{ id: 1, url: window.location.href }]);
      }
      return Promise.resolve([{ id: 1, url: window.location.href }]);
    },
    update: (tabId, updateProperties, callback) => {
      if (typeof callback === 'function') {
        callback({ id: tabId });
      }
      return Promise.resolve({ id: tabId });
    },
    sendMessage: () => Promise.resolve()
  };

  // Extend window.chrome by adding properties safely
  try {
    if (!chrome.storage) {
      chrome.storage = mockStorage;
    } else if (!chrome.storage.onChanged) {
      chrome.storage.onChanged = mockStorage.onChanged;
    }
    if (!chrome.runtime) chrome.runtime = mockRuntime;
    if (!chrome.alarms) chrome.alarms = mockAlarms;
    if (!chrome.tabs) chrome.tabs = mockTabs;
  } catch (e) {
    console.warn('[ChatOps Ext] Failed to safely extend window.chrome.', e);
  }
}

/**
 * Reusable utility to convert a standard select element into a premium custom dropdown opening downward.
 */
window.convertToCustomDropdown = function(selectOrId, width = null, height = null) {
  const nativeSelect = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
  if (!nativeSelect) return;

  // Remove existing converted container if present to allow dynamic updates
  if (nativeSelect.nextElementSibling?.classList.contains('custom-dropdown-container')) {
    nativeSelect.nextElementSibling.remove();
  }

  // Hide native select
  nativeSelect.style.display = 'none';

  // Read width or use default
  const computedStyle = window.getComputedStyle(nativeSelect);
  const selectWidth = width || computedStyle.width || '100%';
  const selectHeight = height || '34px';

  const container = document.createElement('div');
  container.className = 'custom-dropdown-container';
  container.style.width = selectWidth;
  container.style.flexShrink = '0';
  container.style.boxSizing = 'border-box';
  container.style.display = 'inline-block';
  container.style.verticalAlign = 'middle';
  container.style.setProperty('overflow', 'visible', 'important');

  const options = Array.from(nativeSelect.options);
  const selectedIndex = nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0;
  const initialText = options[selectedIndex]?.textContent || 'Select...';

  const isCompact = nativeSelect.classList.contains('sp-compact-select');
  const optionVal = options[selectedIndex]?.value || '';
  const toggleStyle = isCompact 
    ? `width: 100%; height: ${selectHeight}; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer; outline: none; display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 0 6px !important; margin: 0 !important; transition: all 0.2s ease; box-sizing: border-box; background-image: none !important; line-height: 1 !important;`
    : `width: 100%; height: ${selectHeight}; font-size: 11.5px; border-radius: 6px; border: 1px solid var(--border); background: #ffffff; color: var(--text-2); cursor: pointer; outline: none; display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 0 10px !important; margin: 0 !important; font-weight: 400; transition: all 0.2s ease; box-sizing: border-box; line-height: 1 !important;`;

  container.innerHTML = `
    <div class="custom-dropdown" style="position: relative; width: 100%; box-sizing: border-box; font-family: var(--font); overflow: visible !important;">
      <button type="button" class="custom-dropdown-toggle ${isCompact ? 'sp-compact-select' : ''}" data-category="${optionVal.toLowerCase()}"
        style="${toggleStyle}">
        <span class="custom-dropdown-selected-text" style="font-weight: 600; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; text-align: center; justify-content: center; line-height: 1; display: inline-flex; align-items: center; height: 100%; margin: 0; padding: 0;">${initialText}</span>
        <span class="custom-dropdown-arrow" style="font-size: 8px; opacity: 0.6; transition: transform 0.2s ease; margin-left: 2px; flex-shrink: 0; line-height: 1; display: inline-flex; align-items: center; height: 100%;">▼</span>
      </button>
      <ul class="custom-dropdown-menu"
        style="position: absolute; top: 100%; left: 0; margin-top: 6px; width: 100%; min-width: 120px; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); padding: 4px 0; list-style: none; display: none; z-index: 1000; max-height: 220px; overflow-y: auto; box-sizing: border-box;">
        ${options.map(opt => `
          <li class="custom-dropdown-item" data-value="${opt.value}" style="padding: 4px 10px; font-size: 11.5px; color: var(--text-2); cursor: pointer; transition: all 0.2s ease; text-align: left; font-weight: 400;">${opt.textContent}</li>
        `).join('')}
      </ul>
    </div>
  `;

  nativeSelect.parentNode.insertBefore(container, nativeSelect.nextSibling);

  const toggleBtn = container.querySelector('.custom-dropdown-toggle');
  const menuList = container.querySelector('.custom-dropdown-menu');
  const selectedSpan = container.querySelector('.custom-dropdown-selected-text');
  const arrowSpan = container.querySelector('.custom-dropdown-arrow');

  if (!toggleBtn || !menuList || !selectedSpan || !arrowSpan) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close other dropdowns
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
      if (m !== menuList) {
        m.style.display = 'none';
        const otherArrow = m.previousElementSibling?.querySelector('.custom-dropdown-arrow');
        if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
      }
    });

    const isVisible = menuList.style.display === 'block';
    
    if (!isVisible) {
      // Auto-direction layout logic (open upwards if close to viewport bottom edge)
      const rect = toggleBtn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 220; // Maximum allowed dropdown menu height (from CSS/inline style)
      if (spaceBelow < menuHeight) {
        menuList.style.top = 'auto';
        menuList.style.bottom = '100%';
        menuList.style.marginTop = '0px';
        menuList.style.marginBottom = '6px';
      } else {
        menuList.style.top = '100%';
        menuList.style.bottom = 'auto';
        menuList.style.marginTop = '6px';
        menuList.style.marginBottom = '0px';
      }
    }

    menuList.style.display = isVisible ? 'none' : 'block';
    arrowSpan.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
  });

  menuList.querySelectorAll('.custom-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = item.getAttribute('data-value');
      const text = item.textContent;

      selectedSpan.textContent = text;
      nativeSelect.value = val;
      if (isCompact) {
        toggleBtn.setAttribute('data-category', val.toLowerCase());
      }
      nativeSelect.dispatchEvent(new Event('change'));

      menuList.style.display = 'none';
      arrowSpan.style.transform = 'rotate(0deg)';
    });
  });

  nativeSelect.addEventListener('change', () => {
    const activeOption = nativeSelect.options[nativeSelect.selectedIndex];
    if (activeOption) {
      selectedSpan.textContent = activeOption.textContent;
      if (isCompact) {
        toggleBtn.setAttribute('data-category', activeOption.value.toLowerCase());
      }
    }
  });

  if (!window._hasGlobalDropdownClickRegistered) {
    window._hasGlobalDropdownClickRegistered = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
        m.style.display = 'none';
        const otherArrow = m.previousElementSibling?.querySelector('.custom-dropdown-arrow');
        if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
      });
    });
  }
};
