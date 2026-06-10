import { CHATOPS_CONFIG, MESSAGE_TYPES } from '../constants.js';

// Tracks side panel state for each tab
export const sidePanelState = new Map();

// Tracks window types and tab-to-window mappings synchronously
export const windowTypes = new Map();
export const tabWindowIds = new Map();

// Initialize maps and listeners
if (typeof chrome !== 'undefined' && chrome.windows && chrome.tabs) {
  chrome.windows.onCreated.addListener((win) => {
    windowTypes.set(win.id, win.type);
  });

  chrome.windows.onRemoved.addListener((winId) => {
    windowTypes.delete(winId);
  });

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id && tab.windowId) tabWindowIds.set(tab.id, tab.windowId);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    tabWindowIds.delete(tabId);
  });

  chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    tabWindowIds.set(tabId, attachInfo.newWindowId);
  });
}

export function initializePanelManager() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.getAll({ populate: true }, (windows) => {
        for (const win of windows) {
          windowTypes.set(win.id, win.type);
          if (win.tabs) {
            for (const t of win.tabs) {
              tabWindowIds.set(t.id, win.id);
            }
          }
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getWindowTypeForTab(tabId) {
  const winId = tabWindowIds.get(tabId);
  if (winId === undefined) return undefined;
  
  const cachedType = windowTypes.get(winId);
  if (cachedType !== undefined) {
    return cachedType;
  }
  
  // Try to query asynchronously to self-heal the cache for future interactions
  chrome.windows.get(winId, (win) => {
    if (win) {
      windowTypes.set(win.id, win.type);
    }
  });
  
  return undefined;
}

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
    if (tab.id && tab.windowId) {
      tabWindowIds.set(tab.id, tab.windowId);
    }
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
    const winType = getWindowTypeForTab(tabId);
    const isPwaWin = winType === 'app' || winType === 'popup';
    
    // Disable native side panel if this is a PWA/popup window
    const shouldEnableSidePanel = isChatOps && !isPwaWin;

    await chrome.sidePanel.setOptions({
      tabId,
      path: shouldEnableSidePanel ? 'sidepanel/sidepanel.html' : undefined,
      enabled: shouldEnableSidePanel
    });
  } catch (e) {}
}

/**
 * Toggles side panel open/close
 * @param {number} tabId 
 */
export function toggleSidePanel(tabId) {
  const winType = getWindowTypeForTab(tabId);
  if (winType === 'app' || winType === 'popup') {
    // PWA window: send toggle message to content script
    chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PWA_SIDE_PANEL' }).catch(() => {});
    return;
  }

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
          chrome.storage.local.get(['active_language'], (res) => {
            const isVi = res.active_language !== 'en';
            const msg = isVi 
              ? '🔔 Vui lòng click vào biểu tượng ChatOps++ trên thanh công cụ trình duyệt để mở Panel!' 
              : '🔔 Please click the ChatOps++ icon on the browser toolbar to open the Panel!';
            chrome.tabs.sendMessage(tabId, { type: 'SHOW_TOAST', message: msg }).catch(() => {});
          });
        });
    } catch (err) {
      console.error('[ChatOps Ext] sidePanel.open exception:', err);
      chrome.storage.local.get(['active_language'], (res) => {
        const isVi = res.active_language !== 'en';
        const msg = isVi 
          ? '🔔 Vui lòng click vào biểu tượng ChatOps++ trên thanh công cụ trình duyệt để mở Panel!' 
          : '🔔 Please click the ChatOps++ icon on the browser toolbar to open the Panel!';
        chrome.tabs.sendMessage(tabId, { type: 'SHOW_TOAST', message: msg }).catch(() => {});
      });
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
