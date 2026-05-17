/**
 * Tasks Tab Module — ChatOps Chrome Extension
 * Manages "Việc làm" (To-Do tasks) with reminders.
 */

import { escapeHtml, makePermalinkSync, formatUnixMsToVN, formatRelativeTime } from '../../src/utils/index.js';
import { CHATOPS_CONFIG, MESSAGE_TYPES, UI_CONFIG, STORAGE_KEYS, TABS } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;
let currentFilter = 'pending';

/**
 * Initializes the Tasks Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;

  const quickInput = document.getElementById('quickTaskInput');
  const quickSaveBtn = document.getElementById('btnQuickTaskSave');
  const reminderInput = document.getElementById('quickTaskReminderDt');
  const reminderRow = document.getElementById('quickTaskReminderRow');

  if (reminderRow && reminderInput) {
    reminderRow.addEventListener('click', (e) => {
      // Prevent infinite loop if clicking the input itself
      if (e.target !== reminderInput) {
        try {
          reminderInput.showPicker();
        } catch (err) {
          reminderInput.focus();
          reminderInput.click();
        }
      }
    });
  }

  const presetSelect = document.getElementById('quickTaskReminderSelect');
  if (presetSelect && reminderInput) {
    presetSelect.addEventListener('change', () => {
      const val = presetSelect.value;
      if (!val) {
        reminderInput.value = '';
        return;
      }
      const mins = parseInt(val, 10);
      const targetTime = new Date(Date.now() + mins * 60000);
      const tzOffset = targetTime.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(targetTime - tzOffset)).toISOString().slice(0, 16);
      reminderInput.value = localISOTime;
    });

    reminderInput.addEventListener('input', () => {
      presetSelect.value = '';
    });
  }

  const updateSaveButtonState = () => {
    const hasText = quickInput.value.trim().length > 0;
    if (hasText) {
      quickSaveBtn.style.opacity = '1';
      quickSaveBtn.style.cursor = 'pointer';
    } else {
      quickSaveBtn.style.opacity = '0.5';
      quickSaveBtn.style.cursor = 'not-allowed';
    }
  };
  quickInput.addEventListener('input', updateSaveButtonState);
  updateSaveButtonState();

  const saveTask = async () => {
    const text = quickInput.value.trim();
    if (!text) {
      quickInput.style.borderColor = 'var(--danger)';
      quickInput.style.boxShadow = '0 0 0 2px rgba(231, 76, 60, 0.2)';
      setTimeout(() => {
        quickInput.style.borderColor = '';
        quickInput.style.boxShadow = '';
      }, 1500);
      return;
    }

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
      status: 'pending',
      teamName: _state.getTeam()?.name || CHATOPS_CONFIG.DEFAULT_TEAM
    };

    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 5 };
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });

    quickInput.value = '';
    if (reminderInput) reminderInput.value = '';
    if (presetSelect) presetSelect.value = '';
    updateSaveButtonState();

    const startTime = item.reminder
      ? new Date(item.reminder).getTime()
      : Date.now() + settings.snoozeMinutes * 60 * 1000;
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
    
    loadTasks();
  };

  quickInput.addEventListener('keydown', e => { 
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      saveTask(); 
    }
  });
  quickSaveBtn.addEventListener('click', saveTask);

  // Handle toggle collapse
  const btnToggle = document.getElementById('btnToggleTasks');
  const tasksForm = document.getElementById('spTasksForm');
  if (btnToggle && tasksForm) {
    btnToggle.addEventListener('click', () => {
      tasksForm.classList.toggle('collapsed');
      btnToggle.classList.toggle('collapsed');
    });
  }

  // Handle task updates (reminder time changes)
  document.getElementById('taskList').addEventListener('change', async (e) => {
    if (e.target.classList.contains('task-update-reminder')) {
      const id = e.target.dataset.id;
      const newTime = e.target.value;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const taskIndex = memos.findIndex(m => m.id === id);
      
      if (taskIndex !== -1) {
        memos[taskIndex].reminder = newTime || null;
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        
        chrome.alarms.clear(id);
        if (newTime && !memos[taskIndex].done) {
          const startTime = new Date(newTime).getTime();
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
        }
      }
    }
  });

  // Sub-tabs
  document.querySelectorAll('#taskSubTabs .memo-sub-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#taskSubTabs .memo-sub-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      loadTasks();
    });
  });

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

    // Inline edit trigger
    const btnEdit = e.target.closest('.btn-edit-task');
    if (btnEdit) {
      const id = btnEdit.dataset.id;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const task = memos.find(m => m.id === id);
      if (task) {
        const card = document.getElementById('item_' + id);
        const contentEl = card.querySelector('.memo-content');
        if (contentEl) {
          const actionsEl = card.querySelector('.memo-actions');
          if (actionsEl) actionsEl.style.display = 'none';
          
          contentEl.innerHTML = `
            <div class="inline-edit-form" style="margin-top: 4px; display: flex; flex-direction: column; gap: 8px;">
              <textarea class="inline-edit-textarea" style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; outline: none; background: #fff; resize: vertical; color: var(--text-1);">${escapeHtml(task.note)}</textarea>
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary inline-edit-cancel" data-id="${id}" style="padding: 4px 10px; font-size: 11.5px; height: 26px; border-radius: 6px; cursor:pointer;">Hủy</button>
                <button class="btn btn-primary inline-edit-save" data-id="${id}" style="padding: 4px 10px; font-size: 11.5px; height: 26px; border-radius: 6px; cursor:pointer; color:#fff;">Lưu</button>
              </div>
            </div>
          `;
        }
      }
    }

    // Cancel edit
    if (e.target.classList.contains('inline-edit-cancel')) {
      loadTasks();
    }

    // Save edit
    if (e.target.classList.contains('inline-edit-save')) {
      const id = e.target.dataset.id;
      const card = document.getElementById('item_' + id);
      const textarea = card.querySelector('.inline-edit-textarea');
      if (textarea) {
        const newText = textarea.value.trim();
        if (!newText) {
          alert('Nội dung việc làm không được để trống.');
          return;
        }
        
        const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = res[STORAGE_KEYS.MEMOS] || [];
        const taskIndex = memos.findIndex(m => m.id === id);
        if (taskIndex !== -1) {
          memos[taskIndex].note = newText;
          memos[taskIndex].updatedAt = Date.now();
          await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
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
  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  let html = '';

  if (currentFilter === 'pending') {
    if (pending.length === 0) {
      html = `<div class="empty-state">${language.taskEmpty}</div>`;
    } else {
      html += pending.map(task => renderTaskCard(task, now)).join('');
    }
  } else {
    if (done.length === 0) {
      html = `<div class="empty-state">Chưa có việc nào đã hoàn thành</div>`;
    } else {
      html += `<div style="text-align:right;margin-bottom:8px;"><button class="memo-clear-done-btn" id="btnClearDoneTasks">${language.taskClearAll}</button></div>`;
      html += done.map(task => renderTaskCard(task, now)).join('');
    }
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
    ? makePermalinkSync(task.postId, cachedConfig.chatopsUrl, task.teamName || currentTeam?.name || CHATOPS_CONFIG.DEFAULT_TEAM)
    : null;

  // Only show postText if it's different from the note (to avoid duplication)
  const hasOriginalPost = task.postId && task.postText && task.postText !== task.note;

  return `
    <div class="memo-item ${task.done ? 'memo-done' : ''} ${isOverdue ? 'memo-overdue' : ''}" id="item_${task.id}">
      <div class="memo-item-header" style="display:flex; align-items:flex-start;">
        <label class="memo-checkbox-container" title="${task.done ? language.taskMarkIncomplete : language.taskMarkDone}" style="flex-shrink:0;">
          <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
          <span class="memo-checkmark-custom"></span>
        </label>
        <button class="collapse-btn" data-id="${task.id}" style="margin-right: 4px;" title="Mở rộng/Thu gọn">▶</button>
        <div class="memo-content" style="flex:1; min-width:0;">
          ${hasOriginalPost ? `<div class="memo-post-preview post-preview" style="display:none; margin-bottom:4px;">📌 ${escapeHtml(task.postText)}</div>` : ''}
          <div class="memo-note-text task-text collapsible-body collapsed" style="margin-top: 2px;">${escapeHtml(task.note || language.taskNoContent)}</div>
        </div>
      </div>
      <div class="memo-footer">
        <div class="memo-meta" style="display:flex; align-items:center; gap:8px;">
          <span>📅 ${formatRelativeTime(task.createdAt)}</span>
          ${!task.done ? `
            <div style="display:flex; align-items:center; background:#fff; border:1px solid var(--border); border-radius:4px; padding:2px 6px;">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.7; margin-right:4px;"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
              <input type="datetime-local" class="task-update-reminder" data-id="${task.id}" value="${task.reminder || ''}" style="border:none; outline:none; font-size:11px; background:transparent; cursor:pointer;" title="Đổi giờ nhắc" />
            </div>
          ` : ''}
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="post-jump-link" title="${language.memoViewOriginal}">↗</a>` : ''}
          <button class="btn-edit-memo btn-edit-task" data-id="${task.id}" title="Chỉnh sửa việc làm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; opacity:0.85;">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="btn-delete-memo btn-delete-task" data-id="${task.id}" title="${language.memoDelete}">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style="pointer-events:none;">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}
