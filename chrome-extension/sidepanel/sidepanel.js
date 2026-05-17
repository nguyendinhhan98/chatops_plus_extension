/**
 * Side Panel Orchestrator — ChatOps Chrome Extension
 */

import { state } from './state.js';
import { setup as setupSearch, reset as resetSearch, getSelects as getSearchSelects } from './tabs/search.tab.js';
import { setup as setupMentions, reset as resetMentions, getSelects as getMentionsSelects } from './tabs/mentions.tab.js';

import { setup as setupMemo, loadMemos } from './tabs/memo.tab.js';
import { setup as setupTasks, loadTasks } from './tabs/tasks.tab.js';
import { setup as setupSettings, getSettings, applyThemeToDOM, applyTabVisibilityToDOM, runAutoCleanup } from './tabs/settings.tab.js';
import { getMyProfile, getMyTeams, getConfig } from '../src/api/index.js';
import { escapeHtml } from '../src/utils/index.js';
import { STORAGE_KEYS, MESSAGE_TYPES, CHATOPS_CONFIG, TABS } from '../src/constants.js';
import { language } from '../src/lang.js';
import { restoreState, setupAutoSave } from './persistence.js';

document.addEventListener('DOMContentLoaded', init);

/**
 * Initializes the side panel by fetching config, profile, and teams
 */
async function init() {
  const selectEl = document.getElementById('spWorkspaceSelect');
  try {
    const settings = await getSettings();
    applyThemeToDOM(settings);
    applyTabVisibilityToDOM(settings.showTabs);
  } catch (settingsErr) {
    console.error('[ChatOps Ext] Failed to load settings:', settingsErr);
  }

  try {
    const [config, user, teams] = await Promise.all([getConfig(), getMyProfile(), getMyTeams()]);
    state.setConfig(config);
    state.setUser(user);
    await setupWorkspaceSelector(teams, selectEl);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SIDE_PANEL_STATE, state: 'OPEN' });
  } catch (err) {
    if (selectEl) selectEl.innerHTML = `<option value="">❌ ${err.message}</option>`;
  }

  setupSearch(state);
  setupMentions(state);

  setupMemo(state);
  setupTasks(state);
  setupSettings(state);
  setupTabs();
  
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
async function setupWorkspaceSelector(teams, select) {
  if (!teams?.length) { 
    select.innerHTML = `<option value="">${language.noWorkspaces}</option>`; 
    return; 
  }
  select.innerHTML = teams.map(t => `<option value="${t.id}">${escapeHtml(t.display_name)}</option>`).join('');

  const saved = await chrome.storage.local.get([STORAGE_KEYS.CURRENT_TEAM]);
  const config = state.getConfig();
  let defaultTeam = teams.find(t => t.id === saved[STORAGE_KEYS.CURRENT_TEAM]) 
    || teams.find(t => t.name === (config.teamName || CHATOPS_CONFIG.DEFAULT_TEAM)) 
    || teams[0];
  
  state.setTeam(defaultTeam);
  select.value = defaultTeam.id;
  select.addEventListener('change', (e) => {
    state.setTeam(teams.find(t => t.id === e.target.value));
    chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_TEAM]: e.target.value });
    resetAllTabs();
  });
}

/**
 * Handles tab switching UI logic
 */
function setupTabs() {
  const switchTab = (id) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === id));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${id}`));
  };
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  
  // Handle sync badge clicks to navigate to settings sync section
  ['syncBadgeTasks', 'syncBadgeNotes'].forEach(badgeId => {
    document.getElementById(badgeId)?.addEventListener('click', () => {
      switchTab('settings');
      
      // Select the sync sub-tab in Cài đặt
      const syncSubTabBtn = document.querySelector(`#settingsSubTabs .memo-sub-tab[data-section="sync"]`);
      if (syncSubTabBtn) {
        syncSubTabBtn.click();
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
  
  chrome.storage.local.get([STORAGE_KEYS.SIDEPANEL_TAB], (res) => { 
    if (res[STORAGE_KEYS.SIDEPANEL_TAB]) { 
      switchTab(res[STORAGE_KEYS.SIDEPANEL_TAB]); 
      chrome.storage.local.remove(STORAGE_KEYS.SIDEPANEL_TAB); 
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
      const id = btn.dataset.id;
      const cardEl = document.getElementById(`item_${id}`);
      if (cardEl) {
        const bodyEl = cardEl.querySelector('.collapsible-body');
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


