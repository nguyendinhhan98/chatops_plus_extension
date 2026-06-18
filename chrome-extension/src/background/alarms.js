import { getMyProfile, getMyChannelMembers, getTeamByName, getConfig } from '../api/index.js';
import { ALARMS, UI_CONFIG, CHATOPS_CONFIG, MESSAGE_TYPES, STORAGE_KEYS } from '../constants.js';
import { language, loadLanguage } from '../lang.js';
import { formatDateTime } from '../utils/date.js';

/**
 * Handles periodic mention checks
 */
export async function handleMentionCheck() {
  try {
    // Disabled setting badge for unread mentions count per user request
    chrome.action.setBadgeText({ text: '' });
  } catch (err) {
    console.warn('[ChatOps Extension] Mention check failed:', err.message);
  }
}

/**
 * Set of taskIds whose reminder banners are currently visible on page.
 * Used to prevent duplicate banners when snooze alarm fires.
 */
const activeReminderTaskIds = new Set();

/**
 * Handles task reminders
 * @param {string} taskId 
 */
export async function handleTaskAlarm(taskId) {
  try {
    await loadLanguage();
    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const task = memos.find(m => m.id === taskId);

    if (!task) {
      console.warn('[ChatOps Ext] Task not found, clearing alarm:', taskId);
      chrome.alarms.clear(taskId);
      return;
    }

    if (task.done) {
      if (task.repeatDaily) {
        // Reset done status for the new day's reminder
        task.done = false;
        task.doneAt = null;
        if (task.checklist) {
          task.checklist.forEach(item => {
            item.done = false;
          });
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
      } else {
        chrome.alarms.clear(taskId);
        return;
      }
    }

    let message = '';
    if (task.postText) message += task.postText.slice(0, 100);
    if (task.note) message += (message ? ' — ' : '') + task.note;
    if (!message) message = language.reminderTaskDefault;

    // Get notification settings
    const settingsRes = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
    const settings = settingsRes[STORAGE_KEYS.SETTINGS] || {};
    const notificationType = settings.notificationType || 'both';
    const snoozeMinutes = settings.snoozeMinutes || 5;

    // 1. Send banner to all ChatOps tabs if configured
    // If this taskId's banner is already active on the page, close it first before showing new one
    if (notificationType === 'both' || notificationType === 'in-page') {
      const tabs = await chrome.tabs.query({ url: `${CHATOPS_CONFIG.DEFAULT_URL}/*` });
      for (const tab of tabs) {
        // Request content script to close existing banner for this task (if any) then show new one
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.SHOW_REMINDER,
          message,
          taskId,
          postId: task.postId,
          teamName: task.teamName,
          isTask: true,
          isDaily: task.repeatDaily
        }).catch(() => {});
      }
    }

    // 2. Trigger native OS notification if configured
    if (notificationType === 'both' || notificationType === 'system') {
      console.log('[ChatOps Ext] Attempting to trigger OS notification for task:', taskId);
      // Clear previous notification with same id before creating new one
      chrome.notifications.clear(taskId, () => {
        chrome.notifications.create(taskId, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: language.reminderTitle,
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
      });
    }


    // Reschedule snooze alarm
    // IMPORTANT: Only schedule snooze if task.reminder exists and is in the past or near-past
    // This prevents re-scheduling for tasks whose alarm fired early due to timezone or clock drift.
    // For daily tasks: after snooze fires, verify we haven't already passed the NEXT scheduled time
    if (task.repeatDaily && task.reminder) {
      const nextScheduled = new Date(task.reminder).getTime();
      // If next scheduled reminder is already in the future (> snooze window), don't snooze
      // Wait for the actual alarm instead.
      if (nextScheduled > Date.now() + snoozeMinutes * 60 * 1000) {
        console.log('[ChatOps Ext] Skipping snooze — next scheduled alarm is still in the future:', new Date(nextScheduled));
        return;
      }
    }

    chrome.alarms.create(taskId, { delayInMinutes: snoozeMinutes });
    console.log('[ChatOps Ext] Task alarm fired and rescheduled:', taskId, 'with snooze:', snoozeMinutes, 'mins');

  } catch (err) {
    console.error('[ChatOps Ext] handleTaskAlarm error:', err);
  }
}

