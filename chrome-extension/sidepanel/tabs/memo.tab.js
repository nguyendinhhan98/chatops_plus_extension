/**
 * Memo (Notes) Tab Module — ChatOps Chrome Extension
 * Manages personal notes/ghi chú.
 */

import { escapeHtml, makePermalinkSync, formatRelativeTime } from '../../src/utils/index.js';
import { CHATOPS_CONFIG, STORAGE_KEYS, TABS } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;

/**
 * Initializes the Memo (Notes) Tab
 * @param {Object} state - Centralized state module
 */
export function setup(state) {
  _state = state;

  const quickInput = document.getElementById('quickNoteInput');
  const quickSaveBtn = document.getElementById('btnQuickNoteSave');

  const saveNote = async () => {
    const text = quickInput.value.trim();
    if (!text) return;

    const categorySelect = document.getElementById('quickNoteCategory');
    const category = categorySelect ? categorySelect.value : 'general';

    const id = `memo_${Date.now()}`;
    const item = {
      id,
      type: 'memo',
      postId: null,
      postText: null,
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
    loadMemos();
  };

  quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveNote(); });
  quickSaveBtn.addEventListener('click', saveNote);

  // Event delegation for note list
  document.getElementById('memoNoteList').addEventListener('click', async (e) => {
    // Delete note
    if (e.target.classList.contains('btn-delete-memo')) {
      const id = e.target.dataset.id;
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
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
  });

  // Category filter
  document.getElementById('noteCategoryFilter')?.addEventListener('change', loadMemos);

  // Reload when tab is clicked
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === TABS.MEMO) btn.addEventListener('click', loadMemos);
  });

  loadMemos();
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
  const filter = document.getElementById('noteCategoryFilter')?.value || 'all';
  if (filter !== 'all') {
    notes = notes.filter(n => (n.category || 'general') === filter);
  }

  // Update badge
  const noteBadge = document.getElementById('noteTabBadge');
  if (noteBadge) {
    const totalNotes = allItems.filter(m => m.type === 'memo').length;
    noteBadge.textContent = totalNotes > 0 ? totalNotes : '';
  }

  if (notes.length === 0) {
    noteList.innerHTML = `<div class="empty-state"><div style="font-size:36px;margin-bottom:12px">📝</div>${language.memoNotesEmpty}<br><span style="font-size:12px;color:var(--text-3)">${language.memoClickHint}</span></div>`;
    return;
  }

  noteList.innerHTML = notes.map(note => renderNoteCard(note)).join('');
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

  const escapedText = escapeHtml(note.note || language.memoEmptyNote);
  const rawText = note.note || '';
  const hasOriginalPost = note.postId && note.postText && note.postText !== note.note;
  
  const categoryMap = {
    general: 'Chung',
    work: 'Công việc',
    personal: 'Cá nhân',
    ideas: 'Ý tưởng'
  };
  const categoryLabel = categoryMap[note.category || 'general'] || 'Chung';

  return `
    <div class="memo-item note-item" id="item_${note.id}">
      <div class="note-content-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div class="memo-note-text note-body" style="flex:1;">${escapedText}</div>
        <button class="btn-copy-note" data-text="${rawText.replace(/"/g, '&quot;')}" title="${language.memoCopyNote}">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
          </svg>
        </button>
      </div>
      <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
        <span style="font-size:10px; padding:2px 6px; background:var(--bg-2); border:1px solid var(--border); border-radius:10px; color:var(--text-3); font-weight:600;">📁 ${categoryLabel}</span>
      </div>
      ${hasOriginalPost ? `<div class="memo-post-preview" style="margin-top:8px;">📌 ${escapeHtml(note.postText)}</div>` : ''}
      <div class="memo-footer">
        <div class="memo-meta">
          <span>📅 ${formatRelativeTime(note.createdAt)}</span>
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="post-jump-link" title="${language.memoViewOriginal}">↗</a>` : ''}
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
