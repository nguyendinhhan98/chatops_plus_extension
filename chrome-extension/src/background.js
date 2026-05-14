/**
 * Background Service Worker — ChatOps Chrome Extension
 *
 * Responsibilities:
 * - Periodic check missed mentions via chrome.alarms
 * - Update badge count
 * - Message passing giữa popup/sidepanel
 * - Quản lý Side Panel
 */

import { getMyProfile } from './api/users.js';
import { getMyChannelMembers } from './api/channels.js';
import { getTeamByName } from './api/teams.js';
import { getConfig } from './api/client.js';

// ─── Alarm: Kiểm tra mention mỗi 5 phút ───
const MENTION_ALARM = 'check-mentions';
const MENTION_INTERVAL_MINUTES = 5;

// Lưu trạng thái side panel của từng tab
const sidePanelState = new Map();

// ─── Auto Sync Cookies ───
async function syncCookies() {
  try {
    const config = await chrome.storage.local.get(['chatopsUrl']);
    const url = config.chatopsUrl || 'https://chat.runsystem.vn';
    
    const [authToken, csrfToken] = await Promise.all([
      chrome.cookies.get({ url, name: 'MMAUTHTOKEN' }),
      chrome.cookies.get({ url, name: 'MMCSRF' })
    ]);

    if (authToken || csrfToken) {
      const updates = {};
      if (authToken) updates.cookie = `MMAUTHTOKEN=${authToken.value}`;
      if (csrfToken) updates.csrf = `MMCSRF=${csrfToken.value}`;
      await chrome.storage.local.set(updates);
      console.log('[ChatOps Ext] Cookies auto-synced:', Object.keys(updates));
    }
  } catch (err) {
    console.warn('[ChatOps Ext] Cookie sync failed:', err);
  }
}

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('chat.runsystem.vn') && !changeInfo.removed) {
    if (['MMAUTHTOKEN', 'MMCSRF'].includes(changeInfo.cookie.name)) {
      syncCookies();
    }
  }
});

/**
 * Khởi tạo extension khi install hoặc update.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ChatOps Extension] Installed/Updated:', details.reason);

  // Tạo alarm kiểm tra mention định kỳ
  chrome.alarms.create(MENTION_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: MENTION_INTERVAL_MINUTES,
  });

  // Thiết lập Side Panel behavior: Mở side panel khi click vào icon extension
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    // Tắt Side Panel ở phạm vi toàn cục (chỉ bật trên chat.runsystem.vn)
    chrome.sidePanel.setOptions({ enabled: false });
  }

  // Đồng bộ cookie lần đầu
  syncCookies();
});

// Lắng nghe sự kiện tải trang để bật Side Panel đúng tab
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  try {
    if (tab.url.includes('chat.runsystem.vn')) {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel/sidepanel.html',
        enabled: true
      });
    } else {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    }
  } catch (e) {}
});

// Lắng nghe sự kiện chuyển tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url) return;
    if (tab.url.includes('chat.runsystem.vn')) {
      await chrome.sidePanel.setOptions({
        tabId: activeInfo.tabId,
        path: 'sidepanel/sidepanel.html',
        enabled: true
      });
    } else {
      await chrome.sidePanel.setOptions({
        tabId: activeInfo.tabId,
        enabled: false
      });
    }
  } catch (e) {}
});

/**
 * Xử lý alarm: kiểm tra mention hoặc nhắc nhở ghi chú.
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === MENTION_ALARM) {
    handleMentionCheck();
    return;
  }
  // Task alarm: nhắc lặp 5 phút
  if (alarm.name.startsWith('task_')) {
    handleTaskAlarm(alarm.name);
  }
});

async function handleMentionCheck() {
  try {
    const config = await getConfig();
    if (!config.cookie && !config.csrf) return;

    const me = await getMyProfile();
    const team = await getTeamByName(config.teamName || 'dn');
    const members = await getMyChannelMembers(team.id);

    const totalMentions = members.reduce((sum, m) => sum + (m.mention_count || 0), 0);

    if (totalMentions > 0) {
      chrome.action.setBadgeText({ text: String(totalMentions) });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.warn('[ChatOps Extension] Mention check failed:', err.message);
  }
}

async function handleTaskAlarm(taskId) {
  try {
    const res = await chrome.storage.local.get(['memos']);
    const memos = res.memos || [];
    const task = memos.find(m => m.id === taskId);

    if (!task) {
      console.warn('[ChatOps Ext] Task not found, clearing alarm:', taskId);
      chrome.alarms.clear(taskId);
      return;
    }

    // Nếu đã done → không nhắc nữa
    if (task.done) {
      chrome.alarms.clear(taskId);
      return;
    }

    // Ghép nội dung nhắc
    let message = '';
    if (task.postText) message += task.postText.slice(0, 100);
    if (task.note) message += (message ? ' — ' : '') + task.note;
    if (!message) message = 'Bạn có một task chưa hoàn thành.';

    // Gửi banner tới tất cả tab ChatOps
    const tabs = await chrome.tabs.query({ url: 'https://chat.runsystem.vn/*' });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_REMINDER',
        message,
        taskId,
        isTask: true
      }).catch(() => {});
    }

    // Đặt alarm lại sau 5 phút nếu task chưa xong
    chrome.alarms.create(taskId, { delayInMinutes: 5 });
    console.log('[ChatOps Ext] Task alarm fired and rescheduled:', taskId);

  } catch (err) {
    console.error('[ChatOps Ext] handleTaskAlarm error:', err);
  }
}

/**
 * Message passing — nhận yêu cầu từ popup/sidepanel.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OPEN_SIDE_PANEL':
      if (chrome.sidePanel && sender.tab) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
      }
      sendResponse({ ok: true });
      break;

    case 'TOGGLE_SIDE_PANEL': {
      const tabId = sender.tab.id;
      const currentState = sidePanelState.get(tabId) || 'CLOSED';
      
      console.log(`[ChatOps Ext] Toggle request for tab ${tabId}. State in memory: ${currentState}`);

      if (currentState === 'CLOSED') {
        // Quan trọng: Phải gọi open() ngay lập tức để giữ "User Gesture"
        chrome.sidePanel.open({ tabId }).then(() => {
          sidePanelState.set(tabId, 'OPEN');
          chrome.tabs.sendMessage(tabId, { type: 'SIDE_PANEL_UPDATE', state: 'OPEN' });
        }).catch(err => {
          console.error('[ChatOps Ext] sidePanel.open failed:', err);
        });
      } else {
        // Lệnh đóng không yêu cầu User Gesture nên có thể dùng Promise/callback
        chrome.sidePanel.setOptions({ tabId, enabled: false }).then(() => {
          chrome.sidePanel.setOptions({ tabId, enabled: true, path: 'sidepanel/sidepanel.html' });
          sidePanelState.set(tabId, 'CLOSED');
          chrome.tabs.sendMessage(tabId, { type: 'SIDE_PANEL_UPDATE', state: 'CLOSED' });
        });
      }
      sendResponse({ ok: true });
      break;
    }

    case 'SIDE_PANEL_STATE':
      if (sender.tab) {
        sidePanelState.set(sender.tab.id, message.state);
        // Đồng bộ icon ở content script
        chrome.tabs.sendMessage(sender.tab.id, { type: 'SIDE_PANEL_UPDATE', state: message.state });
      }
      sendResponse({ ok: true });
      break;

    case 'CHECK_MENTIONS_NOW':
      // Force check mention ngay lập tức
      chrome.alarms.create(MENTION_ALARM, { delayInMinutes: 0 });
      sendResponse({ ok: true });
      break;

    case 'RESET_BADGE':
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ ok: true });
      break;
    
    case 'PING_SIDE_PANEL':
      sendResponse({ open: true });
      break;

    case 'SET_TASK_ALARM':
      chrome.alarms.create(message.taskId, { when: message.time });
      sendResponse({ ok: true });
      break;

    case 'MARK_TASK_DONE': {
      // Đánh dấu task done và xóa alarm
      chrome.alarms.clear(message.taskId);
      chrome.storage.local.get(['memos'], (res) => {
        const memos = res.memos || [];
        const task = memos.find(m => m.id === message.taskId);
        if (task) {
          task.done = true;
          task.doneAt = Date.now();
          chrome.storage.local.set({ memos });
        }
      });
      sendResponse({ ok: true });
      break;
    }

    case 'GET_CONFIG':
      getConfig().then((config) => sendResponse(config));
      return true; // Async response

    case 'SYNC_COOKIES_NOW':
      syncCookies().then(() => sendResponse({ ok: true }));
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

console.log('[ChatOps Extension] Background service worker started');
