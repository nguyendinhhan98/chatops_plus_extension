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

    const id = `note_${Date.now()}`;
    const item = {
      id,
      type: 'note',
      postId: null,
      postText: null,
      note: text,
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
  const notes = allItems.filter(m => m.type === 'note');

  // Update badge
  const noteBadge = document.getElementById('noteTabBadge');
  if (noteBadge) noteBadge.textContent = notes.length > 0 ? notes.length : '';

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
  // Only show postText (the original message) if it's different from the note body
  const hasOriginalPost = note.postId && note.postText && note.postText !== note.note;

  return `
    <div class="memo-item note-item" id="item_${note.id}">
      <div class="note-content-row">
        <div class="memo-note-text note-body">${escapedText}</div>
        <button class="btn-copy-note" data-text="${rawText.replace(/"/g, '&quot;')}" title="${language.memoCopyNote}">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
          </svg>
        </button>
      </div>
      ${hasOriginalPost ? `<div class="memo-post-preview">📌 ${escapeHtml(note.postText)}</div>` : ''}
      <div class="memo-footer">
        <div class="memo-meta">
          <span>📅 ${formatRelativeTime(note.createdAt)}</span>
        </div>
        <div class="memo-actions">
          ${permalink ? `<a href="${permalink}" class="post-jump-link" title="${language.memoViewOriginal}">↗</a>` : ''}
          <button class="btn-delete-memo" data-id="${note.id}" title="${language.memoDelete}">×</button>
        </div>
      </div>
    </div>
  `;
}
