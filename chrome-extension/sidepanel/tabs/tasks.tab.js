/**
 * Tasks Tab Module — ChatOps Chrome Extension
 * Manages To-Do tasks with reminders.
 */

import { escapeHtml, makePermalinkSync, formatUnixMsToVN, formatRelativeTime, initCommonFlatpickr, formatRichText, formatDateTime } from '../../src/utils/index.js';
import { CHATOPS_CONFIG, MESSAGE_TYPES, UI_CONFIG, STORAGE_KEYS, TABS } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;
let currentFilter = 'pending';
let isLocalTaskUpdate = false;

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
  const categorySelect = document.getElementById('quickTaskCategory');
  const checklistBuilder = document.getElementById('quickTaskChecklistBuilder');
  const checklistContainer = document.getElementById('checklistInputsContainer');
  const addChecklistItemBtn = document.getElementById('btnAddChecklistItem');
  const taskInputRow = quickInput?.closest('.task-quick-input-row');

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
      window.convertToCustomDropdown('quickTaskCategory', '140px');
    }

    const customSelect = presetSelect?.nextElementSibling;
    if (customSelect) {
      customSelect.addEventListener('click', () => {
        if (fpQuick) fpQuick.clear();
        syncReminderDimming();
      });
    }
  }

    // Checklist builder helpers
    function updateAddButtonState() {
      if (!addChecklistItemBtn) return;
      const currentRows = checklistContainer?.querySelectorAll('.checklist-builder-row') || [];
      if (currentRows.length >= 10) {
        addChecklistItemBtn.style.display = 'none';
      } else {
        addChecklistItemBtn.style.display = 'inline-flex';
      }
    }

    function updateChecklistRowPlaceholders() {
      if (!checklistContainer) return;
      const inputs = checklistContainer.querySelectorAll('.checklist-builder-input');
      const placeholderText = language.checklistPlaceholder || 'Checklist item {num}...';
      inputs.forEach((input, index) => {
        input.placeholder = placeholderText.replace('{num}', index + 1);
      });
    }

    function addChecklistRow() {
      if (!checklistContainer) return;
      const currentRows = checklistContainer.querySelectorAll('.checklist-builder-row');
      if (currentRows.length >= 10) return;

      const row = document.createElement('div');
      row.className = 'checklist-builder-row';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.width = '100%';

      const checkboxSpan = document.createElement('span');
      checkboxSpan.style.fontSize = '14px';
      checkboxSpan.style.color = 'var(--text-3)';
      checkboxSpan.style.fontWeight = '500';
      checkboxSpan.style.userSelect = 'none';
      checkboxSpan.textContent = '⬜';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'checklist-builder-input';
      const placeholderText = language.checklistPlaceholder || 'Checklist item {num}...';
      input.placeholder = placeholderText.replace('{num}', currentRows.length + 1);
      input.style.flex = '1';
      input.style.height = '32px';
      input.style.fontSize = '12.5px';
      input.style.borderRadius = '6px';
      input.style.border = '1px solid var(--border)';
      input.style.padding = '4px 8px';
      input.style.outline = 'none';
      input.style.boxSizing = 'border-box';
      input.style.fontFamily = 'inherit';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove-checklist-row';
      removeBtn.innerHTML = '&times;';
      removeBtn.style.background = 'none';
      removeBtn.style.border = 'none';
      removeBtn.style.fontSize = '16px';
      removeBtn.style.color = 'var(--text-3)';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.padding = '4px';
      removeBtn.style.display = 'inline-flex';
      removeBtn.style.alignItems = 'center';
      removeBtn.style.justifyContent = 'center';
      removeBtn.style.height = '24px';
      removeBtn.style.width = '24px';
      removeBtn.style.lineHeight = '1';
      removeBtn.style.transition = 'color 0.2s';

      removeBtn.addEventListener('mouseenter', () => removeBtn.style.color = 'var(--danger)');
      removeBtn.addEventListener('mouseleave', () => removeBtn.style.color = 'var(--text-3)');

      removeBtn.addEventListener('click', () => {
        row.remove();
        updateChecklistRowPlaceholders();
        updateSaveButtonState();
        updateAddButtonState();
      });

      input.addEventListener('input', () => {
        updateSaveButtonState();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const rows = Array.from(checklistContainer.querySelectorAll('.checklist-builder-row'));
          const idx = rows.indexOf(row);
          if (idx < rows.length - 1) {
            rows[idx + 1].querySelector('.checklist-builder-input')?.focus();
          } else {
            if (rows.length < 10) {
              addChecklistRow();
              const newRows = checklistContainer.querySelectorAll('.checklist-builder-row');
              newRows[newRows.length - 1].querySelector('.checklist-builder-input')?.focus();
            }
          }
        }
      });

      row.appendChild(checkboxSpan);
      row.appendChild(input);
      row.appendChild(removeBtn);
      checklistContainer.appendChild(row);

      updateAddButtonState();
    }

    function initChecklistBuilder() {
      if (!checklistContainer) return;
      checklistContainer.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        addChecklistRow();
      }
    }

    function handleCategoryChange() {
      const category = categorySelect?.value || 'normal';
      if (category === 'checklist') {
        if (taskInputRow) taskInputRow.style.display = 'none';
        if (checklistBuilder) checklistBuilder.style.display = 'flex';
        const inputs = checklistContainer?.querySelectorAll('.checklist-builder-input') || [];
        if (inputs.length === 0) {
          initChecklistBuilder();
        }
      } else {
        if (taskInputRow) taskInputRow.style.display = 'block';
        if (checklistBuilder) checklistBuilder.style.display = 'none';
      }
      updateSaveButtonState();
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', handleCategoryChange);
    }

    if (addChecklistItemBtn) {
      addChecklistItemBtn.addEventListener('click', () => {
        addChecklistRow();
        const inputs = checklistContainer?.querySelectorAll('.checklist-builder-input') || [];
        if (inputs.length > 0) {
          inputs[inputs.length - 1].focus();
        }
      });
    }

    function resetTaskForm() {
      try {
        if (quickInput) {
          quickInput.value = '';
          quickInput.style.height = 'auto';
        }
        if (quickTitleInput) {
          quickTitleInput.value = '';
        }
        const repeatDailyCheckbox = document.getElementById('quickTaskRemindDaily');
        if (repeatDailyCheckbox) {
          repeatDailyCheckbox.checked = false;
        }
        if (categorySelect) {
          categorySelect.value = 'normal';
          const customSelect = categorySelect.nextElementSibling;
          if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
            const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
            if (selectedText) {
              selectedText.textContent = language.categoryNormal || 'Normal';
            }
          }
        }
        if (fpQuick && typeof fpQuick.clear === 'function') {
          try {
            fpQuick.clear();
          } catch (e) {}
        }
        if (presetSelect) {
          presetSelect.value = '';
          const customSelect = presetSelect.nextElementSibling;
          if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
            const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
            if (selectedText) selectedText.textContent = 'Remind in...';
          }
        }
        if (checklistContainer) {
          checklistContainer.innerHTML = '';
        }
        handleCategoryChange();
        syncReminderDimming();
        updateSaveButtonState();
      } catch (err) {
        console.warn('[ChatOps Ext] Error in resetTaskForm:', err);
      }
    }

  const autoExpand = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  };

  const updateSaveButtonState = () => {
    const category = categorySelect?.value || 'normal';
    let hasContent = false;
    if (category === 'checklist') {
      const inputs = Array.from(checklistContainer?.querySelectorAll('.checklist-builder-input') || []);
      hasContent = inputs.some(input => input.value.trim().length > 0);
    } else {
      hasContent = quickInput?.value?.trim()?.length > 0;
    }

    if (hasContent) {
      quickSaveBtn.style.opacity = '1';
      quickSaveBtn.style.cursor = 'pointer';
    } else {
      quickSaveBtn.style.opacity = '0.5';
      quickSaveBtn.style.cursor = 'not-allowed';
    }
  };

  if (quickInput) {
    quickInput.addEventListener('input', () => {
      updateSaveButtonState();
      autoExpand(quickInput);
    });
  }
  updateSaveButtonState();

  const saveTask = async () => {
    const titleText = quickTitleInput ? quickTitleInput.value.trim() : '';
    const taskCat = categorySelect?.value || 'normal';
    let text = '';
    let checklistItems = [];

    if (taskCat === 'checklist') {
      const inputs = Array.from(checklistContainer?.querySelectorAll('.checklist-builder-input') || []);
      const vals = inputs.map(i => i.value.trim()).filter(v => v !== '');
      if (vals.length === 0) {
        const firstInput = checklistContainer?.querySelector('.checklist-builder-input');
        if (firstInput) {
          firstInput.style.borderColor = 'var(--danger)';
          firstInput.style.boxShadow = '0 0 0 2px rgba(231, 76, 60, 0.2)';
          firstInput.focus();
          setTimeout(() => {
            firstInput.style.borderColor = '';
            firstInput.style.boxShadow = '';
          }, 1500);
        }
        return;
      }
      text = vals.join('\n');
      const id = `task_${Date.now()}`;
      checklistItems = vals.map((lineText, idx) => ({ id: `${id}_line_${idx}`, text: lineText, done: false }));
    } else {
      text = quickInput.value.trim();
      if (!text) {
        quickInput.style.borderColor = 'var(--danger)';
        quickInput.style.boxShadow = '0 0 0 2px rgba(231, 76, 60, 0.2)';
        quickInput.focus();
        setTimeout(() => {
          quickInput.style.borderColor = '';
          quickInput.style.boxShadow = '';
        }, 1500);
        return;
      }
    }

    const repeatDailyCheckbox = document.getElementById('quickTaskRemindDaily');
    const isRepeatDaily = repeatDailyCheckbox ? repeatDailyCheckbox.checked : false;

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
      repeatDaily: isRepeatDaily,
      status: 'pending',
      teamName: _state.getTeam()?.name || CHATOPS_CONFIG.DEFAULT_TEAM,
      taskCategory: taskCat,
      checklist: taskCat === 'checklist' ? checklistItems : []
    };

    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 5 };
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });

    resetTaskForm();

    const startTime = item.reminder
      ? new Date(item.reminder).getTime()
      : Date.now() + settings.snoozeMinutes * 60 * 1000;
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
    
    loadTasks();

    if (window.ModalManager) {
      window.ModalManager.close();
    }
  };

  if (quickInput) {
    quickInput.addEventListener('keydown', e => { 
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        saveTask(); 
      }
    });
  }
  if (quickSaveBtn) {
    quickSaveBtn.addEventListener('click', saveTask);
  }

  const cancelBtn = document.getElementById('btnCancelTask');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      try {
        resetTaskForm();
      } catch (err) {
        console.error('[ChatOps Ext] Error in cancel button handler:', err);
      }
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
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
      const settings = res[STORAGE_KEYS.SETTINGS] || {};
      const quickDelete = settings.quickDelete === true;
      
      if (!quickDelete) {
        if (!confirm(language.confirmDeleteTask || "Are you sure you want to delete this task?")) {
          return;
        }
      }
      
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
        
        // If task is checked done, check all checklist items done
        if (task.taskCategory === 'checklist' && task.checklist) {
          task.checklist.forEach(item => {
            item.done = e.target.checked;
          });
        }
        
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

    // Checklist item toggle
    if (e.target.classList.contains('task-checklist-item-checkbox')) {
      const taskId = e.target.dataset.taskId;
      const itemIdx = parseInt(e.target.dataset.itemIdx);
      const isChecked = e.target.checked;
      
      // Update styling immediately on the DOM to ensure zero jitter/lag
      const parentLine = e.target.closest('.task-checklist-line');
      if (parentLine) {
        const textSpan = parentLine.querySelector('.task-checklist-text');
        if (textSpan) {
          textSpan.style.color = isChecked ? 'var(--text-3)' : 'var(--text-1)';
          textSpan.style.textDecoration = isChecked ? 'line-through' : 'none';
        }
      }

      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 5 };
      const task = memos.find(m => m.id === taskId);
      
      if (task && task.checklist && task.checklist[itemIdx]) {
        task.checklist[itemIdx].done = isChecked;
        
        // Check if all checklist items are completed
        const allDone = task.checklist.every(item => item.done === true);
        const card = document.getElementById('item_' + taskId);
        
        if (allDone) {
          task.done = true;
          task.doneAt = Date.now();
          chrome.alarms.clear(taskId);
          
          isLocalTaskUpdate = false;
          await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
          // Re-render when status changes so task moves to the completed section
          loadTasks();
        } else {
          // If task was previously done but now a checklist item is unchecked
          let statusChanged = false;
          if (task.done) {
            task.done = false;
            task.doneAt = null;
            statusChanged = true;
            const snoozeMins = settings.snoozeMinutes || 5;
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId, time: Date.now() + snoozeMins * 60 * 1000 });
          }
          
          isLocalTaskUpdate = true;
          await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
          setTimeout(() => { isLocalTaskUpdate = false; }, 100);
          
          if (statusChanged) {
            isLocalTaskUpdate = false;
            loadTasks();
          } else {
            // Just update parent task checkbox and layout status if needed without re-rendering everything
            if (card) {
              const parentCheckbox = card.querySelector('.task-checkbox');
              if (parentCheckbox) parentCheckbox.checked = false;
              card.classList.remove('memo-done');
            }
          }
        }
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
        const collapseBtn = card?.querySelector('.collapse-btn');
        if (collapseBtn) collapseBtn.style.display = 'none';

        const contentEl = card.querySelector('.memo-content');
        if (contentEl) {
          const actionsEl = card.querySelector('.memo-actions');
          if (actionsEl) actionsEl.style.display = 'none';
          
          contentEl.innerHTML = `
            <div class="inline-edit-form" style="margin-top: 4px; display: flex; flex-direction: column; gap: 8px;">
              <input type="text" class="inline-edit-title" placeholder="Title (optional)" value="${escapeHtml(task.title || '')}" style="width: 100%; height: 28px; font-size: 13px; font-weight: 600; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); outline: none; box-sizing: border-box; font-family: inherit;" autocomplete="off">
              <textarea class="inline-edit-textarea" rows="10" style="width: 100%; min-height: 180px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; outline: none; background: #fff; resize: vertical; color: var(--text-1);">${escapeHtml(task.note)}</textarea>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:12px; font-weight:600; color:var(--text-2);">Category:</span>
                <select class="sp-compact-select inline-edit-category" style="max-width:120px; margin:0;">
                  <option value="normal" ${task.taskCategory !== 'checklist' ? 'selected' : ''}>Normal</option>
                  <option value="checklist" ${task.taskCategory === 'checklist' ? 'selected' : ''}>Checklist</option>
                </select>
              </div>
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary inline-edit-cancel" data-id="${id}" style="padding: 4px 10px; font-size: 11.5px; height: 26px; border-radius: 6px; cursor:pointer;">${language.cancel}</button>
                <button class="btn btn-primary inline-edit-save" data-id="${id}" style="padding: 4px 10px; font-size: 11.5px; height: 26px; border-radius: 6px; cursor:pointer; color:#fff;">${language.save}</button>
              </div>
            </div>
          `;
          const ta = contentEl.querySelector('.inline-edit-textarea');
          if (ta) {
            ta.style.boxSizing = 'border-box';
            ta.style.height = 'auto';
            ta.style.height = Math.max(180, ta.scrollHeight) + 'px';
            ta.style.overflowY = 'hidden';
            ta.addEventListener('input', () => {
              ta.style.height = 'auto';
              ta.style.height = Math.max(180, ta.scrollHeight) + 'px';
            });
          }
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
            alert(language.taskEmptyError);
            return;
          }
          
          const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
          const memos = res[STORAGE_KEYS.MEMOS] || [];
          const taskIndex = memos.findIndex(m => m.id === id);
          if (taskIndex !== -1) {
            const task = memos[taskIndex];
            task.title = newTitle;
            task.note = newText;
            task.updatedAt = Date.now();
            
            const categorySelect = card.querySelector('.inline-edit-category');
            if (categorySelect) {
              task.taskCategory = categorySelect.value;
            }
            
            if (task.taskCategory === 'checklist') {
              const newLines = newText.split('\n').filter(l => l.trim());
              const oldChecklist = task.checklist || [];
              
              task.checklist = newLines.map((lineText, idx) => {
                const trimmedText = lineText.trim();
                const matchedOld = oldChecklist.find(oldItem => oldItem.text === trimmedText);
                return {
                  id: `${id}_line_${idx}`,
                  text: trimmedText,
                  done: matchedOld ? matchedOld.done : false
                };
              });
              
              // Recalculate done status of the whole task
              const allDone = task.checklist.every(item => item.done === true);
              task.done = allDone;
              if (allDone) {
                task.doneAt = Date.now();
                chrome.alarms.clear(id);
              } else {
                task.doneAt = null;
              }
            } else {
              task.checklist = [];
            }
            
            await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
          }
          loadTasks();
        }
    }
  });

  // Handle task category inline footer selection
  document.getElementById('taskList').addEventListener('change', async (e) => {
    if (e.target.classList.contains('task-edit-category')) {
      const id = e.target.dataset.id;
      const newCategory = e.target.value;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const task = memos.find(m => m.id === id);
      if (task) {
        task.taskCategory = newCategory;
        if (newCategory === 'checklist') {
          const lines = (task.note || '').split('\n').filter(l => l.trim());
          task.checklist = lines.map((text, idx) => ({ id: `${task.id}_line_${idx}`, text: text.trim(), done: false }));
        } else {
          task.checklist = [];
        }
        task.updatedAt = Date.now();
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
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
      if (isLocalTaskUpdate) return;
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
      html = `<div class="empty-state">${language.noCompletedTasks}</div>`;
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
      const confirmClear = confirm(language.taskConfirmClear);
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

  let taskBodyHtml = '';
  if (task.taskCategory === 'checklist' && task.checklist && task.checklist.length > 0) {
    taskBodyHtml = task.checklist.map((item, idx) => {
      return `<div class="task-checklist-line" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:13px;white-space:normal;"><label class="memo-checkbox-container footer-checkbox" style="margin:0;position:relative;top:2px;" title="Mark done"><input type="checkbox" class="task-checklist-item-checkbox" data-task-id="${task.id}" data-item-idx="${idx}" ${item.done ? 'checked' : ''}><span class="memo-checkmark-custom"></span></label><span class="task-checklist-text" style="flex:1;min-width:0;color:${item.done ? 'var(--text-3)' : 'var(--text-1)'};text-decoration:${item.done ? 'line-through' : 'none'};transition:all 0.2s;white-space:normal !important;">${formatRichText(item.text)}</span></div>`;
    }).join('');
  } else {
    taskBodyHtml = formatRichText(task.note || language.taskNoContent);
  }

  return `
    <div class="memo-item task-item ${task.done ? 'memo-done' : ''} ${isOverdue ? 'memo-overdue' : ''}" id="item_${task.id}">
      <div class="memo-item-header" style="display:flex; align-items:flex-start; gap:8px;">
        <div class="memo-content" style="flex:1; min-width:0;">
          ${task.title ? `<div class="memo-item-title" style="font-weight:700; font-size:13.5px; color:var(--text-1); margin-bottom:4px; letter-spacing:-0.1px;">${escapeHtml(task.title)}</div>` : ''}
          ${hasOriginalPost ? `<div class="memo-post-preview post-preview" style="display:none; margin-bottom:4px;">📌 ${escapeHtml(task.postText)}</div>` : ''}
          <div class="memo-note-text task-text collapsible-body collapsed" style="margin-top:0;">${taskBodyHtml}</div>
        </div>
        <button class="collapse-btn" data-id="${task.id}" style="flex-shrink:0; margin:0;" title="${language.expandCollapseBtn}">▶</button>
      </div>
      <div class="memo-footer">
        <div class="memo-meta" style="display:flex; align-items:center; gap:8px;">
          <label class="memo-checkbox-container footer-checkbox" title="${task.done ? language.taskMarkIncomplete : language.taskMarkDone}">
            <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
            <span class="memo-checkmark-custom"></span>
          </label>
          <span class="sp-card-date">${formatRelativeTime(task.createdAt)}</span>
          <select class="sp-compact-select task-edit-category" data-id="${task.id}" style="max-width: 95px; margin: 0; font-size: 11.5px; font-weight: 400;">
            <option value="normal" ${task.taskCategory !== 'checklist' ? 'selected' : ''}>Normal</option>
            <option value="checklist" ${task.taskCategory === 'checklist' ? 'selected' : ''}>Checklist</option>
          </select>
          ${task.repeatDaily ? `
            <span class="repeat-daily-badge" style="font-size:10px; font-weight:700; color:var(--accent); background:rgba(28,88,217,0.08); padding:1px 5px; border-radius:4px; display:inline-flex; align-items:center; gap:2px;" title="${language.taskRemindDailyLabel}">
              🔄 ${language.repeatDailyBadgeText || 'Daily'}
            </span>
          ` : ''}
          ${!task.done ? `
            <div class="task-update-reminder-wrapper ${task.reminder ? 'has-reminder' : ''}">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="reminder-clock-icon"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
              <input type="text" class="task-update-reminder" data-id="${task.id}" value="${task.reminder || ''}" placeholder="yyyy-mm-dd hh:mm" title="${language.changeReminderTime}" />
            </div>
          ` : ''}
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="post-jump-link" title="${language.memoViewOriginal}">↗</a>` : ''}
          <button class="btn-edit-memo btn-edit-task" data-id="${task.id}" title="${language.editTask}">
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
