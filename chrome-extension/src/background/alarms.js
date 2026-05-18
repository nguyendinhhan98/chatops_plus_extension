import { getMyProfile, getMyChannelMembers, getTeamByName, getConfig } from '../api/index.js';
import { ALARMS, UI_CONFIG, CHATOPS_CONFIG, MESSAGE_TYPES, STORAGE_KEYS } from '../constants.js';
import { language } from '../lang.js';

/**
 * Handles periodic mention checks
 */
export async function handleMentionCheck() {
  try {
    const config = await getConfig();
    if (!config.cookie && !config.csrf) return;

    const me = await getMyProfile();
    const team = await getTeamByName(config.teamName || CHATOPS_CONFIG.DEFAULT_TEAM);
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

/**
 * Handles task reminders
 * @param {string} taskId 
 */
export async function handleTaskAlarm(taskId) {
  try {
    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const task = memos.find(m => m.id === taskId);

    if (!task) {
      console.warn('[ChatOps Ext] Task not found, clearing alarm:', taskId);
      chrome.alarms.clear(taskId);
      return;
    }

    if (task.done) {
      chrome.alarms.clear(taskId);
      return;
    }

    let message = '';
    if (task.postText) message += task.postText.slice(0, 100);
    if (task.note) message += (message ? ' — ' : '') + task.note;
    if (!message) message = language.reminderTaskDefault;

    // Get notification settings
    const settingsRes = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
    const settings = settingsRes[STORAGE_KEYS.SETTINGS] || {};
    const notificationType = settings.notificationType || 'both';

    // 1. Send banner to all ChatOps tabs if configured
    if (notificationType === 'both' || notificationType === 'in-page') {
      const tabs = await chrome.tabs.query({ url: `${CHATOPS_CONFIG.DEFAULT_URL}/*` });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.SHOW_REMINDER,
          message,
          taskId,
          postId: task.postId,
          teamName: task.teamName,
          isTask: true
        }).catch(() => {});
      }
    }

    // 2. Trigger native OS notification if configured
    if (notificationType === 'both' || notificationType === 'system') {
      console.log('[ChatOps Ext] Attempting to trigger OS notification for task:', taskId);
      chrome.notifications.create(taskId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: '🎯 ChatOps++ Reminder',
        message: message,
        priority: 2,
        requireInteraction: true
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('[ChatOps Ext] Failed to create OS notification:', chrome.runtime.lastError.message);
        } else {
          console.log('[ChatOps Ext] OS notification created successfully with ID:', notificationId);
        }
      });
    }

    // Set extension badge so user sees it in any tab
    chrome.action.setBadgeText({ text: 'TASK' });
    chrome.action.setBadgeBackgroundColor({ color: '#d0454c' });

    // Reschedule alarm dynamically using user's settings snooze minutes (default 5)
    const snoozeMinutes = settings.snoozeMinutes || 5;
    chrome.alarms.create(taskId, { delayInMinutes: snoozeMinutes });
    console.log('[ChatOps Ext] Task alarm fired and rescheduled:', taskId, 'with snooze:', snoozeMinutes, 'mins');

  } catch (err) {
    console.error('[ChatOps Ext] handleTaskAlarm error:', err);
  }
}
