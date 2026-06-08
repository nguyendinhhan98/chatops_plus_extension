import { CHATOPS_CONFIG, MESSAGE_TYPES } from '../constants.js';

// Tracks side panel state for each tab
export const sidePanelState = new Map();

/**
 * Initializes side panel settings and behavior
 */
export function setupSidePanel() {
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    // Disable by default (enabled only for ChatOps domain)
    chrome.sidePanel.setOptions({ enabled: false });
  }

  // Handle tab updates
  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (!tab.url) return;
    updatePanelVisibility(tabId, tab.url);
  });

  // Handle tab activation (switching tabs)
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (!tab.url) return;
      updatePanelVisibility(activeInfo.tabId, tab.url);
    } catch (e) {}
  });

  // Query and initialize visibility for all existing tabs on load
  chrome.tabs.query({}, (tabs) => {
    if (tabs && tabs.length > 0) {
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          updatePanelVisibility(tab.id, tab.url);
        }
      }
    }
  });
}

/**
 * Enables/Disables side panel based on URL
 * @param {number} tabId 
 * @param {string} url 
 */
export async function updatePanelVisibility(tabId, url) {
  try {
    const isChatOps = url.includes(CHATOPS_CONFIG.DOMAIN);
    await chrome.sidePanel.setOptions({
      tabId,
      path: isChatOps ? 'sidepanel/sidepanel.html' : undefined,
      enabled: isChatOps
    });
  } catch (e) {}
}

/**
 * Toggles side panel open/close
 * @param {number} tabId 
 */
export function toggleSidePanel(tabId) {
  const currentState = sidePanelState.get(tabId) || 'CLOSED';
  
  if (currentState === 'CLOSED') {
    try {
      chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel/sidepanel.html',
        enabled: true
      });
      chrome.sidePanel.open({ tabId })
        .then(() => {
          sidePanelState.set(tabId, 'OPEN');
          chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.SIDE_PANEL_UPDATE, state: 'OPEN' });
        })
        .catch((err) => {
          console.error('[ChatOps Ext] sidePanel.open failed:', err);
        });
    } catch (err) {
      console.error('[ChatOps Ext] sidePanel.open exception:', err);
    }
  } else {
    try {
      chrome.sidePanel.setOptions({ tabId, enabled: false }).then(() => {
        chrome.sidePanel.setOptions({ tabId, enabled: true, path: 'sidepanel/sidepanel.html' }).then(() => {
          sidePanelState.set(tabId, 'CLOSED');
          chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.SIDE_PANEL_UPDATE, state: 'CLOSED' });
        }).catch(() => {});
      }).catch(() => {});
    } catch (err) {
      console.error('[ChatOps Ext] sidePanel toggle close failed:', err);
    }
  }
}
