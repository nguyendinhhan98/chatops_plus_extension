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
 * Reschedules a daily task to the next occurrence of its configured daily time.
 * Updates task.reminder in storage and creates a new Chrome alarm.
 * @param {Object} task - the task object (will be mutated)
 * @param {Array} memos - full memos array (will be persisted)
 */
async function rescheduleToNextDailyOccurrence(task, memos) {
  // Extract HH:mm from the stored reminder string (format: "YYYY-MM-DD HH:mm")
  const reminderStr = task.reminder || '';
  const timeMatch = reminderStr.match(/(\d{2}):(\d{2})$/);

  const now = new Date();
  let nextTime = new Date();

  if (timeMatch) {
    nextTime.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    // If that time today has already passed, push to tomorrow
    if (nextTime.getTime() <= now.getTime()) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
  } else {
    // Fallback: schedule 24 hours from now
    nextTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  task.reminder = formatDateTime(nextTime);
  await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
  chrome.alarms.create(task.id, { when: nextTime.getTime() });
  console.log('[ChatOps Ext] Daily task rescheduled to next occurrence:', task.id, '->', nextTime.toLocaleString());
}

/**
 * Handles task reminders
 * @param {string} taskId
 * @param {number} [alarmScheduledTime] - The time the alarm was originally scheduled to fire (ms).
 *   Passed from chrome.alarms.onAlarm event. Used to detect stale/suspended alarms.
 */
export async function handleTaskAlarm(taskId, alarmScheduledTime) {
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

    // === STALE ALARM GUARD ===
    // Chrome Alarms are suspended when the browser is closed. When Chrome restarts,
    // all overdue alarms fire immediately. If an alarm fires significantly later than
    // its scheduled time (e.g. snooze alarm from last Friday fires on Monday morning),
    // it is "stale" — we must NOT show a notification. Instead:
    //   - Daily tasks: reschedule silently to the next correct occurrence.
    //   - One-time tasks: the moment is missed, clear the alarm (task stays in list as pending).
    const settingsRes = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
    const settings = settingsRes[STORAGE_KEYS.SETTINGS] || {};
    const staleThresholdMinutes = settings.staleThresholdMinutes ?? 30;
    const STALE_THRESHOLD_MS = staleThresholdMinutes * 60 * 1000;
    const now = Date.now();

    if (alarmScheduledTime && (now - alarmScheduledTime > STALE_THRESHOLD_MS)) {
      console.warn(
        '[ChatOps Ext] Stale alarm detected for task:', taskId,
        '— scheduled:', new Date(alarmScheduledTime).toLocaleString(),
        '— now:', new Date(now).toLocaleString(),
        '— delay:', Math.round((now - alarmScheduledTime) / 60000), 'min'
      );

      if (task.repeatDaily) {
        await rescheduleToNextDailyOccurrence(task, memos);
      } else {
        chrome.alarms.clear(taskId);
        console.log('[ChatOps Ext] Stale one-time alarm cleared (task left as pending):', taskId);
      }
      return; // Do NOT show any notification
    }

    // --- Alarm is fresh — proceed to notify ---

    let message = '';
    if (task.postText) message += task.postText.slice(0, 100);
    if (task.note) message += (message ? ' — ' : '') + task.note;
    if (!message) message = language.reminderTaskDefault;

    // Get notification settings (reuse `settings` already loaded above for stale guard)
    const notificationType = settings.notificationType || 'both';
    const snoozeMinutes = settings.snoozeMinutes || 5;

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

    // 3. Schedule snooze alarm so notification repeats until user acts (Done / Skip).
    // The stale guard above ensures that if Chrome was suspended and this snooze
    // alarm fires much later, it will be discarded gracefully instead of looping.
    chrome.alarms.create(taskId, { delayInMinutes: snoozeMinutes });
    console.log('[ChatOps Ext] Task alarm fired, snooze scheduled in', snoozeMinutes, 'min:', taskId);

  } catch (err) {
    console.error('[ChatOps Ext] handleTaskAlarm error:', err);
  }
}
