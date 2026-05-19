/**
 * Memo (Notes) Tab Module — ChatOps Chrome Extension
 * Manages personal notes/memos.
 */

import { escapeHtml, makePermalinkSync, formatRelativeTime, formatRichText } from '../../src/utils/index.js';
import { CHATOPS_CONFIG, STORAGE_KEYS, TABS } from '../../src/constants.js';
import { language } from '../../src/lang.js';

function getCategoryDisplayName(cat) {
  switch (cat.toLowerCase()) {
    case 'all': return language.categoryAll;
    case 'general': return language.categoryGeneral;
    case 'work': return language.categoryWork;
    case 'personal': return language.categoryPersonal;
    case 'ideas': return language.categoryIdeas;
    default: return cat;
  }
}

let _state = null;

/**
 * Initializes the Memo (Notes) Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;

  const quickInput = document.getElementById('quickNoteInput');
  const quickTitleInput = document.getElementById('quickNoteTitle');
  const quickSaveBtn = document.getElementById('btnQuickNoteSave');

  renderCategories();

  // Handle toggle collapse
  const btnToggle = document.getElementById('btnToggleMemo');
  const memoForm = document.getElementById('spMemoForm');
  if (btnToggle && memoForm) {
    btnToggle.addEventListener('click', () => {
      memoForm.classList.toggle('collapsed');
      btnToggle.classList.toggle('collapsed');
    });
  }

  const autoExpand = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  };

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
  quickInput.addEventListener('input', () => {
    updateSaveButtonState();
    autoExpand(quickInput);
  });
  updateSaveButtonState();

  const saveNote = async () => {
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

    const categorySelect = document.getElementById('quickNoteCategory');
    const category = categorySelect ? categorySelect.value : 'General';

    const titleText = quickTitleInput ? quickTitleInput.value.trim() : '';

    const id = `memo_${Date.now()}`;
    const item = {
      id,
      type: 'memo',
      postId: null,
      postText: null,
      title: titleText || '',
      note: text,
      category: category,
      createdAt: Date.now(),
      done: false,
      reminder: null,
      status: 'pending'
    };

    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });

    quickInput.value = '';
    quickInput.style.height = 'auto';
    if (quickTitleInput) {
      quickTitleInput.value = '';
    }
    updateSaveButtonState();
    loadMemos();

    // Close the Action Modal
    if (window.ModalManager) {
      window.ModalManager.close();
    }
  };

  quickInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      saveNote();
    }
  });
  quickSaveBtn.addEventListener('click', saveNote);

  const cancelBtn = document.getElementById('btnCancelNote');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (window.ModalManager) {
        window.ModalManager.close();
      }
    });
  }

  // Local Notes Backup (Markdown Export & Import)
  const exportBtn = document.getElementById('btnExportNotes');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const allMemos = res[STORAGE_KEYS.MEMOS] || [];
      const notesOnly = allMemos.filter(m => m.type === 'memo');
      
      if (notesOnly.length === 0) {
        alert(language.noNotesToExport || "No notes to export!");
        return;
      }
      
      let mdStr = '';
      notesOnly.forEach(m => {
        mdStr += `## Note: ${m.title || ''}\n`;
        mdStr += `- ID: ${m.id}\n`;
        mdStr += `- Created: ${new Date(m.createdAt).toISOString()}\n`;
        mdStr += `- Updated: ${new Date(m.updatedAt || m.createdAt).toISOString()}\n`;
        mdStr += `\n${m.note}\n\n---\n\n`;
      });
      
      const blob = new Blob([mdStr], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mcp_notes_backup_${new Date().toISOString().slice(0,10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  const importFileInput = document.getElementById('importNotesFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target.result.trim();
          let validNotes = [];
          
          if (content.startsWith('[') || content.startsWith('{')) {
            // Parse as JSON for backward compatibility
            const importedData = JSON.parse(content);
            const arr = Array.isArray(importedData) ? importedData : [importedData];
            validNotes = arr.filter(item => item && item.id && item.type === 'memo' && item.note);
          } else {
            // Parse as Markdown/Text
            const rawNotes = content.split(/[\r\n]+---[\r\n]+/);
            for (const raw of rawNotes) {
              const trimmed = raw.trim();
              if (!trimmed) continue;
              
              const lines = trimmed.split('\n');
              let title = '';
              let id = '';
              let createdAt = Date.now();
              let updatedAt = Date.now();
              let noteLines = [];
              let inContent = false;
              
              for (const line of lines) {
                if (inContent) {
                  noteLines.push(line);
                } else if (line.startsWith('## Note:')) {
                  title = line.substring(8).trim();
                } else if (line.startsWith('- ID:')) {
                  id = line.substring(5).trim();
                } else if (line.startsWith('- Created:')) {
                  const dateStr = line.substring(10).trim();
                  createdAt = Date.parse(dateStr) || Date.now();
                } else if (line.startsWith('- Updated:')) {
                  const dateStr = line.substring(10).trim();
                  updatedAt = Date.parse(dateStr) || Date.now();
                } else if (line.trim() === '') {
                  if (id) {
                    inContent = true;
                  }
                } else {
                  inContent = true;
                  noteLines.push(line);
                }
              }
              
              const noteContent = noteLines.join('\n').trim();
              if (id && noteContent) {
                validNotes.push({
                  id,
                  type: 'memo',
                  title,
                  note: noteContent,
                  createdAt,
                  updatedAt
                });
              }
            }
          }
          
          if (validNotes.length === 0) {
            alert(language.noValidNotesFound || "No valid notes found in file!");
            return;
          }
          
          const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
          const currentMemos = res[STORAGE_KEYS.MEMOS] || [];
          
          let importCount = 0;
          let updateCount = 0;
          
          const updatedMemos = [...currentMemos];
          
          validNotes.forEach(newNote => {
            const existingIdx = updatedMemos.findIndex(m => m.id === newNote.id);
            if (existingIdx !== -1) {
              // Existing note: update if imported note is newer or equal
              const existingNote = updatedMemos[existingIdx];
              if (!existingNote.updatedAt || !newNote.updatedAt || newNote.updatedAt >= existingNote.updatedAt) {
                updatedMemos[existingIdx] = { ...existingNote, ...newNote };
                updateCount++;
              }
            } else {
              // New note: insert
              updatedMemos.push(newNote);
              importCount++;
            }
          });
          
          await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: updatedMemos });
          
          const successMsg = (language.importSuccess || "🎉 Successfully imported {count} notes!")
            .replace('{count}', importCount + updateCount);
          alert(successMsg);
          
          importFileInput.value = '';
          loadMemos();
        } catch (err) {
          alert((language.importFailed || "❌ Import failed. Please check the file content.") + "\n" + err.message);
          importFileInput.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // Event delegation for note list
  document.getElementById('memoNoteList').addEventListener('click', async (e) => {
    // Delete note
    if (e.target.classList.contains('btn-delete-memo')) {
      const id = e.target.dataset.id;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
      const settings = res[STORAGE_KEYS.SETTINGS] || {};
      const quickDelete = settings.quickDelete === true;
      
      if (!quickDelete) {
        if (!confirm(language.confirmDeleteNote || "Are you sure you want to delete this note?")) {
          return;
        }
      }
      
      const memos = (res[STORAGE_KEYS.MEMOS] || []).filter(m => m.id !== id);
      await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
      loadMemos();
    }

    // Copy note content
    if (e.target.closest('.btn-copy-note')) {
      const btn = e.target.closest('.btn-copy-note');
      const text = btn.dataset.text;
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>`;
        btn.style.color = 'var(--success)';
        setTimeout(() => { btn.innerHTML = original; btn.style.color = ''; }, 1500);
      } catch {}
    }

    // Copy single line trigger (click anywhere on the line)
    const lineItem = e.target.closest('.note-line-item');
    if (lineItem && !e.target.closest('.post-link')) {
      e.stopPropagation();
      const btnCopyLine = lineItem.querySelector('.btn-copy-line');
      if (btnCopyLine) {
        const text = btnCopyLine.dataset.text;
        try {
          await navigator.clipboard.writeText(text);
          const original = btnCopyLine.innerHTML;
          btnCopyLine.innerHTML = `<span style="font-size:9.5px; color:var(--success); font-weight:700; display:inline-flex; align-items:center; justify-content:center;">✓</span>`;
          btnCopyLine.style.opacity = '1';
          
          // Flash background color of the line item to indicate copy success!
          const originalBg = lineItem.style.background;
          lineItem.style.background = 'rgba(46, 204, 113, 0.12)';
          lineItem.style.transition = 'background 0.15s ease';
          
          setTimeout(() => {
            btnCopyLine.innerHTML = original;
            btnCopyLine.style.opacity = '';
            lineItem.style.background = originalBg;
          }, 1000);
        } catch {}
      }
    }

    // Inline edit trigger
    const btnEdit = e.target.closest('.btn-edit-memo');
    if (btnEdit && !btnEdit.classList.contains('btn-edit-task')) {
      const id = btnEdit.dataset.id;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const note = memos.find(m => m.id === id);
      if (note) {
        const card = document.getElementById('item_' + id);
        const collapseBtn = card?.querySelector('.collapse-btn');
        if (collapseBtn) collapseBtn.style.display = 'none';
        const contentEl = card.querySelector('.note-content-row');
        if (contentEl) {
          const actionsEl = card.querySelector('.memo-actions');
          if (actionsEl) actionsEl.style.display = 'none';
          
          contentEl.innerHTML = `
            <div class="inline-edit-form" style="width:100%; display: flex; flex-direction: column; gap: 8px;">
              <input type="text" class="inline-edit-title" placeholder="Title (optional)" value="${escapeHtml(note.title || '')}" style="width: 100%; height: 28px; font-size: 13px; font-weight: 600; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); outline: none; box-sizing: border-box; font-family: inherit;" autocomplete="off">
              <textarea class="inline-edit-textarea" rows="10" style="width: 100%; min-height: 180px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; outline: none; background: #fff; resize: vertical; color: var(--text-1);">${escapeHtml(note.note)}</textarea>
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
      loadMemos();
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
          alert(language.memoEmptyNoteError);
          return;
        }
        
        const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = res[STORAGE_KEYS.MEMOS] || [];
        const noteIndex = memos.findIndex(m => m.id === id);
        if (noteIndex !== -1) {
          memos[noteIndex].title = newTitle;
          memos[noteIndex].note = newText;
          memos[noteIndex].updatedAt = Date.now();
          await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        }
        loadMemos();
      }
    }
  });

  // Handle note category inline editing
  document.getElementById('memoNoteList').addEventListener('change', async (e) => {
    if (e.target.classList.contains('note-edit-category')) {
      const id = e.target.dataset.id;
      const newCategory = e.target.value;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const memos = res[STORAGE_KEYS.MEMOS] || [];
      const note = memos.find(m => m.id === id);
      if (note) {
        note.category = newCategory;
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        loadMemos();
      }
    }
  });

  // Category filter delegation
  document.getElementById('memoCategoryTabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('memo-sub-tab')) {
      document.querySelectorAll('#memoCategoryTabs .memo-sub-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadMemos();
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === TABS.MEMO) btn.addEventListener('click', loadMemos);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
      renderCategories();
    }
  });

  loadMemos();
}

/**
 * Renders categories to the selects
 */
async function renderCategories() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  const categories = res[STORAGE_KEYS.SETTINGS]?.memoCategories || ['General', 'Work', 'Personal', 'Ideas'];
  
  const quickSelect = document.getElementById('quickNoteCategory');
  const tabsContainer = document.getElementById('memoCategoryTabs');
  
  if (quickSelect) {
    quickSelect.innerHTML = categories.map(c => `<option value="${c}">📁 ${getCategoryDisplayName(c)}</option>`).join('');
    if (typeof window.convertToCustomDropdown === 'function') {
      window.convertToCustomDropdown('quickNoteCategory', '140px');
    }
  }
  
  if (tabsContainer) {
    const currentActive = tabsContainer.querySelector('.memo-sub-tab.active')?.dataset.category || 'all';
    let html = `<button class="memo-sub-tab ${currentActive === 'all' ? 'active' : ''}" data-category="all">${getCategoryDisplayName('all').toUpperCase()}</button>`;
    html += categories.map(c => `
      <button class="memo-sub-tab ${currentActive === c ? 'active' : ''}" data-category="${c}">${getCategoryDisplayName(c).toUpperCase()}</button>
    `).join('');
    tabsContainer.innerHTML = html;
  }
}

/**
 * Loads and renders all notes from storage
 */
export async function loadMemos() {
  const noteList = document.getElementById('memoNoteList');
  if (!noteList) return;

  const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
  const allItems = res[STORAGE_KEYS.MEMOS] || [];
  let notes = allItems.filter(m => m.type === 'memo');

  // Filter by category
  const activeTab = document.querySelector('#memoCategoryTabs .memo-sub-tab.active');
  const filter = activeTab ? activeTab.dataset.category : 'all';
  if (filter !== 'all') {
    notes = notes.filter(n => (n.category || 'General') === filter);
  }

  // Update badge
  const noteBadge = document.getElementById('noteTabBadge');
  if (noteBadge) {
    const totalNotes = allItems.filter(m => m.type === 'memo').length;
    noteBadge.textContent = totalNotes > 0 ? totalNotes : '';
  }

  if (notes.length === 0) {
    noteList.innerHTML = `<div class="empty-state">${language.memoNotesEmpty}</div>`;
    return;
  }

  const settingsRes = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  const categories = settingsRes[STORAGE_KEYS.SETTINGS]?.memoCategories || ['General', 'Work', 'Personal', 'Ideas'];

  noteList.innerHTML = notes.map(note => renderNoteCard(note, categories)).join('');

  // Only show collapse button if the text overflows (more than 2 lines)
  noteList.querySelectorAll('.memo-item').forEach(card => {
    const textEl = card.querySelector('.memo-note-text');
    const collapseBtn = card.querySelector('.collapse-btn');
    if (textEl && collapseBtn) {
      const isOverflowing = textEl.scrollHeight > textEl.clientHeight + 1;
      if (!isOverflowing) {
        collapseBtn.style.display = 'none';
      }
    }
  });
}

/**
 * Renders a note card component
 */
function renderNoteCard(note, categories = ['General', 'Work', 'Personal', 'Ideas']) {
  const cachedConfig = _state.getConfig();
  const currentTeam = _state.getTeam();
  const permalink = note.postId && cachedConfig
    ? makePermalinkSync(note.postId, cachedConfig.chatopsUrl, currentTeam?.name || CHATOPS_CONFIG.DEFAULT_TEAM)
    : null;

  const rawText = note.note || '';
  const lines = rawText.split('\n');
  const escapedText = lines.map((line) => {
    if (!line.trim()) {
      return `<div class="note-line-blank"></div>`;
    }
    const escapedLine = formatRichText(line);
    const rawLineEscaped = line.replace(/"/g, '&quot;');
    return `<div class="note-line-item" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 2px;" title="${language.clickToCopyLine || 'Click to copy this line'}"><span class="note-line-text">${escapedLine}</span><button class="btn-copy-line" data-text="${rawLineEscaped}" title="${language.clickToCopyLine || 'Click to copy this line'}" style="background: none; border: none; padding: 2px; cursor: pointer; color: var(--text-3); opacity: 0; transition: opacity 0.2s; display: inline-flex; align-items: center; justify-content: center; height: 18px; width: 18px; margin-top: 2px;"><svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg></button></div>`;
  }).join('');
  
  const hasOriginalPost = note.postId && note.postText && note.postText !== note.note;
  
  const categoryLabel = note.category || 'General';
  const categoryOptions = categories.map(c => `
    <option value="${c}" ${c === categoryLabel ? 'selected' : ''}>${getCategoryDisplayName(c)}</option>
  `).join('');

  return `
    <div class="memo-item note-item cat-${categoryLabel.toLowerCase()}" id="item_${note.id}">
      <div class="note-content-row" style="display:flex; align-items:flex-start; gap:8px;">
        <div class="memo-content" style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
          ${note.title ? `<div class="memo-item-title" style="font-weight:700; font-size:13.5px; color:var(--text-1); margin-bottom:2px; letter-spacing:-0.1px;">${escapeHtml(note.title)}</div>` : ''}
          <div class="memo-note-text note-body collapsible-body collapsed" style="margin-top:0;">${escapedText}</div>
        </div>
        <button class="collapse-btn" data-id="${note.id}" style="flex-shrink:0; margin:0;" title="${language.expandCollapseBtn}">▶</button>
        <button class="btn-copy-note" data-text="${rawText.replace(/"/g, '&quot;')}" title="${language.memoCopyNote}" style="flex-shrink:0; margin:0;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
          </svg>
        </button>
      </div>
      ${hasOriginalPost ? `<div class="memo-post-preview post-preview" style="display:none; margin-top:8px;">📌 ${escapeHtml(note.postText)}</div>` : ''}
      <div class="memo-footer">
        <div class="memo-meta" style="display:flex; align-items:center; gap:6px;">
          <span class="sp-card-date">${formatRelativeTime(note.createdAt)}</span>
          <select class="sp-compact-select note-edit-category" data-category="${categoryLabel.toLowerCase()}" data-id="${note.id}">
            ${categoryOptions}
          </select>
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="post-jump-link" title="${language.memoViewOriginal}">↗</a>` : ''}
          <button class="btn-edit-memo" data-id="${note.id}" title="${language.editNote}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; opacity:0.85;">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="btn-delete-memo" data-id="${note.id}" title="${language.memoDelete}">
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
