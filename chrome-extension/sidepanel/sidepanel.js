/**
 * Side Panel Orchestrator — ChatOps Chrome Extension
 */

import { state } from './state.js';
import { setup as setupSearch, reset as resetSearch, getSelects as getSearchSelects } from './tabs/search.tab.js';
import { setup as setupMentions, reset as resetMentions, getSelects as getMentionsSelects } from './tabs/mentions.tab.js';
import { setup as setupLeave, reset as resetLeave, getSelects as getLeaveSelects } from './tabs/leave.tab.js';
import { setup as setupMemo, loadMemos } from './tabs/memo.tab.js';
import { getMyProfile } from '../src/api/users.js';
import { getMyTeams } from '../src/api/teams.js';
import { getConfig } from '../src/api/client.js';
import { escapeHtml } from '../src/utils/formatter.js';
import { STORAGE_KEYS } from '../src/constants.js';
import { restoreState, setupAutoSave } from './persistence.js';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const selectEl = document.getElementById('spWorkspaceSelect');
  try {
    const [config, user, teams] = await Promise.all([getConfig(), getMyProfile(), getMyTeams()]);
    state.setConfig(config);
    state.setUser(user);
    await setupWorkspaceSelector(teams, selectEl);
    chrome.runtime.sendMessage({ type: 'SIDE_PANEL_STATE', state: 'OPEN' });
  } catch (err) {
    if (selectEl) selectEl.innerHTML = `<option value="">❌ ${err.message}</option>`;
  }

  setupSearch(state);
  setupMentions(state);
  setupLeave(state);
  setupMemo(state);
  setupTabs();
  const selectors = { ...getSearchSelects(), ...getMentionsSelects(), ...getLeaveSelects() };
  restoreState(selectors);
  setupAutoSave(selectors);
  setupStateHandlers();
}

async function setupWorkspaceSelector(teams, select) {
  if (!teams?.length) { select.innerHTML = '<option value="">Không có Workspace</option>'; return; }
  select.innerHTML = teams.map(t => `<option value="${t.id}">${escapeHtml(t.display_name)}</option>`).join('');

  const saved = await chrome.storage.local.get([STORAGE_KEYS.CURRENT_TEAM]);
  const config = state.getConfig();
  let defaultTeam = teams.find(t => t.id === saved[STORAGE_KEYS.CURRENT_TEAM]) || teams.find(t => t.name === config.teamName) || teams[0];
  
  state.setTeam(defaultTeam);
  select.value = defaultTeam.id;
  select.addEventListener('change', (e) => {
    state.setTeam(teams.find(t => t.id === e.target.value));
    chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_TEAM]: e.target.value });
    resetSearch(); resetMentions(); resetLeave();
  });
}

function setupTabs() {
  const switchTab = (id) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${id}`));
  };
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  chrome.storage.local.get(['sidePanelTab'], (res) => { if (res.sidePanelTab) { switchTab(res.sidePanelTab); chrome.storage.local.remove('sidePanelTab'); } });
}

function setupStateHandlers() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PING_SIDE_PANEL') sendResponse({ open: true });
    else if (msg.type === 'MEMO_UPDATED') loadMemos();
  });
  window.addEventListener('beforeunload', () => chrome.runtime.sendMessage({ type: 'SIDE_PANEL_STATE', state: 'CLOSED' }));
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.post-link');
    if (!link) return;
    e.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = link.href;
      if (tabs[0]?.url?.includes('chat.runsystem.vn')) chrome.tabs.update(tabs[0].id, { url });
      else chrome.tabs.create({ url });
    });
  });
}
