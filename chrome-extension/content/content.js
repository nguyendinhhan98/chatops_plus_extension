/**
 * Content Script for ChatOps domain
 */

import { MESSAGE_TYPES, UI_CONFIG, SELECTORS, STORAGE_KEYS, ALARMS } from '/src/constants.js';
import { language } from '/src/lang.js';

// --- Listen for reminder notifications from the background script ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.SHOW_REMINDER) {
    showReminderBanner(message.message, message.taskId, message.isTask);
  }
});

/**
 * Displays a reminder banner at the top of the page
 */
function showReminderBanner(text, taskId, isTask = false) {
  document.querySelectorAll('.chatops-reminder-banner').forEach(el => el.remove());

  const banner = document.createElement('div');
  banner.className = 'chatops-reminder-banner';
  banner.innerHTML = `
    <div class="crb-inner">
      <div class="crb-icon">${isTask ? '📋' : '⏰'}</div>
      <div class="crb-content">
        <div class="crb-title">${isTask ? language.reminderTaskTitle : language.reminderTitle}</div>
        <div class="crb-text">${text.replace(/</g, '&lt;')}</div>
      </div>
      <button class="crb-close" title="${language.memoDelete}">×</button>
    </div>
    ${isTask ? `
      <div class="crb-task-actions">
        <button class="crb-done-btn" data-task-id="${taskId}">${language.reminderDoneBtn}</button>
      </div>
    ` : ''}
    <div class="crb-progress"></div>
  `;
  document.body.appendChild(banner);

  const duration = isTask ? UI_CONFIG.TASK_BANNER_DURATION : UI_CONFIG.BANNER_DURATION;
  const progressEl = banner.querySelector('.crb-progress');
  progressEl.style.animationDuration = `${duration}ms`;

  setTimeout(() => banner.classList.add('visible'), 10);

  const closeTimer = setTimeout(() => {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  }, duration);

  banner.querySelector('.crb-close').addEventListener('click', () => {
    clearTimeout(closeTimer);
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  });

  if (isTask && taskId) {
    banner.querySelector('.crb-done-btn').addEventListener('click', () => {
      clearTimeout(closeTimer);
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MARK_TASK_DONE, taskId });
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
      showToast(language.reminderTaskCompleted);
    });
  }
}

/**
 * Displays a toast notification
 */
function showToast(msg) {
  const existing = document.querySelector('.chatops-toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.className = 'chatops-toast';
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    bottom: 'auto',
    left: 'auto',
    transform: 'translateX(120%)',
    zIndex: '10001'
  });
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transform = 'translateX(0)';
    t.classList.add('visible');
  }, 10);
  setTimeout(() => {
    t.style.transform = 'translateX(120%)';
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 300);
  }, UI_CONFIG.TOAST_DURATION);
}

(function () {
  // Prevent duplicate injections
  if (document.getElementById('chatops-ext-floating-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'chatops-ext-floating-btn';
  btn.title = language.floatingBtnTitle;
  btn.style.cursor = 'pointer';

  const BUBBLE_SVG = `
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
      <circle cx="256" cy="240" r="210" fill="#43a047"/>
      <path d="M160 400 L120 480 L260 420" fill="#43a047"/>
      <circle cx="165" cy="240" r="32" fill="white"/>
      <circle cx="256" cy="240" r="32" fill="white"/>
      <circle cx="347" cy="240" r="32" fill="white"/>
    </svg>
  `;

  btn.innerHTML = BUBBLE_SVG;

  // Tiny "X" button to hide the floating button
  const closeIconBtn = document.createElement('div');
  closeIconBtn.id = 'chatops-ext-close-btn';
  closeIconBtn.innerHTML = '×';
  closeIconBtn.title = language.floatingBtnHide;
  btn.appendChild(closeIconBtn);

  closeIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.remove();
  });

  document.body.appendChild(btn);

  // Restore position from storage
  chrome.storage.local.get([STORAGE_KEYS.BTN_POSITION], (result) => {
    const pos = result[STORAGE_KEYS.BTN_POSITION];
    if (pos) {
      btn.style.top = pos.top;
      btn.style.left = pos.left;
      btn.style.right = 'auto';
      btn.style.transform = 'none';
    }
  });

  // Drag-and-drop logic
  let isDragging = false;
  let hasMoved = false;
  let startX, startY, initialX, initialY;

  btn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = btn.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    btn.classList.add('dragging');
    btn.style.right = 'auto';
    btn.style.transform = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved = true;
    }

    if (hasMoved) {
      let newX = initialX + dx;
      let newY = initialY + dy;
      const maxX = window.innerWidth - btn.offsetWidth;
      const maxY = window.innerHeight - btn.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      btn.style.left = `${newX}px`;
      btn.style.top = `${newY}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      btn.classList.remove('dragging');
      if (hasMoved) {
        chrome.storage.local.set({
          [STORAGE_KEYS.BTN_POSITION]: { top: btn.style.top, left: btn.style.left }
        });
      }
      setTimeout(() => { hasMoved = false; }, 50);
    }
  });

  btn.addEventListener('click', (e) => {
    if (hasMoved) {
      e.preventDefault();
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TOGGLE_SIDE_PANEL });
    } catch (err) {
      if (err.message.includes('Extension context invalidated')) {
        alert(language.extensionUpdated);
      }
    }
  });

  console.log('[ChatOps Ext] Floating button injected.');

  // --- Meme Integration into Main Chat UI ---
  function injectMemeButton() {
    const emojiBtn = document.getElementById(SELECTORS.EMOJI_BUTTON.slice(1));
    if (!emojiBtn || document.getElementById('chatops-ext-meme-btn')) return;

    const memeBtn = document.createElement('button');
    memeBtn.id = 'chatops-ext-meme-btn';
    memeBtn.type = 'button';
    memeBtn.innerHTML = '🖼️';
    memeBtn.title = 'Quick Meme Picker';
    emojiBtn.parentNode.insertBefore(memeBtn, emojiBtn.nextSibling);

    memeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMemePickerUI(memeBtn);
    });
  }

  let memePickerEl = null;
  function toggleMemePickerUI(anchorBtn) {
    if (!memePickerEl) {
      memePickerEl = document.createElement('div');
      memePickerEl.className = 'chatops-meme-picker hidden';
      memePickerEl.innerHTML = `
        <div class="chatops-meme-picker-header">
          <span>${language.memeLibrary}</span>
          <button type="button" id="chatops-meme-close" style="background:none; border:none; cursor:pointer;">✖</button>
        </div>
        <div id="chatops-meme-grid" class="chatops-meme-picker-grid">
          <div style="grid-column: 1/-1; text-align:center; padding: 20px;">${language.memeLoading}</div>
        </div>
      `;
      document.body.appendChild(memePickerEl);
      document.getElementById('chatops-meme-close').addEventListener('click', () => {
        memePickerEl.classList.add('hidden');
      });
      document.getElementById('chatops-meme-grid').addEventListener('click', (e) => {
        const img = e.target.closest('.chatops-meme-item');
        if (img) {
          insertMemeToChat(img.src);
          memePickerEl.classList.add('hidden');
        }
      });
      loadMemesToMainUI();
    }

    const isHidden = memePickerEl.classList.contains('hidden');
    if (isHidden) {
      const rect = anchorBtn.getBoundingClientRect();
      memePickerEl.style.bottom = `${window.innerHeight - rect.top + 10}px`;
      memePickerEl.style.left = `${Math.max(10, rect.left - 260)}px`;
      memePickerEl.classList.remove('hidden');
    } else {
      memePickerEl.classList.add('hidden');
    }
  }

  async function loadMemesToMainUI() {
    const grid = document.getElementById('chatops-meme-grid');
    try {
      const [imgflipRes, redditRes] = await Promise.allSettled([
        fetch('https://api.imgflip.com/get_memes').then(r => r.json()),
        fetch('https://meme-api.com/gimme/50').then(r => r.json())
      ]);
      let allMemes = [];
      if (imgflipRes.status === 'fulfilled' && imgflipRes.value.success) {
        allMemes.push(...imgflipRes.value.data.memes.map(m => ({ url: m.url })));
      }
      if (redditRes.status === 'fulfilled' && redditRes.value.memes) {
        allMemes.push(...redditRes.value.memes.map(m => ({ url: m.url })));
      }
      allMemes.sort(() => Math.random() - 0.5);
      grid.innerHTML = allMemes.slice(0, 60).map(m => `<img src="${m.url}" class="chatops-meme-item" loading="lazy" />`).join('');
    } catch (err) {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding:20px; color:red;">${language.memeError}</div>`;
    }
  }

  function insertMemeToChat(url) {
    const textarea = document.getElementById(SELECTORS.CHAT_TEXTBOX.slice(1));
    if (!textarea) return;
    const markdown = `![meme](${url})`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + markdown + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // --- Quick Task on Messages ---
  let quickNotePopover = null;
  function getOrCreatePopover() {
    if (quickNotePopover) return quickNotePopover;
    quickNotePopover = document.createElement('div');
    quickNotePopover.id = 'chatops-quick-note-popover';
    quickNotePopover.innerHTML = `
      <div class="cqn-header"><span>${language.quickTaskCreate}</span><button id="cqn-close" title="${language.memoDelete}">×</button></div>
      <div id="cqn-msg-preview" class="cqn-preview"></div>
      <textarea id="cqn-note-text" placeholder="${language.quickTaskNotePlaceholder}"></textarea>
      <div id="cqn-task-section">
        <div class="cqn-reminder-row"><label for="cqn-reminder-time">${language.quickTaskRemindAt}</label><input type="datetime-local" id="cqn-reminder-time"></div>
        <div class="cqn-task-hint">${language.quickTaskHint}</div>
      </div>
      <div class="cqn-actions">
        <button id="cqn-save-note" class="cqn-btn cqn-btn-primary">${language.quickTaskSave}</button>
        <button id="cqn-cancel" class="cqn-btn cqn-btn-secondary">${language.quickTaskCancel}</button>
      </div>
    `;
    document.body.appendChild(quickNotePopover);
    document.getElementById('cqn-close').addEventListener('click', () => quickNotePopover.classList.remove('visible'));
    document.getElementById('cqn-cancel').addEventListener('click', () => quickNotePopover.classList.remove('visible'));
    document.addEventListener('mousedown', (e) => {
      if (quickNotePopover && !quickNotePopover.contains(e.target) && !e.target.closest('.chatops-quick-note-btn')) {
        quickNotePopover.classList.remove('visible');
      }
    });
    return quickNotePopover;
  }

  function openQuickNote(postEl, anchorBtn) {
    const popover = getOrCreatePopover();
    const msgBodyEl = postEl.querySelector('.post-message__text, .post__body p, [class*="post-message"]');
    const msgText = msgBodyEl ? msgBodyEl.innerText.trim().slice(0, 120) : '(Content not accessible)';
    const postId = postEl.id ? postEl.id.replace(SELECTORS.POST_ID_PREFIX, '') : '';
    document.getElementById('cqn-msg-preview').textContent = msgText + (msgText.length >= 120 ? '...' : '');
    document.getElementById('cqn-note-text').value = '';
    document.getElementById('cqn-reminder-time').value = '';
    popover.dataset.postId = postId;
    popover.dataset.postText = msgText;
    const rect = anchorBtn.getBoundingClientRect();
    const popoverWidth = 310;
    let left = rect.left - popoverWidth - 8;
    if (left < 8) left = rect.right + 8;
    let top = Math.min(rect.top, window.innerHeight - 300);
    popover.style.left = `${left}px`;
    popover.style.top = `${Math.max(8, top)}px`;
    popover.classList.add('visible');
    const saveBtn = document.getElementById('cqn-save-note');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => saveTask(popover));
    setTimeout(() => document.getElementById('cqn-note-text').focus(), 50);
  }

  async function saveTask(popover) {
    const { postId, postText } = popover.dataset;
    const noteText = document.getElementById('cqn-note-text').value.trim();
    const reminderTime = document.getElementById('cqn-reminder-time').value;
    const id = `${ALARMS.TASK_PREFIX}${Date.now()}`;
    const item = { id, type: 'task', postId, postText, note: noteText || postText, createdAt: Date.now(), done: false, reminder: reminderTime || null, status: 'pending' };
    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MEMO_UPDATED });
    const startTime = reminderTime ? new Date(reminderTime).getTime() : Date.now() + UI_CONFIG.TASK_SNOOZE_MINUTES * 60 * 1000;
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
    popover.classList.remove('visible');
    showToast(language.quickTaskSaveSuccess);
  }

  function injectQuickNoteButtons() {
    const posts = document.querySelectorAll(`.post:not(.chatops-note-injected), [class*="${SELECTORS.POST_ID_PREFIX}"]:not(.chatops-note-injected)`);
    posts.forEach(postEl => {
      if (!postEl.id?.startsWith(SELECTORS.POST_ID_PREFIX)) return;
      postEl.classList.add('chatops-note-injected');
      const actionArea = postEl.querySelector('.post__actions, .post-menu, [class*="post-menu"], [aria-label*="actions"], .actions-container');
      if (!actionArea) return;
      const noteBtn = document.createElement('button');
      noteBtn.className = 'chatops-quick-note-btn';
      noteBtn.innerHTML = '📌';
      noteBtn.title = 'Quick Task / Reminder';
      noteBtn.addEventListener('click', (e) => { e.stopPropagation(); openQuickNote(postEl, noteBtn); });
      actionArea.appendChild(noteBtn);
    });
  }

  const observer = new MutationObserver(() => { injectMemeButton(); injectQuickNoteButtons(); });
  observer.observe(document.body, { childList: true, subtree: true });
  injectMemeButton();
  injectQuickNoteButtons();
})();
