/**
 * Background Service Worker — ChatOps Chrome Extension
 */

import { getConfig, getMyProfile, addPostReaction, deletePostReaction, deletePost, searchUsers, getUsersByIds, getPostReactions, getPostThread, callAiProvider } from './api/index.js';
import { syncCookies, setupCookieSync } from './background/cookie-sync.js';
import { 
  handleMentionCheck, 
  handleTaskAlarm 
} from './background/alarms.js';
import { 
  setupSidePanel, 
  toggleSidePanel, 
  sidePanelState,
  getWindowTypeForTab,
  initializePanelManager
} from './background/panel-manager.js';
import { ALARMS, UI_CONFIG, MESSAGE_TYPES, CHATOPS_CONFIG, STORAGE_KEYS } from './constants.js';
import { language, loadLanguage } from './lang.js';
import { formatDateTime } from './utils/date.js';

/**
 * Register Context Menu items for highlighting text
 */
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'quick-task',
      title: 'Tạo nhanh công việc (🎯)',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'quick-note',
      title: 'Tạo nhanh ghi chú (📒)',
      contexts: ['selection']
    });
  });
}

/**
 * Initialize extension services
 */
async function initialize() {
  await initializePanelManager();
  setupSidePanel();
  setupCookieSync();
  syncCookies();
  setupContextMenus();
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

  if (details?.reason === 'update' || details?.reason === 'install') {
    const currentVersion = chrome.runtime.getManifest().version;
    const versionKey = `whats_new_seen_${currentVersion}`;
    chrome.storage.local.set({ [versionKey]: false });

    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }

  initialize();
});

// Handle Context Menu item clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[ChatOps Ext] Context menu clicked:', info.menuItemId, 'text:', info.selectionText);
  if (tab && (info.menuItemId === 'quick-task' || info.menuItemId === 'quick-note')) {
    console.log('[ChatOps Ext] Sending context menu message to tab ID:', tab.id);
    chrome.tabs.sendMessage(tab.id, {
      type: 'OPEN_QUICK_NOTE_FROM_CONTEXT_MENU',
      text: info.selectionText,
      mode: info.menuItemId === 'quick-task' ? 'task' : 'note'
    }).then(() => {
      console.log('[ChatOps Ext] Message successfully received by content script');
    }).catch(err => {
      console.warn('[ChatOps Ext] Failed to send context menu message to tab:', err);
    });
  }
});

// Initialize on startup
initialize();

// Handle clicks on the extension toolbar icon (fires on tabs where native sidepanel is disabled)
chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id) {
    toggleSidePanel(tab.id);
  }
});

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
      if (tabId) {
        const winType = getWindowTypeForTab(tabId);
        if (winType === 'app' || winType === 'popup') {
          chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PWA_SIDE_PANEL', forceState: 'OPEN' }).catch(() => {});
        } else if (chrome.sidePanel) {
          chrome.sidePanel.setOptions({
            tabId,
            path: 'sidepanel/sidepanel.html',
            enabled: true
          });
          chrome.sidePanel.open({ tabId }).catch((err) => {
            console.warn('[ChatOps Ext] sidePanel.open failed in message handler:', err);
            chrome.storage.local.get(['active_language'], (res) => {
              const isVi = res.active_language !== 'en';
              const msg = isVi 
                ? '🔔 Vui lòng click vào biểu tượng ChatOps++ trên thanh công cụ trình duyệt để mở Panel!' 
                : '🔔 Please click the ChatOps++ icon on the browser toolbar to open the Panel!';
              chrome.tabs.sendMessage(tabId, { type: 'SHOW_TOAST', message: msg }).catch(() => {});
            });
          });
        }
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

    case MESSAGE_TYPES.SKIP_TASK_DAILY:
      handleSkipTaskDaily(message.taskId, sendResponse);
      return true;

    case MESSAGE_TYPES.GET_CONFIG:
      getConfig().then(sendResponse);
      return true;

    case MESSAGE_TYPES.SYNC_COOKIES_NOW:
      syncCookies().then(() => sendResponse({ ok: true }));
      return true;

    case MESSAGE_TYPES.SPAM_POST_REACTIONS:
      handleSpamReactions(message.postId, sendResponse);
      return true;

    case MESSAGE_TYPES.RETRACT_POST_REACTIONS:
      handleRetractReactions(message.postId, sendResponse);
      return true;

    case MESSAGE_TYPES.CLONE_POST_REACTIONS:
      handleCloneReactions(message.postId, sendResponse);
      return true;

    case MESSAGE_TYPES.DELETE_POST:
      deletePost(message.postId)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case MESSAGE_TYPES.GET_MY_PROFILE:
      getMyProfile()
        .then((profile) => sendResponse({ ok: true, profile }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case MESSAGE_TYPES.RESOLVE_DISPLAY_NAME:
      handleResolveDisplayName(message.displayName, sendResponse);
      return true;

    case MESSAGE_TYPES.RESOLVE_USER_ID:
      handleResolveUserId(message.userId, sendResponse);
      return true;

    case MESSAGE_TYPES.GET_POST_THREAD:
      handleGetPostThread(message.postId, sendResponse);
      return true;

    case MESSAGE_TYPES.CALL_AI:
      callAiProvider(message.prompt, message.apiKey, message.provider, { model: message.model })
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case MESSAGE_TYPES.TEST_NOTIFICATION:
      const testType = message.notificationType || 'both';
      loadLanguage().then(() => {
        let triggeredSystem = false;
        let triggeredInPage = false;

        // 1. Send in-page banner test
        if (testType === 'both' || testType === 'in-page') {
          triggeredInPage = true;
          chrome.tabs.query({ url: `${CHATOPS_CONFIG.DEFAULT_URL}/*` }).then((tabs) => {
            for (const tab of tabs) {
              chrome.tabs.sendMessage(tab.id, {
                type: MESSAGE_TYPES.SHOW_REMINDER,
                message: language.testInPageBannerMsg,
                taskId: 'test_task',
                postId: null,
                teamName: null,
                isTask: true
              }).catch(() => {});
            }
          });
        }

        // 2. Trigger OS notification test
        if (testType === 'both' || testType === 'system') {
          triggeredSystem = true;
          chrome.notifications.create('test_notification_' + Date.now(), {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: language.testSystemTitle,
            message: language.testSystemMsg,
            priority: 2,
            requireInteraction: true
          }, (notificationId) => {
            if (chrome.runtime.lastError) {
              console.error('[ChatOps Ext] Test notification error:', chrome.runtime.lastError.message);
              sendResponse({ ok: false, error: chrome.runtime.lastError.message, system: true, inPage: triggeredInPage });
            } else {
              console.log('[ChatOps Ext] Test notification success:', notificationId);
              sendResponse({ ok: true, system: true, inPage: triggeredInPage });
            }
          });
          return;
        }

        // If only in-page was triggered
        sendResponse({ ok: true, system: false, inPage: true });
      });
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
      if (task.repeatDaily) {
        // Reschedule for tomorrow
        const currentReminder = new Date(task.reminder || Date.now());
        currentReminder.setDate(currentReminder.getDate() + 1);
        while (currentReminder.getTime() <= Date.now()) {
          currentReminder.setDate(currentReminder.getDate() + 1);
        }
        task.reminder = formatDateTime(currentReminder);
        chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos }, () => {
          chrome.alarms.create(taskId, { when: currentReminder.getTime() });
          sendResponse({ ok: true });
        });
      } else {
        chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos }, () => sendResponse({ ok: true }));
      }
    } else {
      sendResponse({ ok: false, error: 'Task not found' });
    }
  });
}

/**
 * Reschedules a daily task for tomorrow without marking it as done
 */
function handleSkipTaskDaily(taskId, sendResponse) {
  chrome.alarms.clear(taskId);
  chrome.storage.local.get([STORAGE_KEYS.MEMOS], (res) => {
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const task = memos.find(m => m.id === taskId);
    if (task) {
      if (task.repeatDaily) {
        // Reschedule for tomorrow
        const currentReminder = new Date(task.reminder || Date.now());
        currentReminder.setDate(currentReminder.getDate() + 1);
        while (currentReminder.getTime() <= Date.now()) {
          currentReminder.setDate(currentReminder.getDate() + 1);
        }
        task.reminder = formatDateTime(currentReminder);
        chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos }, () => {
          chrome.alarms.create(taskId, { when: currentReminder.getTime() });
          sendResponse({ ok: true });
        });
      } else {
        sendResponse({ ok: true });
      }
    } else {
      sendResponse({ ok: false, error: 'Task not found' });
    }
  });
}

/**
 * Resolves a display name to a Mattermost login username by querying the search API
 */
async function handleResolveDisplayName(displayName, sendResponse) {
  try {
    const term = displayName.trim();
    if (!term) {
      sendResponse({ ok: false, error: 'Empty display name' });
      return;
    }
    const users = await searchUsers(term);
    if (users && users.length > 0) {
      const cleanTerm = term.toLowerCase();
      let bestMatch = users[0];
      for (const u of users) {
        const full = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
        const nickname = (u.nickname || '').trim().toLowerCase();
        const username = (u.username || '').trim().toLowerCase();
        if (full === cleanTerm || nickname === cleanTerm || username === cleanTerm) {
          bestMatch = u;
          break;
        }
      }
      sendResponse({ ok: true, username: bestMatch.username });
    } else {
      sendResponse({ ok: false, error: 'User not found' });
    }
  } catch (err) {
    console.error('[ChatOps Ext] handleResolveDisplayName error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}


/**
 * Resolves a Mattermost user ID to a login username
 */
async function handleResolveUserId(userId, sendResponse) {
  try {
    if (!userId) {
      sendResponse({ ok: false, error: 'Empty userId' });
      return;
    }
    const users = await getUsersByIds([userId]);
    if (users && users.length > 0 && users[0].username) {
      sendResponse({ ok: true, username: users[0].username });
    } else {
      sendResponse({ ok: false, error: 'User not found' });
    }
  } catch (err) {
    console.error('[ChatOps Ext] handleResolveUserId error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

/**
 * Fetches all posts in a thread and maps user IDs to usernames
 */
async function handleGetPostThread(postId, sendResponse) {
  try {
    if (!postId) {
      sendResponse({ ok: false, error: 'Empty postId' });
      return;
    }
    const thread = await getPostThread(postId);
    if (!thread || !thread.posts) {
      sendResponse({ ok: false, error: 'Thread not found' });
      return;
    }

    // Collect all unique user IDs from the thread
    const userIds = [...new Set(Object.values(thread.posts).map(p => p.user_id))].filter(Boolean);

    // Fetch usernames for these user IDs
    const userMap = {};
    if (userIds.length > 0) {
      try {
        const users = await getUsersByIds(userIds);
        if (Array.isArray(users)) {
          users.forEach(u => {
            if (u.id && u.username) {
              userMap[u.id] = u.username;
            }
          });
        }
      } catch (err) {
        console.warn('[ChatOps Ext] Failed to resolve user ids for thread:', err);
      }
    }

    sendResponse({ ok: true, thread, userMap });
  } catch (err) {
    console.error('[ChatOps Ext] handleGetPostThread error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

/**
 * Clones reactions from other users on a specific post
 */
async function handleCloneReactions(postId, sendResponse) {
  try {
    const reactions = await getPostReactions(postId);
    if (!Array.isArray(reactions) || reactions.length === 0) {
      sendResponse({ ok: false, error: 'No reactions on this post to clone' });
      return;
    }

    const me = await getMyProfile();
    if (!me || !me.id) {
      sendResponse({ ok: false, error: 'User profile not found' });
      return;
    }

    // Get all unique emojis that you have already reacted with
    const myReactedEmojis = new Set(reactions.filter(r => r.user_id === me.id).map(r => r.emoji_name));

    // Get all unique emojis present on the post that you have NOT reacted with yet
    const uniqueEmojis = [...new Set(reactions.map(r => r.emoji_name))].filter(emoji => !myReactedEmojis.has(emoji));

    if (uniqueEmojis.length === 0) {
      sendResponse({ ok: false, error: 'You have already reacted to all existing emojis on this post' });
      return;
    }

    // Call reaction API sequentially to avoid Mattermost rate limiting, wrapped in a local try-catch
    for (const emoji of uniqueEmojis) {
      try {
        await addPostReaction(me.id, postId, emoji);
      } catch (reactionErr) {
        console.warn(`[ChatOps Ext] Failed to clone reaction :${emoji}:`, reactionErr);
      }
      await new Promise(r => setTimeout(r, 120)); // 120ms sequential gap
    }

    sendResponse({ ok: true });
  } catch (err) {
    console.error('[ChatOps Ext] handleCloneReactions error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

function getActiveEmojisFromSettings(settings) {
  let emojis = [];
  if (settings.reactionGroups && settings.activeReactionGroupId !== undefined) {
    const activeGroupId = settings.activeReactionGroupId;
    const activeGroup = settings.reactionGroups.find(g => g.id === activeGroupId);
    if (activeGroup && Array.isArray(activeGroup.emojis)) {
      emojis = activeGroup.emojis;
    }
  }
  if (emojis.length === 0) {
    if (Array.isArray(settings.spamEmojis)) {
      emojis = settings.spamEmojis;
    } else if (typeof settings.spamEmojis === 'string') {
      emojis = settings.spamEmojis.split(',').map(e => e.trim()).filter(Boolean);
    } else {
      emojis = ['thumbsup', 'heart', 'fire', 'rocket', 'tada', 'laughing', 'smile', 'wink', 'heart_eyes', 'kissing_heart'];
    }
  }
  return emojis;
}

/**
 * Triggers sequential reaction spamming on a specific post
 */
async function handleSpamReactions(postId, sendResponse) {
  try {
    const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
    const settings = res[STORAGE_KEYS.SETTINGS] || {};
    const emojis = getActiveEmojisFromSettings(settings);

    if (emojis.length === 0) {
      sendResponse({ ok: false, error: 'No emojis configured' });
      return;
    }

    const me = await getMyProfile();
    if (!me || !me.id) {
      sendResponse({ ok: false, error: 'User profile not found' });
      return;
    }

    // Call reaction API sequentially to avoid mattermost rate limiting
    for (const emoji of emojis) {
      await addPostReaction(me.id, postId, emoji);
      await new Promise(r => setTimeout(r, 150)); // 150ms gap
    }

    sendResponse({ ok: true });
  } catch (err) {
    console.error('[ChatOps Ext] handleSpamReactions error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

/**
 * Triggers sequential reaction retraction on a specific post
 */
async function handleRetractReactions(postId, sendResponse) {
  try {
    const me = await getMyProfile();
    if (!me || !me.id) {
      sendResponse({ ok: false, error: 'User profile not found' });
      return;
    }

    // Fetch all reactions on this post to see what reactions we have actually placed
    const reactions = await getPostReactions(postId);
    if (!Array.isArray(reactions)) {
      sendResponse({ ok: false, error: 'Failed to fetch post reactions' });
      return;
    }

    // Find all unique emojis that you (me.id) have reacted with
    const myReactedEmojis = [...new Set(reactions.filter(r => r.user_id === me.id).map(r => r.emoji_name))];

    if (myReactedEmojis.length === 0) {
      sendResponse({ ok: false, error: 'No reactions on this post to retract' });
      return;
    }

    // Call delete API sequentially for all your reactions, wrapped in a local try-catch
    for (const emoji of myReactedEmojis) {
      try {
        await deletePostReaction(me.id, postId, emoji);
      } catch (reactionErr) {
        console.warn(`[ChatOps Ext] Failed to retract reaction :${emoji}:`, reactionErr);
      }
      await new Promise(r => setTimeout(r, 120)); // 120ms sequential gap
    }

    sendResponse({ ok: true });
  } catch (err) {
    console.error('[ChatOps Ext] handleRetractReactions error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

// Handle native OS notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId) return;
  
  try {
    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const task = memos.find(m => m.id === notificationId);
    
    if (task) {
      // Build permalink deep link or fallback to chatops base URL
      let targetUrl = CHATOPS_CONFIG.DEFAULT_URL;
      if (task.postId && task.teamName) {
        targetUrl = `${CHATOPS_CONFIG.DEFAULT_URL}/${task.teamName}/pl/${task.postId}`;
      } else if (task.teamName) {
        targetUrl = `${CHATOPS_CONFIG.DEFAULT_URL}/${task.teamName}`;
      }
      
      // Save side panel tab setting to tasks
      await chrome.storage.local.set({ [STORAGE_KEYS.SIDEPANEL_TAB]: 'tasks' });
      
      // Query if we already have an open ChatOps tab
      const tabs = await chrome.tabs.query({ url: `${CHATOPS_CONFIG.DEFAULT_URL}/*` });
      let activeTabId = null;
      if (tabs.length > 0) {
        // Focus the existing tab and update its URL to the target workspace
        const tab = tabs[0];
        await chrome.tabs.update(tab.id, { url: targetUrl, active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        activeTabId = tab.id;
      } else {
        // Create new tab if none exists
        const newTab = await chrome.tabs.create({ url: targetUrl });
        activeTabId = newTab.id;
      }
      
      // Open the side panel for this tab
      if (activeTabId) {
        chrome.tabs.get(activeTabId, (currentTab) => {
          if (chrome.runtime.lastError || !currentTab) return;
          chrome.windows.get(currentTab.windowId, (win) => {
            if (win && (win.type === 'app' || win.type === 'popup')) {
              chrome.tabs.sendMessage(activeTabId, { type: 'TOGGLE_PWA_SIDE_PANEL', forceState: 'OPEN' }).catch(() => {});
            } else if (chrome.sidePanel) {
              chrome.sidePanel.open({ tabId: activeTabId }).catch(() => {
                chrome.storage.local.get(['active_language'], (res) => {
                  const isVi = res.active_language !== 'en';
                  const msg = isVi 
                    ? '🔔 Vui lòng click vào biểu tượng ChatOps++ trên thanh công cụ trình duyệt để mở Panel!' 
                    : '🔔 Please click the ChatOps++ icon on the browser toolbar to open the Panel!';
                  chrome.tabs.sendMessage(activeTabId, { type: 'SHOW_TOAST', message: msg }).catch(() => {});
                });
              });
            }
          });
        });
        // Send a real-time message to switch to the "tasks" tab in case it's already open
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tab: 'tasks' }).catch(() => {});
        }, 300);
      }
    }
  } catch (err) {
    console.error('[ChatOps Ext] Failed to handle notification click:', err);
  }
});

console.log('[ChatOps Extension] Background service worker initialized');
