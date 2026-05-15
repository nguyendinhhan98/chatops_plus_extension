/**
 * Background Service Worker — ChatOps Chrome Extension
 */

import { getConfig } from './api/index.js';
import { syncCookies, setupCookieSync } from './background/cookie-sync.js';
import { 
  handleMentionCheck, 
  handleTaskAlarm 
} from './background/alarms.js';
import { 
  setupSidePanel, 
  toggleSidePanel, 
  sidePanelState 
} from './background/panel-manager.js';
import { ALARMS, UI_CONFIG, MESSAGE_TYPES, CHATOPS_CONFIG, STORAGE_KEYS } from './constants.js';

/**
 * Initialize extension services
 */
function initialize() {
  setupSidePanel();
  setupCookieSync();
  syncCookies();
}

/**
 * Initialize extension on installation or update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ChatOps Extension] Installed/Updated:', details?.reason);

  // Set up mention check alarm
  chrome.alarms.create(ALARMS.MENTION_CHECK, {
    delayInMinutes: 1,
    periodInMinutes: UI_CONFIG.MENTION_CHECK_INTERVAL_MINUTES,
  });

  initialize();
});

// Initialize on startup
initialize();

/**
 * Alarm listener for periodic tasks
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARMS.MENTION_CHECK) {
    handleMentionCheck();
  } else if (alarm.name.startsWith(ALARMS.TASK_PREFIX)) {
    handleTaskAlarm(alarm.name);
  }
});

/**
 * Global Message Listener
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case MESSAGE_TYPES.OPEN_SIDE_PANEL:
      if (chrome.sidePanel && tabId) {
        chrome.sidePanel.open({ tabId });
      }
      sendResponse({ ok: true });
      break;

    case MESSAGE_TYPES.TOGGLE_SIDE_PANEL:
      if (tabId) toggleSidePanel(tabId);
      sendResponse({ ok: true });
      break;

    case MESSAGE_TYPES.SIDE_PANEL_STATE:
      if (tabId) {
        sidePanelState.set(tabId, message.state);
        chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.SIDE_PANEL_UPDATE, state: message.state });
      }
      sendResponse({ ok: true });
      break;

    case MESSAGE_TYPES.CHECK_MENTIONS_NOW:
      chrome.alarms.create(ALARMS.MENTION_CHECK, { delayInMinutes: 0 });
      sendResponse({ ok: true });
      break;

    case MESSAGE_TYPES.RESET_BADGE:
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ ok: true });
      break;
    
    case MESSAGE_TYPES.PING_SIDE_PANEL:
      sendResponse({ open: true });
      break;

    case MESSAGE_TYPES.SET_TASK_ALARM:
      chrome.alarms.create(message.taskId, { when: message.time });
      sendResponse({ ok: true });
      break;

    case MESSAGE_TYPES.MARK_TASK_DONE:
      handleMarkTaskDone(message.taskId, sendResponse);
      return true; // Keep channel open for async response

    case MESSAGE_TYPES.GET_CONFIG:
      getConfig().then(sendResponse);
      return true;

    case MESSAGE_TYPES.SYNC_COOKIES_NOW:
      syncCookies().then(() => sendResponse({ ok: true }));
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Marks a task as completed and clears its alarm
 */
function handleMarkTaskDone(taskId, sendResponse) {
  chrome.alarms.clear(taskId);
  chrome.storage.local.get([STORAGE_KEYS.MEMOS], (res) => {
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const task = memos.find(m => m.id === taskId);
    if (task) {
      task.done = true;
      task.doneAt = Date.now();
      chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos }, () => sendResponse({ ok: true }));
    } else {
      sendResponse({ ok: false, error: 'Task not found' });
    }
  });
}

console.log('[ChatOps Extension] Background service worker initialized');
