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

    // Send banner to all ChatOps tabs
    const tabs = await chrome.tabs.query({ url: `${CHATOPS_CONFIG.DEFAULT_URL}/*` });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.SHOW_REMINDER,
        message,
        taskId,
        isTask: true
      }).catch(() => {});
    }

    // Reschedule alarm for every 5 minutes until done
    chrome.alarms.create(taskId, { delayInMinutes: UI_CONFIG.TASK_SNOOZE_MINUTES });
    console.log('[ChatOps Ext] Task alarm fired and rescheduled:', taskId);

  } catch (err) {
    console.error('[ChatOps Ext] handleTaskAlarm error:', err);
  }
}
