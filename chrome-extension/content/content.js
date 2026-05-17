/**
 * Content Script for ChatOps domain
 */

import { MESSAGE_TYPES, UI_CONFIG, SELECTORS, STORAGE_KEYS, ALARMS } from '../src/constants.js';
import { language } from '../src/lang.js';

// --- Listen for reminder notifications from the background script ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.SHOW_REMINDER) {
    showReminderBanner(message.message, message.taskId, message.isTask, message.postId, message.teamName);
  }
});

async function injectDynamicTheme() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  const settings = res[STORAGE_KEYS.SETTINGS] || { themeColor: '#1c58d9' };
  
  let styleEl = document.getElementById('chatops-dynamic-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'chatops-dynamic-theme';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    :root {
      --chatops-accent: ${settings.themeColor};
    }
    .chatops-reminder-banner { border-top-color: var(--chatops-accent) !important; }
    .crb-title { color: var(--chatops-accent) !important; }
    .crb-progress { background: var(--chatops-accent) !important; }
    .cqn-header { background: var(--chatops-accent) !important; }
    .cqn-btn-primary { background: var(--chatops-accent) !important; }
    .cqn-mode-btn.active { color: var(--chatops-accent) !important; border-color: var(--chatops-accent) !important; background: rgba(0,0,0,0.05) !important; }
    .cqn-preview { border-left-color: var(--chatops-accent) !important; }
  `;
}

/**
 * Displays a reminder banner at the top of the page
 */
async function showReminderBanner(text, taskId, isTask = false, postId = null, taskTeamName = null) {
  await injectDynamicTheme();

  let container = document.getElementById('chatops-banner-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'chatops-banner-container';
    container.style.cssText = 'position: fixed; top: 24px; right: 20px; width: 310px; display: flex; flex-direction: column; gap: 12px; z-index: 2147483647; pointer-events: none;';
    document.body.appendChild(container);
  }

  const isLongText = text.length > 80 || text.includes('\n');
  const escText = text.replace(/</g, '&lt;');

  const banner = document.createElement('div');
  banner.className = 'chatops-reminder-banner';
  banner.innerHTML = `
    <div class="crb-inner">
      <div class="crb-icon">${isTask ? '📋' : '⏰'}</div>
      <div class="crb-content" style="display:flex; flex-direction:column; min-width:0; flex:1;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom: 3px;">
          <div class="crb-title" style="margin-bottom:0;">${isTask ? language.reminderTaskTitle : language.reminderTitle}</div>
          ${isLongText ? `<button class="crb-collapse-btn collapse-btn" style="width:16px; height:16px; font-size:7px; margin-left:8px;" title="Mở rộng/Thu gọn">▶</button>` : ''}
        </div>
        <div class="crb-text ${isLongText ? 'collapsible-body collapsed' : ''}" style="${isLongText ? 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; transition: all 0.2s;' : 'white-space: pre-wrap;'}">${escText}</div>
      </div>
      <button class="crb-close" title="${language.memoDelete}">×</button>
    </div>
    ${isTask ? `
      <div class="crb-task-actions">
        <button class="crb-done-btn" data-task-id="${taskId}">${language.reminderDoneBtn}</button>
        ${postId ? `<button class="crb-jump-btn" data-post-id="${postId}">Đi tới tin nhắn</button>` : ''}
      </div>
    ` : ''}
    <div class="crb-progress"></div>
  `;
  container.appendChild(banner);

  const duration = isTask ? UI_CONFIG.TASK_BANNER_DURATION : UI_CONFIG.BANNER_DURATION;
  const progressEl = banner.querySelector('.crb-progress');
  progressEl.style.animationDuration = `${duration}ms`;

  setTimeout(() => banner.classList.add('visible'), 10);

  let closeTimer = setTimeout(() => {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  }, duration);

  banner.querySelector('.crb-close').addEventListener('click', () => {
    if (closeTimer) clearTimeout(closeTimer);
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  });

  if (isLongText) {
    const collBtn = banner.querySelector('.crb-collapse-btn');
    const textEl = banner.querySelector('.crb-text');
    if (collBtn && textEl) {
      collBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = textEl.classList.toggle('collapsed');
        if (isCollapsed) {
          collBtn.innerHTML = '▶';
          collBtn.classList.remove('expanded');
          textEl.style.whiteSpace = 'nowrap';
          textEl.style.overflow = 'hidden';
          textEl.style.textOverflow = 'ellipsis';
          textEl.style.maxWidth = '220px';
        } else {
          collBtn.innerHTML = '▼';
          collBtn.classList.add('expanded');
          textEl.style.whiteSpace = 'pre-wrap';
          textEl.style.overflow = 'visible';
          textEl.style.textOverflow = 'clip';
          textEl.style.maxWidth = 'none';
          
          // Stop auto-close when user expands to read
          if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
          }
          if (progressEl) {
            progressEl.style.animationPlayState = 'paused';
            progressEl.style.opacity = '0';
          }
        }
      });
    }
  }

  if (isTask && taskId) {
    banner.querySelector('.crb-done-btn').addEventListener('click', () => {
      if (closeTimer) clearTimeout(closeTimer);
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MARK_TASK_DONE, taskId });
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
      showToast(language.reminderTaskCompleted);
    });

    const jumpBtn = banner.querySelector('.crb-jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        if (closeTimer) clearTimeout(closeTimer);
        const teamName = taskTeamName || window.location.pathname.split('/')[1] || CHATOPS_CONFIG.DEFAULT_TEAM;
        window.location.href = `/${teamName}/pl/${postId}`;
      });
    }
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
  injectDynamicTheme();
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

  async function loadCustomMemes() {
    const res = await chrome.storage.local.get(['custom_memes']);
    const customMemes = res.custom_memes || [];
    const container = document.getElementById('chatops-custom-memes-grid');
    if (!container) return;

    if (customMemes.length === 0) {
      container.innerHTML = `<span style="font-size:11px; color:#999; margin: auto;">Chưa có meme tự thêm</span>`;
      return;
    }

    container.innerHTML = customMemes.map((url, idx) => `
      <div style="position:relative; flex-shrink:0; display:inline-block; width:48px; height:48px;">
        <img src="${url}" class="chatops-custom-meme-item" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid #e0e0e5;" />
        <button class="chatops-custom-meme-delete" data-idx="${idx}" style="position:absolute; top:-2px; right:-2px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:14px; height:14px; font-size:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; line-height:1; font-weight:bold; outline:none; transition:background 0.2s;">&times;</button>
      </div>
    `).join('');
  }

  function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw white background if converting to JPEG to avoid black transparent areas
        const isPNG = file.type === 'image/png';
        if (!isPNG) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = isPNG ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function registerCustomMemeEvents() {
    const fileInput = document.getElementById('chatops-meme-upload-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        compressImage(file, 1000, 1000, 0.9, async (dataUrl) => {
          const res = await chrome.storage.local.get(['custom_memes']);
          const customMemes = res.custom_memes || [];
          customMemes.unshift(dataUrl);
          await chrome.storage.local.set({ custom_memes: customMemes });
          fileInput.value = '';
          loadCustomMemes();
        });
      });
    }

    const container = document.getElementById('chatops-custom-memes-grid');
    if (container) {
      container.addEventListener('click', async (e) => {
        const img = e.target.closest('.chatops-custom-meme-item');
        if (img) {
          insertMemeToChat(img.src);
          if (memePickerEl) memePickerEl.classList.add('hidden');
          return;
        }

        const delBtn = e.target.closest('.chatops-custom-meme-delete');
        if (delBtn) {
          e.stopPropagation();
          const idx = parseInt(delBtn.dataset.idx, 10);
          const res = await chrome.storage.local.get(['custom_memes']);
          const customMemes = res.custom_memes || [];
          customMemes.splice(idx, 1);
          await chrome.storage.local.set({ custom_memes: customMemes });
          loadCustomMemes();
        }
      });
    }
  }

  function toggleMemePickerUI(anchorBtn) {
    if (!memePickerEl) {
      memePickerEl = document.createElement('div');
      memePickerEl.className = 'chatops-meme-picker hidden';
      memePickerEl.innerHTML = `
        <div class="chatops-meme-picker-header">
          <span>${language.memeLibrary}</span>
          <button type="button" id="chatops-meme-close" style="background:none; border:none; cursor:pointer;">✖</button>
        </div>
        <div class="chatops-meme-upload-area" style="padding: 8px 12px; border-bottom: 1px solid #e0e0e5; background: #fafafa; display: flex; flex-direction: column; gap: 6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase;">Meme của bạn</span>
            <label for="chatops-meme-upload-input" style="font-size: 11px; font-weight: 700; color: #1c58d9; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; background: rgba(28, 88, 217, 0.08); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(28, 88, 217, 0.15); transition: all 0.2s;">
              ➕ Thêm ảnh
            </label>
            <input type="file" id="chatops-meme-upload-input" accept="image/*" style="display:none;" />
          </div>
          <div id="chatops-custom-memes-grid" style="display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; min-height: 48px; max-height: 70px; align-items: center;">
            <span style="font-size:11px; color:#999; margin: auto;">Chưa có meme tự thêm</span>
          </div>
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
      loadCustomMemes();
      registerCustomMemeEvents();
    }

    const isHidden = memePickerEl.classList.contains('hidden');
    if (isHidden) {
      loadCustomMemes();
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

  function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  }

  function insertMemeToChat(url) {
    const textarea = document.getElementById(SELECTORS.CHAT_TEXTBOX.slice(1));
    if (!textarea) return;

    if (url.startsWith('data:')) {
      try {
        const blob = dataURLtoBlob(url);
        const ext = blob.type.split('/')[1] || 'png';
        const file = new File([blob], `meme.${ext}`, { type: blob.type });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true
        });

        textarea.focus();
        textarea.dispatchEvent(pasteEvent);
      } catch (err) {
        console.error('Failed to paste custom meme:', err);
      }
      return;
    }

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
  let quickNoteBackdrop = null;

  function getOrCreatePopover() {
    if (quickNotePopover) return quickNotePopover;

    quickNoteBackdrop = document.createElement('div');
    quickNoteBackdrop.id = 'chatops-quick-note-backdrop';
    document.body.appendChild(quickNoteBackdrop);

    quickNotePopover = document.createElement('div');
    quickNotePopover.id = 'chatops-quick-note-popover';
    quickNotePopover.innerHTML = `
      <div class="cqn-header">
        <span class="cqn-title">${language.quickTaskTitle}</span>
        <button id="cqn-close" title="${language.memoDelete}">×</button>
      </div>
      <div id="cqn-msg-preview" class="cqn-preview" style="max-height:80px; -webkit-line-clamp:5;"></div>
      <textarea id="cqn-note-text" placeholder="${language.quickTaskNotePlaceholder}"></textarea>
      
      <div id="cqn-note-section" style="padding: 0 13px 8px;">
        <div style="font-size:11px; font-weight:600; color:var(--text-3); text-transform:uppercase; margin-bottom:4px;">Danh mục:</div>
        <select id="cqn-category" style="width:100%; padding:6px; border:1px solid #e0e0e5; border-radius:4px; font-size:12px; font-family:inherit; background:#fff; outline:none; cursor:pointer;">
          <option value="general">📁 Chung</option>
          <option value="work">📁 Công việc</option>
          <option value="personal">📁 Cá nhân</option>
          <option value="ideas">📁 Ý tưởng</option>
        </select>
      </div>

      <div id="cqn-task-section">
        <div style="padding: 0 13px 8px;">
          <div style="font-size:12px; font-weight:600; color:#4a4a4c; margin-bottom:6px; display:flex; align-items:center; gap:4px;">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.7"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
            Nhắc sau:
          </div>
          <div class="cqn-presets" style="flex-wrap:wrap;">
            <button type="button" class="cqn-preset-btn" style="min-width:40px;" data-min="15">+15ph</button>
            <button type="button" class="cqn-preset-btn" style="min-width:40px;" data-min="30">+30ph</button>
            <button type="button" class="cqn-preset-btn" style="min-width:40px;" data-min="60">+1h</button>
            <button type="button" class="cqn-preset-btn" style="min-width:40px;" data-min="120">+2h</button>
            <button type="button" class="cqn-preset-btn" style="min-width:40px;" data-min="240">+4h</button>
            <button type="button" class="cqn-preset-btn" style="min-width:40px;" data-min="360">+6h</button>
            <button type="button" class="cqn-preset-btn" style="min-width:40px;" data-min="480">+8h</button>
          </div>
          <div style="font-size:12px; font-weight:600; color:#4a4a4c; margin:8px 0 6px 0; display:flex; align-items:center; gap:4px;">
            Nhắc lúc:
          </div>
          <div class="cqn-reminder-row" style="background:#fff; border:1px solid #e0e0e5; border-radius:4px; padding:2px 8px;">
            <input type="datetime-local" id="cqn-reminder-time" style="cursor:pointer; background:transparent; border:none; outline:none; box-shadow:none; flex:1;">
          </div>
          <div class="cqn-task-hint" style="margin-top:8px;"></div>
        </div>
      </div>

      <div class="cqn-actions">
        <button id="cqn-save-note" class="cqn-btn cqn-btn-primary">${language.save}</button>
        <button id="cqn-cancel" class="cqn-btn cqn-btn-secondary">${language.cancel}</button>
      </div>
    `;
    document.body.appendChild(quickNotePopover);
    
    const closePopover = () => {
      quickNotePopover.classList.remove('visible');
      quickNoteBackdrop.classList.remove('visible');
    };

    document.getElementById('cqn-close').addEventListener('click', closePopover);
    document.getElementById('cqn-cancel').addEventListener('click', closePopover);
    quickNoteBackdrop.addEventListener('mousedown', closePopover);

    const timeInput = document.getElementById('cqn-reminder-time');
    const presetBtns = document.querySelectorAll('.cqn-preset-btn');
    const reminderRow = quickNotePopover.querySelector('.cqn-reminder-row');

    if (reminderRow && timeInput) {
      reminderRow.addEventListener('click', (e) => {
        if (e.target !== timeInput) {
          try {
            timeInput.showPicker();
          } catch (err) {
            timeInput.focus();
            timeInput.click();
          }
        }
      });
    }
    
    timeInput.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
    });

    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('active')) {
          e.target.classList.remove('active');
          timeInput.value = '';
          return;
        }
        presetBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mins = parseInt(e.target.dataset.min, 10);
        const targetTime = new Date(Date.now() + mins * 60000);
        const tzOffset = targetTime.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(targetTime - tzOffset)).toISOString().slice(0,16);
        timeInput.value = localISOTime;
      });
    });

    return quickNotePopover;
  }

  async function openQuickNote(postEl, anchorBtn, mode = 'task') {
    const popover = getOrCreatePopover();
    popover.dataset.mode = mode;
    const msgBodyEl = postEl.querySelector('.post-message__text, .post__body p, [class*="post-message"]');
    let msgTextFull = msgBodyEl ? msgBodyEl.innerText.trim() : '';
    if (!msgTextFull) {
      const imgEl = postEl.querySelector('img.attachment__image, img.markdown-inline-img, .post-image__column img');
      if (imgEl) {
        msgTextFull = '[Hình ảnh] Vui lòng xem trực tiếp trên ChatOps';
      } else {
        msgTextFull = '(Content not accessible)';
      }
    }
    const postId = postEl.id ? postEl.id.replace(SELECTORS.POST_ID_PREFIX, '') : '';
    document.getElementById('cqn-msg-preview').textContent = msgTextFull.length > 200 ? msgTextFull.slice(0, 200) + '...' : msgTextFull;
    document.getElementById('cqn-note-text').value = '';
    document.getElementById('cqn-reminder-time').value = '';
    document.querySelectorAll('.cqn-preset-btn').forEach(b => b.classList.remove('active'));
    popover.dataset.postId = postId;
    popover.dataset.postText = msgTextFull;
    
    quickNoteBackdrop.classList.add('visible');
    popover.classList.add('visible');

    const taskSection = popover.querySelector('#cqn-task-section');
    const noteSection = popover.querySelector('#cqn-note-section');
    const hintEl = popover.querySelector('.cqn-task-hint');
    
    if (popover.dataset.mode === 'note') {
      if (taskSection) taskSection.style.display = 'none';
      if (noteSection) noteSection.style.display = 'block';
      popover.querySelector('.cqn-title').textContent = language.quickNoteTitle || 'Thêm ghi chú nhanh';
    } else {
      if (taskSection) taskSection.style.display = 'block';
      if (noteSection) noteSection.style.display = 'none';
      popover.querySelector('.cqn-title').textContent = language.quickTaskTitle || 'Tạo việc cần làm';
      if (hintEl) {
        const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
        const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 5 };
        hintEl.textContent = language.quickTaskHint.replace('{minutes}', settings.snoozeMinutes);
      }
    }

    const saveBtn = document.getElementById('cqn-save-note');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => saveTask(popover));
    setTimeout(() => document.getElementById('cqn-note-text').focus(), 50);
  }

  async function saveTask(popover) {
    const { postId, postText, mode } = popover.dataset;
    const noteText = document.getElementById('cqn-note-text').value.trim();
    const reminderTime = document.getElementById('cqn-reminder-time').value;
    const category = document.getElementById('cqn-category').value;
    const id = `${mode === 'note' ? 'memo_' : ALARMS.TASK_PREFIX}${Date.now()}`;
    const teamName = window.location.pathname.split('/')[1] || '';
    
    const item = { 
      id, 
      type: mode === 'note' ? 'memo' : 'task', 
      postId, 
      postText, 
      note: noteText || postText, 
      category: mode === 'note' ? category : 'general',
      createdAt: Date.now(), 
      done: false, 
      reminder: (mode === 'note') ? null : (reminderTime || null), 
      status: 'pending', 
      teamName 
    };

    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 5 };
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MEMO_UPDATED });
    
    if (mode === 'task') {
      const startTime = reminderTime ? new Date(reminderTime).getTime() : Date.now() + settings.snoozeMinutes * 60 * 1000;
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
    }
    
    popover.classList.remove('visible');
    quickNoteBackdrop.classList.remove('visible');
    showToast(mode === 'note' ? (language.quickNoteSaveSuccess || 'Đã lưu ghi chú') : language.quickTaskSaveSuccess);
  }

  let cachedSettings = { spamEnabled: true, showTabs: { search: true, tasks: true, notes: true, missed: true } };

  // Fetch initial settings
  chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (res) => {
    if (res[STORAGE_KEYS.SETTINGS]) {
      cachedSettings = res[STORAGE_KEYS.SETTINGS];
      handleQuickActionButtonsVisibility();
    }
  });

  // Listen to settings changes reactively
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
      cachedSettings = changes[STORAGE_KEYS.SETTINGS].newValue || { spamEnabled: true, showTabs: { search: true, tasks: true, notes: true, missed: true } };
      handleQuickActionButtonsVisibility();
    }
  });

  function handleQuickActionButtonsVisibility() {
    const showTabs = cachedSettings.showTabs || { search: true, tasks: true, notes: true, missed: true };
    const tasksEnabled = showTabs.tasks !== false;
    const notesEnabled = showTabs.notes !== false;
    const spamEnabled = cachedSettings.spamEnabled !== false;

    if (!tasksEnabled) {
      document.querySelectorAll('.chatops-quick-note-btn.task-btn').forEach(el => el.remove());
    }
    if (!notesEnabled) {
      document.querySelectorAll('.chatops-quick-note-btn.note-btn').forEach(el => el.remove());
    }
    if (!spamEnabled) {
      document.querySelectorAll('.chatops-quick-note-btn.spam-btn, .chatops-quick-note-btn.retract-btn').forEach(el => el.remove());
    }
    
    injectQuickNoteButtons();
  }

  function injectQuickNoteButtons() {
    // 1. Find all post elements (in main view or RHS thread)
    const posts = document.querySelectorAll(`.post, [id^="post_"], [class*="post-message"]`);
    
    const showTabs = cachedSettings.showTabs || { search: true, tasks: true, notes: true, missed: true };
    const tasksEnabled = showTabs.tasks !== false;
    const notesEnabled = showTabs.notes !== false;
    const spamEnabled = cachedSettings.spamEnabled !== false;

    posts.forEach(postEl => {
      // Find the action bar within this post
      const actionArea = postEl.querySelector('.post-menu, .post__actions, .dot-menu__container, [class*="post-menu"], .post-action-menu');
      if (!actionArea) return;

      // Inject Task button (🎯) if not present and enabled
      if (tasksEnabled) {
        if (!postEl.querySelector('.chatops-quick-note-btn.task-btn')) {
          const taskBtn = document.createElement('button');
          taskBtn.className = 'chatops-quick-note-btn task-btn';
          taskBtn.innerHTML = '🎯';
          taskBtn.title = language.quickTaskCreate || 'Tạo việc cần làm';
          taskBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            openQuickNote(postEl, taskBtn, 'task');
          });
          actionArea.appendChild(taskBtn);
        }
      } else {
        postEl.querySelector('.chatops-quick-note-btn.task-btn')?.remove();
      }

      // Inject Note button (📝) if not present and enabled
      if (notesEnabled) {
        if (!postEl.querySelector('.chatops-quick-note-btn.note-btn')) {
          const noteBtn = document.createElement('button');
          noteBtn.className = 'chatops-quick-note-btn note-btn';
          noteBtn.innerHTML = '📝';
          noteBtn.title = language.quickNoteCreate || 'Thêm ghi chú nhanh';
          noteBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            openQuickNote(postEl, noteBtn, 'note');
          });
          actionArea.appendChild(noteBtn);
        }
      } else {
        postEl.querySelector('.chatops-quick-note-btn.note-btn')?.remove();
      }

      // Handle Spam and Retract buttons conditionally!
      if (spamEnabled) {
        // Inject Spam button (🔥) if not present
        if (!postEl.querySelector('.chatops-quick-note-btn.spam-btn')) {
          const spamBtn = document.createElement('button');
          spamBtn.className = 'chatops-quick-note-btn spam-btn';
          spamBtn.innerHTML = '🔥';
          spamBtn.title = 'Spam biểu cảm (Reactions)';
          spamBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const postId = postEl.id ? postEl.id.replace(SELECTORS.POST_ID_PREFIX, '') : '';
            if (!postId) return;

            const origHtml = spamBtn.innerHTML;
            spamBtn.innerHTML = '⏳';
            spamBtn.style.opacity = '0.5';
            spamBtn.disabled = true;

            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.SPAM_POST_REACTIONS,
              postId
            }, (res) => {
              spamBtn.innerHTML = origHtml;
              spamBtn.style.opacity = '1';
              spamBtn.disabled = false;

              if (res && res.ok) {
                showToast('Đã spam thả cảm xúc thành công! 🔥');
              } else {
                showToast('Lỗi spam biểu cảm: ' + (res?.error || 'Không rõ'));
              }
            });
          });
          actionArea.appendChild(spamBtn);
        }

        // Inject Retract button (↩️) if not present
        if (!postEl.querySelector('.chatops-quick-note-btn.retract-btn')) {
          const retractBtn = document.createElement('button');
          retractBtn.className = 'chatops-quick-note-btn retract-btn';
          retractBtn.innerHTML = '↩️';
          retractBtn.title = 'Thu hồi spam biểu cảm (Undo)';
          retractBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const postId = postEl.id ? postEl.id.replace(SELECTORS.POST_ID_PREFIX, '') : '';
            if (!postId) return;

            const origHtml = retractBtn.innerHTML;
            retractBtn.innerHTML = '⏳';
            retractBtn.style.opacity = '0.5';
            retractBtn.disabled = true;

            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.RETRACT_POST_REACTIONS,
              postId
            }, (res) => {
              retractBtn.innerHTML = origHtml;
              retractBtn.style.opacity = '1';
              retractBtn.disabled = false;

              if (res && res.ok) {
                showToast('Đã thu hồi spam biểu cảm! ↩️');
              } else {
                showToast('Lỗi thu hồi biểu cảm: ' + (res?.error || 'Không rõ'));
              }
            });
          });
          actionArea.appendChild(retractBtn);
        }
      } else {
        // If not enabled, clean up any existing spam and retract buttons from this post
        postEl.querySelectorAll('.chatops-quick-note-btn.spam-btn, .chatops-quick-note-btn.retract-btn').forEach(el => el.remove());
      }
    });
  }

  const observer = new MutationObserver(() => { injectMemeButton(); injectQuickNoteButtons(); });
  observer.observe(document.body, { childList: true, subtree: true });
  injectMemeButton();
  injectQuickNoteButtons();
})();
