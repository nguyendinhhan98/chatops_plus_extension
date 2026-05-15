/**
 * Persistence Management — ChatOps Chrome Extension Sidepanel
 */

import { STORAGE_KEYS } from '../src/constants.js';

/**
 * Save current UI state to storage
 * @param {Object} selectors - Object containing smart selectors from all tabs
 */
export function saveState(selectors) {
  const state = {
    search: {
      terms: document.getElementById('spSearchTerms')?.value || '',
      from: document.getElementById('spSearchFrom')?.value || '',
      inChannels: selectors.searchInMS ? selectors.searchInMS.getSelected() : [],
      after: document.getElementById('spSearchAfter')?.value || '',
      before: document.getElementById('spSearchBefore')?.value || '',
    },
    mentions: {
      hours: document.getElementById('spMentionHours')?.value || '24',
      direct: document.getElementById('spMentionDirect')?.checked !== false,
      here: document.getElementById('spMentionHere')?.checked || false,
      channel: document.getElementById('spMentionChannel')?.checked || false,
      channels: selectors.mentionChannelMS ? selectors.mentionChannelMS.getSelected() : []
    },
    leave: {
      user: document.getElementById('spLeaveUser')?.value || '',
      channels: selectors.leaveChannelMS ? selectors.leaveChannelMS.getSelected() : [],
      from: document.getElementById('spLeaveFrom')?.value || '',
      to: document.getElementById('spLeaveTo')?.value || '',
    }
  };
  chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
}

/**
 * Restore UI state from storage
 * @param {Object} selectors - Object containing smart selectors from all tabs
 */
export function restoreState(selectors) {
  chrome.storage.local.get([STORAGE_KEYS.STATE], (res) => {
    const s = res[STORAGE_KEYS.STATE];
    if (!s) return;

    if (s.search) {
      if (document.getElementById('spSearchTerms')) document.getElementById('spSearchTerms').value = s.search.terms || '';
      if (document.getElementById('spSearchFrom')) document.getElementById('spSearchFrom').value = s.search.from || '';
      if (document.getElementById('spSearchAfter')) document.getElementById('spSearchAfter').value = s.search.after || '';
      if (document.getElementById('spSearchBefore')) document.getElementById('spSearchBefore').value = s.search.before || '';
      if (s.search.inChannels && selectors.searchInMS) selectors.searchInMS.setSelected(s.search.inChannels);
    }
    
    if (s.mentions) {
      if (document.getElementById('spMentionHours')) document.getElementById('spMentionHours').value = s.mentions.hours || '24';
      if (document.getElementById('spMentionDirect') !== null) document.getElementById('spMentionDirect').checked = s.mentions.direct;
      if (document.getElementById('spMentionHere') !== null) document.getElementById('spMentionHere').checked = s.mentions.here;
      if (document.getElementById('spMentionChannel') !== null) document.getElementById('spMentionChannel').checked = s.mentions.channel;
      if (s.mentions.channels && selectors.mentionChannelMS) selectors.mentionChannelMS.setSelected(s.mentions.channels);
    }
    
    if (s.leave) {
      if (document.getElementById('spLeaveUser')) document.getElementById('spLeaveUser').value = s.leave.user || '';
      if (document.getElementById('spLeaveFrom')) document.getElementById('spLeaveFrom').value = s.leave.from || '';
      if (document.getElementById('spLeaveTo')) document.getElementById('spLeaveTo').value = s.leave.to || '';
      if (s.leave.channels && selectors.leaveChannelMS) selectors.leaveChannelMS.setSelected(s.leave.channels);
    }
  });
}

/**
 * Setup auto-save listeners
 */
export function setupAutoSave(selectors) {
  const handler = () => saveState(selectors);
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('change', handler);
    input.addEventListener('input', handler);
  });
}
