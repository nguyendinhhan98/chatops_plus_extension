/**
 * Side Panel Orchestrator — ChatOps Chrome Extension
 */

import { state } from './state.js';
import { setup as setupSearch, reset as resetSearch, getSelects as getSearchSelects } from './tabs/search.tab.js';
import { setup as setupMentions, reset as resetMentions, getSelects as getMentionsSelects } from './tabs/mentions.tab.js';

import { setup as setupMemo, loadMemos, renderCategories } from './tabs/memo.tab.js';
import { setup as setupTasks, loadTasks } from './tabs/tasks.tab.js';
import { setup as setupSettings, getSettings, applyThemeToDOM, applyTabVisibilityToDOM, runAutoCleanup, renderSidepanelMemes } from './tabs/settings.tab.js';
import { getMyProfile, getMyTeams, getConfig } from '../src/api/index.js';
import { escapeHtml } from '../src/utils/index.js';
import { STORAGE_KEYS, MESSAGE_TYPES, CHATOPS_CONFIG, TABS } from '../src/constants.js';
import { language, loadLanguage, applyI18n, setLanguage, getActiveLanguageCode } from '../src/lang.js';
import { restoreState, setupAutoSave } from './persistence.js';

document.addEventListener('DOMContentLoaded', init);

/**
 * Initializes the side panel by fetching config, profile, and teams
 */
async function init() {
  // Load and apply the active language dictionary asynchronously before any tab setup or UI renders
  await loadLanguage();
  applyI18n();

  const dropdownEl = document.getElementById('spWorkspaceDropdown');
  try {
    const settings = await getSettings();
    applyThemeToDOM(settings);
    applyTabVisibilityToDOM(settings.showTabs, settings.memeEnabled);
  } catch (settingsErr) {
    console.error('[ChatOps Ext] Failed to load settings:', settingsErr);
  }

  try {
    const [config, user, teams] = await Promise.all([getConfig(), getMyProfile(), getMyTeams()]);
    state.setConfig(config);
    state.setUser(user);
    await setupWorkspaceSelector(teams, dropdownEl);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SIDE_PANEL_STATE, state: 'OPEN' });
  } catch (err) {
    if (dropdownEl) {
      const selectedEl = document.getElementById('spWorkspaceSelected');
      if (selectedEl) {
        const text = selectedEl.querySelector('.selected-text');
        if (text) {
          text.textContent = `❌ ${err.message}`;
          text.removeAttribute('data-i18n');
        }
      }
    }
  }

  setupSearch(state);
  setupMentions(state);

  setupMemo(state);
  setupTasks(state);
  setupSettings(state);
  setupTabs();
  setupModalListeners();
  setupLanguageToggle();
  
  // Background silent auto cleanup
  runAutoCleanup().catch(e => console.error('[ChatOps Ext] Auto cleanup error:', e));
  
  const selectors = { ...getSearchSelects(), ...getMentionsSelects() };
  restoreState(selectors);
  setupAutoSave(selectors);
  setupStateHandlers();
}

/**
 * Sets up the workspace dropdown selector
 */
async function setupWorkspaceSelector(teams, dropdownContainer) {
  const selectedEl = document.getElementById('spWorkspaceSelected');
  const optionsEl = document.getElementById('spWorkspaceOptions');
  const selectedText = selectedEl?.querySelector('.selected-text');
  
  if (!teams?.length) { 
    if (selectedText) {
      selectedText.textContent = language.noWorkspaces || 'No workspaces'; 
      selectedText.removeAttribute('data-i18n');
    }
    return; 
  }

  const saved = await chrome.storage.local.get([STORAGE_KEYS.CURRENT_TEAM]);
  const config = state.getConfig();
  let defaultTeam = teams.find(t => String(t.id) === String(saved[STORAGE_KEYS.CURRENT_TEAM])) 
    || teams.find(t => t.name === (config.teamName || CHATOPS_CONFIG.DEFAULT_TEAM)) 
    || teams[0];
  
  state.setTeam(defaultTeam);
  if (selectedText) {
    selectedText.textContent = defaultTeam.display_name;
    selectedText.removeAttribute('data-i18n');
  }

  // Render options dynamically
  if (optionsEl) {
    optionsEl.innerHTML = teams.map(t => `
      <div class="custom-dropdown-option ${t.id === defaultTeam.id ? 'selected' : ''}" data-value="${t.id}">
        ${escapeHtml(t.display_name)}
      </div>
    `).join('');
  }

  // Toggle dropdown open/close
  selectedEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownContainer.classList.contains('open');
    
    // Close other elements if needed, then toggle this one
    dropdownContainer.classList.toggle('open', !isOpen);
    optionsEl?.classList.toggle('show', !isOpen);
  });

  // Handle option click
  optionsEl?.addEventListener('click', (e) => {
    const optionItem = e.target.closest('.custom-dropdown-option');
    if (!optionItem) return;

    const val = optionItem.dataset.value;
    const selectedTeam = teams.find(t => String(t.id) === String(val));
    if (!selectedTeam) return;

    if (selectedText) {
      selectedText.textContent = selectedTeam.display_name;
      selectedText.removeAttribute('data-i18n');
    }
    
    optionsEl.querySelectorAll('.custom-dropdown-option').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === val);
    });

    state.setTeam(selectedTeam);
    chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_TEAM]: val });

    // Close the dropdown
    dropdownContainer.classList.remove('open');
    optionsEl.classList.remove('show');

    // Defer reset to prevent rendering glitches
    setTimeout(() => {
      resetAllTabs();
    }, 50);
  });

  // Close dropdown if clicked outside
  document.addEventListener('click', () => {
    dropdownContainer?.classList.remove('open');
    optionsEl?.classList.remove('show');
  });
}

/**
 * Switches the active tab in the UI
 */
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === id));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${id}`));
}

/**
 * Handles tab switching UI logic
 */
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  
  // Handle sync badge clicks to navigate to settings sync section
  ['syncBadgeTasks', 'syncBadgeNotes'].forEach(badgeId => {
    document.getElementById(badgeId)?.addEventListener('click', () => {
      switchTab('settings');
      
      // Select the sync sub-tab in Settings
      if (typeof window.navigateToSettingsSubtab === 'function') {
        window.navigateToSettingsSubtab('sync-cloud');
      } else {
        const syncSubTabBtn = document.querySelector(`#settingsSubTabs .memo-sub-tab[data-section="sync"]`);
        if (syncSubTabBtn) {
          syncSubTabBtn.click();
        }
      }
      
      setTimeout(() => {
        const syncSection = document.getElementById('cloudSyncConfigArea');
        if (syncSection) {
          syncSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          syncSection.style.transition = 'all 0.4s ease';
          syncSection.style.boxShadow = '0 0 16px var(--accent)';
          syncSection.style.transform = 'scale(1.02)';
          setTimeout(() => {
            syncSection.style.boxShadow = '';
            syncSection.style.transform = '';
          }, 1200);
        }
      }, 150);
    });
  });
  // Handle programmatic links to settings/reactions sub-tabs (e.g. from Tasks, Mentions, etc.)
  document.addEventListener('click', (e) => {
    const supportLink = e.target.closest('.support-chatops-link');
    if (supportLink) {
      e.preventDefault();
      const url = supportLink.getAttribute('href');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
        }
      });
      return;
    }

    const link = e.target.closest('.settings-subtab-link');
    if (link) {
      e.preventDefault();
      if (window.ModalManager) {
        window.ModalManager.close();
      }
      const subtabName = link.dataset.subtab;
      if (!subtabName) return;

      let tabId = 'settings';
      if (subtabName.startsWith('reactions-')) {
        tabId = 'reactions';
      }

      // 1. Switch to the correct main tab
      switchTab(tabId);

      // 2. Switch top-level sub-tab/category
      let sectionId = '';
      if (subtabName.startsWith('features-')) {
        sectionId = 'features';
      } else if (subtabName.startsWith('reactions-')) {
        sectionId = subtabName === 'reactions-picker' ? 'picker' : 'meme';
      } else if (subtabName.startsWith('sync-')) {
        sectionId = 'sync';
      } else if (subtabName === 'categories') {
        sectionId = 'categories';
      }

      if (sectionId) {
        const selector = tabId === 'settings' ? '#settingsSubTabs' : '#reactionsSubTabs';
        const tabBtn = document.querySelector(`${selector} .memo-sub-tab[data-section="${sectionId}"]`);
        if (tabBtn) {
          tabBtn.click();
        }
      }

      // 3. Switch inner subtab panel
      const subtabBtn = document.querySelector(`.settings-subtab-btn[data-subtab="${subtabName}"]`);
      if (subtabBtn) {
        subtabBtn.click();
      }
    }
  });
  
  function handleStorageRedirect(targetTab, targetSubTab) {
    if (!targetTab) return;
    switchTab(targetTab);
    chrome.storage.local.remove(STORAGE_KEYS.SIDEPANEL_TAB);
    
    if (targetSubTab) {
      chrome.storage.local.remove('sidePanelSubTab');
      
      let tabId = targetTab;
      if (targetSubTab.startsWith('reactions-')) {
        tabId = 'reactions';
      }
      
      let sectionId = '';
      if (targetSubTab.startsWith('features-')) {
        sectionId = 'features';
      } else if (targetSubTab.startsWith('reactions-')) {
        sectionId = targetSubTab === 'reactions-picker' ? 'picker' : 'meme';
      } else if (targetSubTab.startsWith('sync-')) {
        sectionId = 'sync';
      } else if (targetSubTab === 'categories') {
        sectionId = 'categories';
      }

      if (sectionId) {
        setTimeout(() => {
          const selector = tabId === 'settings' ? '#settingsSubTabs' : '#reactionsSubTabs';
          const tabBtn = document.querySelector(`${selector} .memo-sub-tab[data-section="${sectionId}"]`);
          if (tabBtn) tabBtn.click();
          
          const subtabBtn = document.querySelector(`.settings-subtab-btn[data-subtab="${targetSubTab}"]`);
          if (subtabBtn) subtabBtn.click();
        }, 150);
      }
    }
  }

  // 1. Startup redirect handling
  chrome.storage.local.get([STORAGE_KEYS.SIDEPANEL_TAB, 'sidePanelSubTab'], (res) => { 
    if (res[STORAGE_KEYS.SIDEPANEL_TAB]) { 
      handleStorageRedirect(res[STORAGE_KEYS.SIDEPANEL_TAB], res['sidePanelSubTab']);
    } 
  });

  // 2. Reactive redirect handling (when sidepanel is already open)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEYS.SIDEPANEL_TAB]) {
      const newTab = changes[STORAGE_KEYS.SIDEPANEL_TAB].newValue;
      if (newTab) {
        chrome.storage.local.get(['sidePanelSubTab'], (res) => {
          handleStorageRedirect(newTab, res['sidePanelSubTab']);
        });
      }
    }
  });
}

function resetAllTabs() {
  resetSearch();
  resetMentions();
}

/**
 * Sets up message listeners and global event handlers
 */
function setupStateHandlers() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === MESSAGE_TYPES.PING_SIDE_PANEL) sendResponse({ open: true });
    else if (msg.type === MESSAGE_TYPES.MEMO_UPDATED) {
      loadMemos();
      loadTasks();
    } else if (msg.type === 'APP_LANG_CHANGED') {
      applyI18n();
      renderCategories();
      loadMemos();
      loadTasks();
      renderSidepanelMemes();
      sendResponse({ ok: true });
    } else if (msg.type === 'SWITCH_TAB') {
      switchTab(msg.tab);
      sendResponse({ ok: true });
    }
  });

  window.addEventListener('beforeunload', () => 
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SIDE_PANEL_STATE, state: 'CLOSED' })
  );

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_BADGE });
    }
  });
  
  // Donate modal listeners
  const coffeeBtn = document.getElementById('btnHeaderCoffee');
  const donateModal = document.getElementById('donateModal');
  const donateClose = document.getElementById('btnDonateModalClose');

  if (coffeeBtn && donateModal) {
    coffeeBtn.addEventListener('click', () => {
      donateModal.style.display = 'flex';
    });
  }

  if (donateClose && donateModal) {
    donateClose.addEventListener('click', () => {
      donateModal.style.display = 'none';
    });
  }

  if (donateModal) {
    donateModal.addEventListener('click', (e) => {
      if (e.target === donateModal) {
        donateModal.style.display = 'none';
      }
    });
  }
  // Global delegated click listener for collapsible items
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.collapse-btn');
    if (btn) {
      const cardEl = btn.closest('.post-item') || btn.closest('.memo-item');
      if (cardEl) {
        const bodyEl = cardEl.querySelector('.collapsible-body') || cardEl.querySelector('.memo-note-text');
        const postPreviewEl = cardEl.querySelector('.post-preview');
        
        btn.classList.toggle('expanded');
        if (btn.classList.contains('expanded')) {
          btn.innerHTML = '▼';
          if (bodyEl) bodyEl.classList.remove('collapsed');
          if (postPreviewEl) postPreviewEl.style.display = 'block';
        } else {
          btn.innerHTML = '▶';
          if (bodyEl) bodyEl.classList.add('collapsed');
          if (postPreviewEl) postPreviewEl.style.display = 'none';
        }
      }
    }
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.post-jump-link');
    if (!link) return;
    
    e.preventDefault();
    const url = link.href;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url?.includes(CHATOPS_CONFIG.DOMAIN)) {
        chrome.tabs.update(activeTab.id, { url });
      } else {
        chrome.tabs.query({ currentWindow: true }, (allTabs) => {
          const chatOpsTab = allTabs.find(t => t.url?.includes(CHATOPS_CONFIG.DOMAIN));
          if (chatOpsTab) {
            chrome.tabs.update(chatOpsTab.id, { url, active: true });
          } else {
            chrome.tabs.create({ url });
          }
        });
      }
    });
  });
}

/**
 * Global Modal Manager for Overlay Action Forms
 */
const ModalManager = {
  activeForm: null,
  activePlaceholderId: null,

  open(title, formId, placeholderId, onOpen = null) {
    const modal = document.getElementById('spGlobalModal');
    const modalTitle = document.getElementById('spGlobalModalTitle');
    const modalBody = document.getElementById('spGlobalModalBody');
    const form = document.getElementById(formId);

    if (!modal || !modalTitle || !modalBody || !form) {
      console.error('[ChatOps Ext] Modal elements or target form not found!', { formId, placeholderId });
      return;
    }

    if (this.activeForm) {
      this.close();
    }

    this.activeForm = form;
    this.activePlaceholderId = placeholderId;

    modalTitle.textContent = title;
    modalBody.appendChild(form);
    modal.style.display = 'flex';

    if (onOpen) onOpen();

    // Prevent automatic browser focus when modal is shown/appended
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    setTimeout(() => {
      if (document.activeElement && modal.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }, 50);
  },

  close() {
    const modal = document.getElementById('spGlobalModal');
    const placeholder = document.getElementById(this.activePlaceholderId);
    const modalBody = document.getElementById('spGlobalModalBody');

    if (this.activeForm && placeholder) {
      placeholder.appendChild(this.activeForm);
    }

    if (modal) modal.style.display = 'none';
    if (modalBody) modalBody.innerHTML = '';

    this.activeForm = null;
    this.activePlaceholderId = null;
  }
};

window.ModalManager = ModalManager;

function setupModalListeners() {
  const modalClose = document.getElementById('spGlobalModalClose');
  const modal = document.getElementById('spGlobalModal');

  modalClose?.addEventListener('click', () => {
    window.ModalManager.close();
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      window.ModalManager.close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      window.ModalManager.close();
    }
  });

  document.getElementById('btnFabSearch')?.addEventListener('click', () => {
    window.ModalManager.open(
      language.modalSearchTitle,
      'spSearchForm',
      'spSearchFormPlaceholder'
    );
  });

  document.getElementById('btnFabAddTask')?.addEventListener('click', () => {
    window.ModalManager.open(
      language.modalAddTaskTitle,
      'spTasksForm',
      'spTaskFormPlaceholder'
    );
  });

  document.getElementById('btnFabAddNote')?.addEventListener('click', () => {
    window.ModalManager.open(
      language.modalAddNoteTitle,
      'spMemoForm',
      'spMemoFormPlaceholder'
    );
  });

  document.getElementById('btnFabScanMentions')?.addEventListener('click', () => {
    window.ModalManager.open(
      language.modalScannerFiltersTitle,
      'spMentionsForm',
      'spMentionsFormPlaceholder'
    );
  });
}

/**
 * Sets up the dynamic Language Flag Toggle button in the header
 */
function setupLanguageToggle() {
  const btnHeaderLang = document.getElementById('btnHeaderLang');
  if (!btnHeaderLang) return;

  // Initialize flag display based on active language
  const currentLang = getActiveLanguageCode();
  btnHeaderLang.textContent = currentLang === 'en' ? 'EN' : 'VI';

  btnHeaderLang.addEventListener('click', async () => {
    const activeLang = getActiveLanguageCode();
    const nextLang = activeLang === 'en' ? 'vi' : 'en';

    // 1. Save language preference to chrome storage
    await chrome.storage.local.set({ app_lang: nextLang });

    // 2. Hot-swap the mutated language dictionary in-place
    setLanguage(nextLang);

    // 3. Immediately translate static DOM elements in the side panel
    applyI18n();

    // 4. Update the flag button display
    btnHeaderLang.textContent = nextLang === 'en' ? 'EN' : 'VI';

    // 5. Update custom select trigger text if the settings tab is open/rendered
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
      const select = wrapper.querySelector('select');
      const trigger = wrapper.querySelector('.custom-select-trigger span');
      if (select && trigger) {
        const activeOpt = select.querySelector(`option[value="${select.value}"]`);
        if (activeOpt) {
          const i18nKey = activeOpt.getAttribute('data-i18n');
          if (i18nKey && language[i18nKey]) {
            trigger.textContent = language[i18nKey];
          }
        }
      }
    });

    // Update custom dropdown elements (created by convertToCustomDropdown)
    document.querySelectorAll('.custom-dropdown-container').forEach(container => {
      const select = container.previousElementSibling;
      if (select && select.tagName === 'SELECT') {
        const toggleSpan = container.querySelector('.custom-dropdown-selected-text');
        if (toggleSpan) {
          const activeOpt = select.options[select.selectedIndex];
          if (activeOpt) {
            toggleSpan.textContent = activeOpt.textContent;
          }
        }
        // Also update the options list text
        const items = container.querySelectorAll('.custom-dropdown-item');
        items.forEach(item => {
          const val = item.getAttribute('data-value');
          const opt = select.querySelector(`option[value="${val}"]`);
          if (opt) {
            item.textContent = opt.textContent;
          }
        });
      }
    });

    // 6. Refresh active views to render correct dynamic translations
    renderCategories();
    if (typeof loadMemos === 'function') loadMemos();
    if (typeof loadTasks === 'function') loadTasks();
    if (typeof renderSidepanelMemes === 'function') renderSidepanelMemes();

    // 7. Broadcast the change to other contexts (background, active content script tabs)
    chrome.runtime.sendMessage({ type: 'APP_LANG_CHANGED', lang: nextLang });
    chrome.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'APP_LANG_CHANGED', lang: nextLang }).catch(() => {
          // Ignore tabs where content scripts aren't loaded or supported
        });
      }
    });
  });
}


