/**
 * Persistence Management — ChatOps Chrome Extension Sidepanel
 */

import { STORAGE_KEYS } from '../src/constants.js';

/**
 * Saves the current UI state to local storage
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
    }
  };
  chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
}

/**
 * Restores UI state from local storage
 * @param {Object} selectors - Object containing smart selectors from all tabs
 */
export function restoreState(selectors) {
  chrome.storage.local.get([STORAGE_KEYS.STATE], (res) => {
    const s = res[STORAGE_KEYS.STATE];
    if (!s) return;

    if (s.search) {
      const termsEl = document.getElementById('spSearchTerms');
      if (termsEl) termsEl.value = s.search.terms || '';
      
      const fromEl = document.getElementById('spSearchFrom');
      if (fromEl) fromEl.value = s.search.from || '';
      
      const afterEl = document.getElementById('spSearchAfter');
      if (afterEl) afterEl.value = s.search.after || '';
      
      const beforeEl = document.getElementById('spSearchBefore');
      if (beforeEl) beforeEl.value = s.search.before || '';
      
      if (s.search.inChannels && selectors.searchInMS) {
        selectors.searchInMS.setSelected(s.search.inChannels);
      }
    }
    
    if (s.mentions) {
      const hoursEl = document.getElementById('spMentionHours');
      if (hoursEl) hoursEl.value = s.mentions.hours || '24';
      
      const directEl = document.getElementById('spMentionDirect');
      if (directEl) directEl.checked = s.mentions.direct;
      
      const hereEl = document.getElementById('spMentionHere');
      if (hereEl) hereEl.checked = s.mentions.here;
      
      const channelEl = document.getElementById('spMentionChannel');
      if (channelEl) channelEl.checked = s.mentions.channel;
      
      if (s.mentions.channels && selectors.mentionChannelMS) {
        selectors.mentionChannelMS.setSelected(s.mentions.channels);
      }
    }
  });
}

/**
 * Sets up automatic saving on any input change
 * @param {Object} selectors - Tab selectors
 */
export function setupAutoSave(selectors) {
  const handler = () => saveState(selectors);
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('change', handler);
    input.addEventListener('input', handler);
  });
}
