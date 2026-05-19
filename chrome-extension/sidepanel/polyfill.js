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
      get: async (keys) => {
        const res = {};
        if (Array.isArray(keys)) {
          keys.forEach(k => {
            const val = localStorage.getItem(k);
            res[k] = val ? JSON.parse(val) : null;
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(k => {
            const val = localStorage.getItem(k);
            res[k] = val ? JSON.parse(val) : keys[k];
          });
        } else {
          const val = localStorage.getItem(keys);
          res[keys] = val ? JSON.parse(val) : null;
        }
        return res;
      },
      set: async (obj) => {
        Object.keys(obj).forEach(k => {
          localStorage.setItem(k, JSON.stringify(obj[k]));
        });
      }
    }
  };

  const mockRuntime = {
    sendMessage: () => {},
    onMessage: {
      addListener: () => {}
    }
  };

  const mockAlarms = {
    clear: () => {},
    create: () => {}
  };

  // Extend window.chrome by adding properties safely
  try {
    if (!chrome.storage) chrome.storage = mockStorage;
    if (!chrome.runtime) chrome.runtime = mockRuntime;
    if (!chrome.alarms) chrome.alarms = mockAlarms;
  } catch (e) {
    console.warn('[ChatOps Ext] Failed to safely extend window.chrome.', e);
  }
}

/**
 * Reusable utility to convert a standard select element into a premium custom dropdown opening downward.
 */
window.convertToCustomDropdown = function(selectId, width = null, height = null) {
  const nativeSelect = document.getElementById(selectId);
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

  const options = Array.from(nativeSelect.options);
  const selectedIndex = nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0;
  const initialText = options[selectedIndex]?.textContent || 'Select...';

  container.innerHTML = `
    <div class="custom-dropdown" style="position: relative; width: 100%; box-sizing: border-box; font-family: var(--font);">
      <button type="button" class="custom-dropdown-toggle"
        style="width: 100%; height: ${selectHeight}; font-size: 11.5px; border-radius: 6px; border: 1px solid var(--border); background: #ffffff; color: var(--text-2); cursor: pointer; outline: none; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; font-weight: 400; transition: all 0.2s ease; box-sizing: border-box;">
        <span class="custom-dropdown-selected-text" style="font-weight: 400; font-size: 11.5px;">${initialText}</span>
        <span class="custom-dropdown-arrow" style="font-size: 9px; opacity: 0.6; transition: transform 0.2s ease;">▼</span>
      </button>
      <ul class="custom-dropdown-menu"
        style="position: absolute; top: 100%; right: 0; margin-top: 6px; width: 100%; min-width: 120px; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); padding: 4px 0; list-style: none; display: none; z-index: 1000; max-height: 220px; overflow-y: auto; box-sizing: border-box;">
        ${options.map(opt => `
          <li class="custom-dropdown-item" data-value="${opt.value}" style="padding: 6px 12px; font-size: 11.5px; color: var(--text-2); cursor: pointer; transition: all 0.2s ease; text-align: left; font-weight: 400;">${opt.textContent}</li>
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
      nativeSelect.dispatchEvent(new Event('change'));

      menuList.style.display = 'none';
      arrowSpan.style.transform = 'rotate(0deg)';
    });
  });

  nativeSelect.addEventListener('change', () => {
    const activeOption = nativeSelect.options[nativeSelect.selectedIndex];
    if (activeOption) {
      selectedSpan.textContent = activeOption.textContent;
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
