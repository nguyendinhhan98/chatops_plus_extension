import { escapeHtml, makePermalinkSync, formatUnixMsToVN, formatRelativeTime } from '../../src/utils/index.js';
import { CHATOPS_CONFIG, MESSAGE_TYPES, UI_CONFIG, STORAGE_KEYS, MEMO_SUB_TABS, TABS } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null; // Centralized state
let currentMemoSubTab = MEMO_SUB_TABS.TASKS;

/**
 * Initializes the Memo Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;
  const quickTaskRow = document.getElementById('quickTaskRow');
  const quickInput = document.getElementById('quickNoteInput');
  const quickSaveBtn = document.getElementById('btnQuickNoteSave');

  // Sub-tab switching logic
  document.querySelectorAll('.memo-sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.memo-sub-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMemoSubTab = btn.dataset.subtab;
      
      document.querySelectorAll('.memo-panel').forEach(p => p.classList.remove('active'));
      const panelId = currentMemoSubTab === MEMO_SUB_TABS.TASKS ? 'memoTaskList' : 'memoNoteList';
      document.getElementById(panelId).classList.add('active');

      if (quickTaskRow) {
        quickTaskRow.style.display = currentMemoSubTab === MEMO_SUB_TABS.TASKS ? 'flex' : 'none';
      }

      if (quickInput) {
        quickInput.placeholder = currentMemoSubTab === MEMO_SUB_TABS.TASKS
          ? language.memoTaskPlaceholder
          : language.memoNotePlaceholder;
      }
    });
  });

  // Save quick item (task or note)
  const saveQuickItem = async () => {
    const text = quickInput.value.trim();
    if (!text) return;

    const isTask = currentMemoSubTab === MEMO_SUB_TABS.TASKS;
    const reminderInput = document.getElementById('quickTaskReminder');
    const reminderTime = isTask && reminderInput ? reminderInput.value : null;

    const type = isTask ? 'task' : 'note';
    const id = `${type}_${Date.now()}`;
    const item = {
      id, type,
      postId: null,
      postText: null,
      note: text,
      createdAt: Date.now(),
      done: false,
      reminder: reminderTime || null,
      status: 'pending'
    };

    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
    
    quickInput.value = '';
    if (reminderInput) reminderInput.value = '';

    if (isTask) {
      const startTime = reminderTime
        ? new Date(reminderTime).getTime()
        : Date.now() + UI_CONFIG.TASK_SNOOZE_MINUTES * 60 * 1000;
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
    }

    loadMemos();
  };

  quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveQuickItem(); });
  quickSaveBtn.addEventListener('click', saveQuickItem);

  // Event delegation for delete and checkbox changes
  ['memoTaskList', 'memoNoteList'].forEach(listId => {
    const el = document.getElementById(listId);
    el.addEventListener('click', async (e) => {
      // Delete item
      if (e.target.classList.contains('btn-delete-memo')) {
        const id = e.target.dataset.id;
        const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = (res[STORAGE_KEYS.MEMOS] || []).filter(m => m.id !== id);
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        chrome.alarms.clear(id);
        loadMemos();
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
          loadMemos();
        }
      }
    });
  });

  // Reload data when the memo tab is clicked
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === TABS.MEMO) btn.addEventListener('click', loadMemos);
  });

  loadMemos();
}

/**
 * Loads and renders all memos and tasks from storage
 */
export async function loadMemos() {
  const taskList = document.getElementById('memoTaskList');
  const noteList = document.getElementById('memoNoteList');
  if (!taskList || !noteList) return;

  const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
  const allItems = res[STORAGE_KEYS.MEMOS] || [];

  const tasks = allItems.filter(m => m.type === 'task');
  const notes = allItems.filter(m => m.type === 'note');

  // Update badge counters
  const pendingCount = tasks.filter(t => !t.done).length;
  const taskBadge = document.getElementById('taskBadge');
  const noteBadge = document.getElementById('noteBadge');
  if (taskBadge) taskBadge.textContent = pendingCount > 0 ? pendingCount : '';
  if (noteBadge) noteBadge.textContent = notes.length > 0 ? notes.length : '';

  const now = Date.now();

  // Render Tasks Panel
  if (tasks.length === 0) {
    taskList.innerHTML = `<div class="empty-state"><div style="font-size:36px;margin-bottom:12px">📋</div>${language.memoTasksEmpty}<br><span style="font-size:12px;color:var(--text-3)">${language.memoClickHint}</span></div>`;
  } else {
    const pending = tasks.filter(t => !t.done);
    const done = tasks.filter(t => t.done);
    let html = '';

    if (pending.length > 0) {
      html += `<div class="memo-list-header">${language.memoPending} (${pending.length})</div>`;
      html += pending.map(task => renderTaskCard(task, now)).join('');
    }

    if (done.length > 0) {
      html += `<div class="memo-list-header done-header">${language.memoCompleted} (${done.length}) <button class="memo-clear-done-btn" id="btnClearDone">${language.memoClearAll}</button></div>`;
      html += done.map(task => renderTaskCard(task, now)).join('');
    }

    taskList.innerHTML = html;

    const clearDoneBtn = document.getElementById('btnClearDone');
    if (clearDoneBtn) {
      clearDoneBtn.addEventListener('click', async () => {
        const r = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = (r[STORAGE_KEYS.MEMOS] || []).filter(m => !(m.type === 'task' && m.done));
        memos.filter(m => m.type === 'task' && m.done).forEach(m => chrome.alarms.clear(m.id));
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        loadMemos();
      });
    }
  }

  // Render Notes Panel
  if (notes.length === 0) {
    noteList.innerHTML = `<div class="empty-state"><div style="font-size:36px;margin-bottom:12px">📝</div>${language.memoNotesEmpty}<br><span style="font-size:12px;color:var(--text-3)">${language.memoClickHint}</span></div>`;
  } else {
    noteList.innerHTML = notes.map(note => renderNoteCard(note)).join('');
  }
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

  return `
    <div class="memo-item ${task.done ? 'memo-done' : ''} ${isOverdue ? 'memo-overdue' : ''}" id="item_${task.id}">
      <div class="memo-item-header">
        <label class="memo-checkbox-container" title="${task.done ? language.memoMarkIncomplete : language.memoMarkDone}">
          <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
          <span class="memo-checkmark-custom"></span>
        </label>
        <div class="memo-content">
          ${task.postText ? `<div class="memo-post-preview">${escapeHtml(task.postText)}</div>` : ''}
          <div class="memo-note-text">${escapeHtml(task.note || language.memoNoContent)}</div>
        </div>
      </div>
      <div class="memo-footer">
        <div class="memo-meta">
          ${isOverdue ? `<span class="memo-overdue-badge">⚠️ ${language.memoOverdue}</span>` : ''}
          ${reminderStr && !task.done ? `<span class="reminder-active">⏰ ${reminderStr}</span>` : ''}
          ${task.done ? `<span>✅ ${formatRelativeTime(task.doneAt || task.createdAt)}</span>` : ''}
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="btn-jump-memo" title="${language.memoViewOriginal}" target="_blank">↗</a>` : ''}
          <button class="btn-delete-memo" data-id="${task.id}" title="${language.memoDelete}">×</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders a note card component
 */
function renderNoteCard(note) {
  const cachedConfig = _state.getConfig();
  const currentTeam = _state.getTeam();
  const permalink = note.postId && cachedConfig 
    ? makePermalinkSync(note.postId, cachedConfig.chatopsUrl, currentTeam?.name || CHATOPS_CONFIG.DEFAULT_TEAM) 
    : null;

  return `
    <div class="memo-item" id="item_${note.id}">
      <div class="memo-content" style="padding: 2px 0;">
        ${note.postText ? `<div class="memo-post-preview">${escapeHtml(note.postText)}</div>` : ''}
        <div class="memo-note-text">${escapeHtml(note.note || language.memoEmptyNote)}</div>
      </div>
      <div class="memo-footer">
        <div class="memo-meta">
          <span>📅 ${formatRelativeTime(note.createdAt)}</span>
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="btn-jump-memo" title="${language.memoViewOriginal}" target="_blank">↗</a>` : ''}
          <button class="btn-delete-memo" data-id="${note.id}" title="${language.memoDelete}">×</button>
        </div>
      </div>
    </div>
  `;
}
