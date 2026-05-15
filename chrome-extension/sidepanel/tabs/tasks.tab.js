/**
 * Tasks Tab Module — ChatOps Chrome Extension
 * Manages "Việc cần làm" (To-Do tasks) with reminders.
 */

import { escapeHtml, makePermalinkSync, formatUnixMsToVN, formatRelativeTime } from '../../src/utils/index.js';
import { CHATOPS_CONFIG, MESSAGE_TYPES, UI_CONFIG, STORAGE_KEYS, TABS } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;

/**
 * Initializes the Tasks Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;

  const quickInput = document.getElementById('quickTaskInput');
  const quickSaveBtn = document.getElementById('btnQuickTaskSave');
  const reminderInput = document.getElementById('quickTaskReminderDt');

  const saveTask = async () => {
    const text = quickInput.value.trim();
    if (!text) return;

    const id = `task_${Date.now()}`;
    const item = {
      id,
      type: 'task',
      postId: null,
      postText: null,
      note: text,
      createdAt: Date.now(),
      done: false,
      reminder: reminderInput?.value || null,
      status: 'pending'
    };

    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });

    quickInput.value = '';
    if (reminderInput) reminderInput.value = '';

    const startTime = item.reminder
      ? new Date(item.reminder).getTime()
      : Date.now() + UI_CONFIG.TASK_SNOOZE_MINUTES * 60 * 1000;
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });

    loadTasks();
  };

  quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveTask(); });
  quickSaveBtn.addEventListener('click', saveTask);

  // Event delegation for task list
  document.getElementById('taskList').addEventListener('click', async (e) => {
    // Delete item
    if (e.target.classList.contains('btn-delete-task')) {
      const id = e.target.dataset.id;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const memos = (res[STORAGE_KEYS.MEMOS] || []).filter(m => m.id !== id);
      await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
      chrome.alarms.clear(id);
      loadTasks();
    }

    // Task completion toggle
    if (e.target.classList.contains('task-checkbox')) {
      const id = e.target.dataset.id;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const task = memos.find(m => m.id === id);
      if (task) {
        task.done = e.target.checked;
        task.doneAt = e.target.checked ? Date.now() : null;
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        if (e.target.checked) {
          chrome.alarms.clear(id);
        } else {
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: Date.now() + UI_CONFIG.TASK_SNOOZE_MINUTES * 60 * 1000 });
        }
        loadTasks();
      }
    }
  });

  // Reload when tab is clicked
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === TABS.TASKS) btn.addEventListener('click', loadTasks);
  });

  loadTasks();
}

/**
 * Loads and renders all tasks from storage
 */
export async function loadTasks() {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;

  const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
  const allItems = res[STORAGE_KEYS.MEMOS] || [];
  const tasks = allItems.filter(m => m.type === 'task');

  // Update badge
  const pendingCount = tasks.filter(t => !t.done).length;
  const taskBadge = document.getElementById('taskTabBadge');
  if (taskBadge) taskBadge.textContent = pendingCount > 0 ? pendingCount : '';

  const now = Date.now();

  if (tasks.length === 0) {
    taskList.innerHTML = `<div class="empty-state"><div style="font-size:36px;margin-bottom:12px">✅</div>${language.taskEmpty}<br><span style="font-size:12px;color:var(--text-3)">${language.taskClickHint}</span></div>`;
    return;
  }

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  let html = '';

  if (pending.length > 0) {
    html += `<div class="memo-list-header">${language.taskPending} (${pending.length})</div>`;
    html += pending.map(task => renderTaskCard(task, now)).join('');
  }

  if (done.length > 0) {
    html += `<div class="memo-list-header done-header">${language.taskCompleted} (${done.length}) <button class="memo-clear-done-btn" id="btnClearDoneTasks">${language.taskClearAll}</button></div>`;
    html += done.map(task => renderTaskCard(task, now)).join('');
  }

  taskList.innerHTML = html;

  document.getElementById('btnClearDoneTasks')?.addEventListener('click', async () => {
    const r = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = (r[STORAGE_KEYS.MEMOS] || []).filter(m => !(m.type === 'task' && m.done));
    memos.filter(m => m.type === 'task' && m.done).forEach(m => chrome.alarms.clear(m.id));
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
    loadTasks();
  });
}

/**
 * Renders a task card component
 */
function renderTaskCard(task, now) {
  const reminderMs = task.reminder ? new Date(task.reminder).getTime() : null;
  const isOverdue = !task.done && reminderMs && reminderMs < now;
  const reminderStr = reminderMs ? formatUnixMsToVN(reminderMs) : null;

  const cachedConfig = _state.getConfig();
  const currentTeam = _state.getTeam();
  const permalink = task.postId && cachedConfig
    ? makePermalinkSync(task.postId, cachedConfig.chatopsUrl, currentTeam?.name || CHATOPS_CONFIG.DEFAULT_TEAM)
    : null;

  // Only show postText if it's different from the note (to avoid duplication)
  const hasOriginalPost = task.postId && task.postText && task.postText !== task.note;

  return `
    <div class="memo-item ${task.done ? 'memo-done' : ''} ${isOverdue ? 'memo-overdue' : ''}" id="item_${task.id}">
      <div class="memo-item-header">
        <label class="memo-checkbox-container" title="${task.done ? language.taskMarkIncomplete : language.taskMarkDone}">
          <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
          <span class="memo-checkmark-custom"></span>
        </label>
        <div class="memo-content">
          ${hasOriginalPost ? `<div class="memo-post-preview">📌 ${escapeHtml(task.postText)}</div>` : ''}
          <div class="memo-note-text task-text">${escapeHtml(task.note || language.taskNoContent)}</div>
        </div>
      </div>
      <div class="memo-footer">
        <div class="memo-meta">
          ${isOverdue ? `<span class="memo-overdue-badge">⚠️ ${language.taskOverdue}</span>` : ''}
          ${reminderStr && !task.done ? `<span class="reminder-active">⏰ ${reminderStr}</span>` : ''}
          ${task.done ? `<span>✅ ${formatRelativeTime(task.doneAt || task.createdAt)}</span>` : ''}
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="post-jump-link" title="${language.taskViewOriginal}">↗</a>` : ''}
          <button class="btn-delete-task btn-delete-memo" data-id="${task.id}" title="${language.taskDelete}">×</button>
        </div>
      </div>
    </div>
  `;
}
