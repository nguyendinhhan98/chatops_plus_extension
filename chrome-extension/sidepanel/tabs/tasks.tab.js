/**
 * Tasks Tab Module — ChatOps Chrome Extension
 * Manages To-Do tasks with reminders.
 */

import { escapeHtml, makePermalinkSync, formatUnixMsToVN, formatRelativeTime, initCommonFlatpickr, formatRichText } from '../../src/utils/index.js';
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
  const quickTitleInput = document.getElementById('quickTaskTitle');
  const quickSaveBtn = document.getElementById('btnQuickTaskSave');
  const reminderInput = document.getElementById('quickTaskReminderDt');
  const reminderRow = document.getElementById('quickTaskReminderRow');
  const presetSelect = document.getElementById('quickTaskReminderSelect');

  function syncReminderDimming() {
    const customSelect = presetSelect?.nextElementSibling;
    const hasDate = reminderInput && reminderInput.value.trim() !== '';
    const hasPreset = presetSelect && presetSelect.value !== '';

    if (hasDate) {
      if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
        customSelect.style.opacity = '0.35';
        customSelect.style.transition = 'opacity 0.2s ease';
      }
      if (reminderRow) {
        reminderRow.style.opacity = '1';
      }
    } else if (hasPreset) {
      if (reminderRow) {
        reminderRow.style.opacity = '0.35';
        reminderRow.style.transition = 'opacity 0.2s ease';
      }
      if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
        customSelect.style.opacity = '1';
      }
    } else {
      if (reminderRow) {
        reminderRow.style.opacity = '1';
      }
      if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
        customSelect.style.opacity = '1';
      }
    }
  }

  let fpQuick = null;
  if (reminderInput) {
    fpQuick = initCommonFlatpickr(reminderInput, {
      onChange: function(selectedDates) {
        if (selectedDates.length > 0) {
          if (presetSelect) {
            presetSelect.value = '';
            const customSelect = presetSelect.nextElementSibling;
            if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
              const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
              if (selectedText) selectedText.textContent = 'Remind in...';
            }
          }
        }
        syncReminderDimming();
      },
      onOpen: function() {
        if (presetSelect) {
          presetSelect.value = '';
          const customSelect = presetSelect.nextElementSibling;
          if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
            const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
            if (selectedText) selectedText.textContent = 'Remind in...';
          }
        }
        syncReminderDimming();
      }
    });
  }

  if (reminderRow && fpQuick) {
    reminderRow.addEventListener('click', (e) => {
      if (presetSelect) {
        presetSelect.value = '';
        const customSelect = presetSelect.nextElementSibling;
        if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
          const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
          if (selectedText) selectedText.textContent = 'Remind in...';
        }
      }
      syncReminderDimming();
      if (e.target !== reminderInput) {
        fpQuick.open();
      }
    });
  }

  if (presetSelect && reminderInput) {
    presetSelect.addEventListener('change', () => {
      const val = presetSelect.value;
      if (!val) {
        syncReminderDimming();
        return;
      }
      if (fpQuick) fpQuick.clear();
      syncReminderDimming();
    });

    if (typeof window.convertToCustomDropdown === 'function') {
      window.convertToCustomDropdown('quickTaskReminderSelect', '115px');
    }

    const customSelect = presetSelect?.nextElementSibling;
    if (customSelect) {
      customSelect.addEventListener('click', () => {
        if (fpQuick) fpQuick.clear();
        syncReminderDimming();
      });
    }
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
    const titleText = quickTitleInput ? quickTitleInput.value.trim() : '';
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
      title: titleText || '',
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
    if (quickTitleInput) {
      quickTitleInput.value = '';
    }
    if (fpQuick) {
      fpQuick.clear();
    }
    if (presetSelect) {
      presetSelect.value = '';
      const customSelect = presetSelect.nextElementSibling;
      if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
        const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
        if (selectedText) selectedText.textContent = 'Remind in...';
      }
    }
    syncReminderDimming();
    updateSaveButtonState();

    const startTime = item.reminder
      ? new Date(item.reminder).getTime()
      : Date.now() + settings.snoozeMinutes * 60 * 1000;
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
    
    loadTasks();

    // Close the Action Modal
    if (window.ModalManager) {
      window.ModalManager.close();
    }
  };

  quickInput.addEventListener('keydown', e => { 
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      saveTask(); 
    }
  });
  if (quickSaveBtn) {
    quickSaveBtn.addEventListener('click', saveTask);
  }

  const cancelBtn = document.getElementById('btnCancelTask');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (window.ModalManager) {
        window.ModalManager.close();
      }
    });
  }

  // Handle toggle collapse
  const btnToggle = document.getElementById('btnToggleTasks');
  const tasksForm = document.getElementById('spTasksForm');
  if (btnToggle && tasksForm) {
    btnToggle.addEventListener('click', () => {
      tasksForm.classList.toggle('collapsed');
      btnToggle.classList.toggle('collapsed');
    });
  }



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
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 5 };
      const task = memos.find(m => m.id === id);
      if (task) {
        task.done = e.target.checked;
        task.doneAt = e.target.checked ? Date.now() : null;
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        if (e.target.checked) {
          chrome.alarms.clear(id);
        } else {
          const snoozeMins = settings.snoozeMinutes || 5;
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: Date.now() + snoozeMins * 60 * 1000 });
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
              <input type="text" class="inline-edit-title" placeholder="Title (optional)" value="${escapeHtml(task.title || '')}" style="width: 100%; height: 28px; font-size: 13px; font-weight: 600; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); outline: none; box-sizing: border-box; font-family: inherit;" autocomplete="off">
              <textarea class="inline-edit-textarea" style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; outline: none; background: #fff; resize: vertical; color: var(--text-1);">${escapeHtml(task.note)}</textarea>
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary inline-edit-cancel" data-id="${id}" style="padding: 4px 10px; font-size: 11.5px; height: 26px; border-radius: 6px; cursor:pointer;">${language.cancel || 'Cancel'}</button>
                <button class="btn btn-primary inline-edit-save" data-id="${id}" style="padding: 4px 10px; font-size: 11.5px; height: 26px; border-radius: 6px; cursor:pointer; color:#fff;">${language.save || 'Save'}</button>
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
      const titleInput = card.querySelector('.inline-edit-title');
      const textarea = card.querySelector('.inline-edit-textarea');
      const newTitle = titleInput ? titleInput.value.trim() : '';
      if (textarea) {
          const newText = textarea.value.trim();
          if (!newText) {
            alert(language.taskEmptyError || 'Task content cannot be empty.');
            return;
          }
          
          const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
          const memos = res[STORAGE_KEYS.MEMOS] || [];
          const taskIndex = memos.findIndex(m => m.id === id);
          if (taskIndex !== -1) {
            memos[taskIndex].title = newTitle;
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

  // Listen to storage changes reactively to reload tasks list
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEYS.MEMOS]) {
      loadTasks();
    }
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
      html = `<div class="empty-state">${language.noCompletedTasks || 'No completed tasks yet.'}</div>`;
    } else {
      html += `<div style="text-align:right;margin-bottom:8px;"><button class="memo-clear-done-btn" id="btnClearDoneTasks">${language.taskClearAll}</button></div>`;
      html += done.map(task => renderTaskCard(task, now)).join('');
    }
  }

  taskList.innerHTML = html;

  // Only show collapse button if the text overflows (more than 2 lines)
  taskList.querySelectorAll('.memo-item').forEach(card => {
    const textEl = card.querySelector('.memo-note-text');
    const collapseBtn = card.querySelector('.collapse-btn');
    if (textEl && collapseBtn) {
      const isOverflowing = textEl.scrollHeight > textEl.clientHeight + 1;
      if (!isOverflowing) {
        collapseBtn.style.display = 'none';
      }
    }
  });

  // Initialize Flatpickr on dynamically rendered task card datetime inputs
  taskList.querySelectorAll('.task-update-reminder').forEach(el => {
    initCommonFlatpickr(el, {
      onChange: async (selectedDates, dateStr) => {
        const id = el.dataset.id;
        const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = res[STORAGE_KEYS.MEMOS] || [];
        const taskIndex = memos.findIndex(m => m.id === id);
        
        if (taskIndex !== -1) {
          memos[taskIndex].reminder = dateStr || null;
          memos[taskIndex].updatedAt = Date.now();
          await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
          
          const settingsRes = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
          const snoozeMins = settingsRes[STORAGE_KEYS.SETTINGS]?.snoozeMinutes || 5;
          
          if (dateStr) {
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.SET_TASK_ALARM,
              taskId: id,
              time: new Date(dateStr).getTime()
            });
          } else {
            chrome.alarms.clear(id);
          }
        }
        loadTasks();
      }
    });
  });

  // Delegate clear completed tasks button
  const clearBtn = document.getElementById('btnClearDoneTasks');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const confirmClear = confirm(language.taskConfirmClear || 'Are you sure you want to clear all completed tasks?');
      if (confirmClear) {
        const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = (res[STORAGE_KEYS.MEMOS] || []).filter(m => !(m.type === 'task' && m.done));
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        loadTasks();
      }
    });
  }
}

/**
 * Renders a task card component
 */
function renderTaskCard(task, now) {
  const reminderMs = task.reminder ? new Date(task.reminder).getTime() : null;
  const isOverdue = !task.done && reminderMs && reminderMs < now;

  const cachedConfig = _state.getConfig();
  const currentTeam = _state.getTeam();
  const permalink = task.postId && cachedConfig
    ? makePermalinkSync(task.postId, cachedConfig.chatopsUrl, task.teamName || currentTeam?.name || CHATOPS_CONFIG.DEFAULT_TEAM)
    : null;

  // Only show postText if it's different from the note (to avoid duplication)
  const hasOriginalPost = task.postId && task.postText && task.postText !== task.note;

  return `
    <div class="memo-item task-item ${task.done ? 'memo-done' : ''} ${isOverdue ? 'memo-overdue' : ''}" id="item_${task.id}">
      <div class="memo-item-header" style="display:flex; align-items:flex-start; gap:8px;">
        <div class="memo-content" style="flex:1; min-width:0;">
          ${task.title ? `<div class="memo-item-title" style="font-weight:700; font-size:13.5px; color:var(--text-1); margin-bottom:4px; letter-spacing:-0.1px;">${escapeHtml(task.title)}</div>` : ''}
          ${hasOriginalPost ? `<div class="memo-post-preview post-preview" style="display:none; margin-bottom:4px;">📌 ${escapeHtml(task.postText)}</div>` : ''}
          <div class="memo-note-text task-text collapsible-body collapsed" style="margin-top:0;">${formatRichText(task.note || language.taskNoContent)}</div>
        </div>
        <button class="collapse-btn" data-id="${task.id}" style="flex-shrink:0; margin:0;" title="${language.expandCollapseBtn || 'Expand/Collapse'}">▶</button>
      </div>
      <div class="memo-footer">
        <div class="memo-meta" style="display:flex; align-items:center; gap:8px;">
          <label class="memo-checkbox-container footer-checkbox" title="${task.done ? language.taskMarkIncomplete : language.taskMarkDone}">
            <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
            <span class="memo-checkmark-custom"></span>
          </label>
          <span class="sp-card-date">${formatRelativeTime(task.createdAt)}</span>
          ${!task.done ? `
            <div class="task-update-reminder-wrapper ${task.reminder ? 'has-reminder' : ''}">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="reminder-clock-icon"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
              <input type="text" class="task-update-reminder" data-id="${task.id}" value="${task.reminder || ''}" placeholder="yyyy-mm-dd hh:mm" title="${language.changeReminderTime || 'Change reminder time'}" />
            </div>
          ` : ''}
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="post-jump-link" title="${language.memoViewOriginal}">↗</a>` : ''}
          <button class="btn-edit-memo btn-edit-task" data-id="${task.id}" title="${language.editTask || 'Edit Task'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; opacity:0.85;">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="btn-delete-memo btn-delete-task" data-id="${task.id}" title="${language.memoDelete}">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style="pointer-events:none;">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}
