/**
 * Content Script for ChatOps domain
 */

import { MESSAGE_TYPES, UI_CONFIG, SELECTORS, STORAGE_KEYS, ALARMS, DEFAULT_MEMES } from '../src/constants.js';
import { language, loadLanguage } from '../src/lang.js';
import { formatRichText } from '../src/utils/formatter.js';

// Global UI elements shared between the message listeners and page DOM
let quickNotePopover = null;
let quickNoteBackdrop = null;
let imagePickerEl = null;
let observer = null;
let globalInsertImageToChat = null;
let activeChatTextarea = null;
let updateImagePickerTranslations = null;
let updateResizeModalTranslations = null;

function runWithObserverDisabled(fn) {
  if (observer) {
    observer.disconnect();
  }
  try {
    fn();
  } finally {
    if (observer) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
}
function initCommonFlatpickr(el, options = {}) {
  if (typeof flatpickr !== 'function') {
    console.warn('[ChatOps Ext] Flatpickr is not available globally.');
    return null;
  }
  return flatpickr(el, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    minuteIncrement: 5,
    disableMobile: true,
    ...options
  });
}

// --- Listen for reminder notifications from the background script ---
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === MESSAGE_TYPES.SHOW_REMINDER) {
    showReminderBanner(message.message, message.taskId, message.isTask, message.postId, message.teamName);
  } else if (message.type === 'APP_LANG_CHANGED') {
    await loadLanguage();
    const btn = document.getElementById('chatops-ext-floating-btn');
    if (btn) {
      btn.title = language.floatingBtnTitle;
      const closeBtn = document.getElementById('chatops-ext-close-btn');
      if (closeBtn) closeBtn.title = language.floatingBtnHide;
    }
    // Clear cached popover elements so they are rebuilt in the new language
    if (quickNotePopover) {
      quickNotePopover.remove();
      quickNotePopover = null;
    }
    if (quickNoteBackdrop) {
      quickNoteBackdrop.remove();
      quickNoteBackdrop = null;
    }
    if (updateImagePickerTranslations) updateImagePickerTranslations();
    if (updateResizeModalTranslations) updateResizeModalTranslations();
  } else if (message.type === 'INSERT_IMAGE_TO_CHAT') {
    if (typeof globalInsertImageToChat === 'function') {
      globalInsertImageToChat(message.url);
    }
  } else if (message.action === 'open_post_thread') {
    handleOpenPostThread(message.postId, message.rootId);
  }
});

async function handleOpenPostThread(postId, rootId) {
  if (!postId) return;
  console.log(`[ChatOps Ext] Request to open thread for postId: ${postId}, rootId: ${rootId}`);
  
  let attempts = 0;
  const maxAttempts = 30; // 15 seconds max polling
  
  const interval = setInterval(() => {
    attempts++;
    // Look for post in the DOM
    const postEl = document.getElementById(`post_${postId}`) || 
                   document.getElementById(`rhsPost_${postId}`) || 
                   document.getElementById(`rhs_post_${postId}`) ||
                   document.querySelector(`[id$="_${postId}"]`) || // generic match
                   (rootId ? (document.getElementById(`post_${rootId}`) || document.getElementById(`rhsPost_${rootId}`)) : null);
                   
    if (postEl) {
      clearInterval(interval);
      console.log(`[ChatOps Ext] Found target post element:`, postEl);
      
      // Let's find the reply button in this post element
      // Mattermost reply buttons usually have class `.comment-icon__container`, `[aria-label*="reply" i]`, or `[aria-label*="phản hồi" i]`
      const replyBtn = postEl.querySelector(
        'button[aria-label*="reply" i], button[aria-label*="comment" i], button[aria-label*="phản hồi" i], .comment-icon__container, button[class*="reply" i], button[class*="comment" i], [class*="comment-icon" i]'
      );
      
      if (replyBtn) {
        console.log(`[ChatOps Ext] Clicking reply button:`, replyBtn);
        replyBtn.click();
      } else {
        // Fallback: If no reply button is found inside the post element, let's search in the hover menus or search the post's action menu
        const postActions = postEl.querySelector('.post-menu, .post__actions, .dot-menu__container, [class*="post-menu"], .post-action-menu');
        if (postActions) {
          const actionReplyBtn = postActions.querySelector('button[aria-label*="reply" i], button[aria-label*="comment" i], button[aria-label*="phản hồi" i]');
          if (actionReplyBtn) {
            console.log(`[ChatOps Ext] Clicking reply button in post menu:`, actionReplyBtn);
            actionReplyBtn.click();
            return;
          }
        }
        console.warn(`[ChatOps Ext] Reply button not found on post.`);
      }
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.warn(`[ChatOps Ext] Target post ${postId} not found in DOM after 15s.`);
    }
  }, 500);
}

async function injectDynamicTheme() {
  // Inject Google Font Inter so the webpage popover modal has access to the exact same premium font as the sidepanel
  let fontLink = document.getElementById('chatops-google-font');
  if (!fontLink) {
    fontLink = document.createElement('link');
    fontLink.id = 'chatops-google-font';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
  }

  const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  const settings = res[STORAGE_KEYS.SETTINGS] || {};
  
  const accentColor = (settings.accentColor && settings.accentColor !== 'undefined') ? settings.accentColor : '#1c58d9';
  const accentTextColor = (settings.accentTextColor && settings.accentTextColor !== 'undefined') ? settings.accentTextColor : '#ffffff';
  
  let styleEl = document.getElementById('chatops-dynamic-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'chatops-dynamic-theme';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    :root {
      --chatops-accent: ${accentColor};
      --chatops-header: ${accentColor};
    }
    .chatops-reminder-banner { border-top-color: var(--chatops-accent) !important; }
    .crb-title { color: var(--chatops-accent) !important; }
    .crb-progress { background: var(--chatops-accent) !important; }
    .chatops-btn-primary { background: var(--chatops-accent) !important; color: ${accentTextColor} !important; }
    .cqn-mode-btn.active { color: var(--chatops-accent) !important; border-color: var(--chatops-accent) !important; background: rgba(0,0,0,0.05) !important; }
    .cqn-preview { border-left-color: var(--chatops-accent) !important; }
    .chatops-toast { background: var(--chatops-accent) !important; color: ${accentTextColor} !important; border-left: none !important; }
  `;
}

/**
 * Handles side panel opening, switching to tasks tab, and redirecting to the thread
 */
async function handleNotificationJump(postId, taskTeamName) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.SIDEPANEL_TAB]: 'tasks' });
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDE_PANEL }).catch(() => {});
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tab: 'tasks' }).catch(() => {});
    }, 150);
  } catch (err) {
    console.warn('[ChatOps Ext] Failed to trigger side panel tasks tab:', err);
  }

  if (postId) {
    const teamName = taskTeamName || window.location.pathname.split('/')[1] || CHATOPS_CONFIG.DEFAULT_TEAM;
    window.location.href = `/${teamName}/pl/${postId}`;
  }
}

/**
 * Plays a premium dual-tone sound alert using Web Audio API
 */
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // First Beep: Tone D5 (587.33 Hz)
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);

    // Second Beep: Tone A5 (880.00 Hz) after 150ms delay
    setTimeout(() => {
      try {
        const audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();
        const osc2 = audioCtx2.createOscillator();
        const gain2 = audioCtx2.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx2.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, audioCtx2.currentTime);
        gain2.gain.setValueAtTime(0.15, audioCtx2.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx2.currentTime + 0.25);
        osc2.start(audioCtx2.currentTime);
        osc2.stop(audioCtx2.currentTime + 0.25);
      } catch (e2) {}
    }, 150);
  } catch (err) {
    console.warn('[ChatOps Ext] Sound synthesis failed:', err);
  }
}

/**
 * Displays a reminder banner at the top of the page
 */
async function showReminderBanner(text, taskId, isTask = false, postId = null, taskTeamName = null) {
  await injectDynamicTheme();

  // Play notification sound if enabled
  try {
    const resSettings = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
    const settings = resSettings[STORAGE_KEYS.SETTINGS] || {};
    if (settings.soundNotification) {
      playNotificationSound();
    }
  } catch (err) {
    console.warn('[ChatOps Ext] Failed to read sound settings:', err);
  }

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
          ${isLongText ? `<button class="crb-collapse-btn collapse-btn" style="margin-left:8px;" title="${language.expandCollapseBtn || 'Expand/Collapse'}"></button>` : ''}
        </div>
        <div class="crb-text ${isLongText ? 'collapsed' : ''}">${formatRichText(text)}</div>
      </div>
      <button class="crb-close" title="${language.memoDelete}">×</button>
    </div>
    ${isTask ? `
      <div class="crb-task-actions" style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; gap: 6px; width: 100%;">
          <button class="crb-done-btn" data-task-id="${taskId}" style="flex: 1; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;">${language.reminderDoneBtn}</button>
        </div>
        ${postId ? `<button class="crb-jump-btn" data-post-id="${postId}" style="width: 100%; margin-top: 0; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;">${language.viewMessage}</button>` : ''}
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

  const innerEl = banner.querySelector('.crb-inner');
  if (innerEl) {
    innerEl.addEventListener('click', async (e) => {
      if (e.target.closest('.crb-close') || e.target.closest('.crb-collapse-btn')) {
        return;
      }
      if (closeTimer) clearTimeout(closeTimer);
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
      await handleNotificationJump(postId, taskTeamName);
    });
  }

  if (isLongText) {
    const collBtn = banner.querySelector('.crb-collapse-btn');
    const textEl = banner.querySelector('.crb-text');
    if (collBtn && textEl) {
      setTimeout(() => {
        const isOverflowing = textEl.scrollHeight > textEl.clientHeight + 1;
        if (!isOverflowing) {
          collBtn.style.display = 'none';
          textEl.classList.remove('collapsed');
        }
      }, 20);

      collBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = textEl.classList.toggle('collapsed');
        collBtn.classList.toggle('expanded', !isCollapsed);
        if (isCollapsed) {
          // Reschedule a short auto-close timer (3 seconds) when collapsed back
          if (closeTimer) clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            banner.classList.remove('visible');
            setTimeout(() => banner.remove(), 400);
          }, 3000);
        } else {
          // Reset the close timer to a generous 15 seconds when expanded so it eventually closes
          if (closeTimer) clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            banner.classList.remove('visible');
            setTimeout(() => banner.remove(), 400);
          }, 15000);
          
          if (progressEl) {
            progressEl.style.animationPlayState = 'paused';
            progressEl.style.opacity = '0';
          }
        }
      });
    }
  }

  if (isTask && taskId) {
    banner.querySelector('.crb-done-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (closeTimer) clearTimeout(closeTimer);
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MARK_TASK_DONE, taskId });
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
    });



    const jumpBtn = banner.querySelector('.crb-jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (closeTimer) clearTimeout(closeTimer);
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 400);
        await handleNotificationJump(postId, taskTeamName);
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

(async function () {
  // Inject bridge script to access React Fiber elements in page context
  function injectMainWorldScript() {
    const id = 'chatops-main-world-bridge';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = chrome.runtime.getURL('content/inject.js');
    (document.head || document.documentElement).appendChild(script);
  }
  injectMainWorldScript();

  await loadLanguage();
  injectDynamicTheme();

  let isFloatingBtnClosed = false;

  // Clean up any legacy extension elements left over from previous script runs to avoid duplicates
  const oldBtn = document.getElementById('chatops-ext-floating-btn');
  if (oldBtn) oldBtn.remove();
  const oldBadge = document.getElementById('chatops-ext-floating-badge');
  if (oldBadge) oldBadge.remove();
  document.querySelectorAll('.chatops-ext-image-picker-btn, .chatops-image-picker, .chatops-action-group').forEach(el => el.remove());

  const btn = document.createElement('div');
  btn.id = 'chatops-ext-floating-btn';
  btn.title = language.floatingBtnTitle;
  btn.style.cursor = 'pointer';

  const BUBBLE_SVG = `
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:38px; height:38px; display:block;">
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

  // Red badge for pending tasks count
  const badgeEl = document.createElement('div');
  badgeEl.id = 'chatops-ext-floating-badge';
  badgeEl.className = 'chatops-floating-badge hidden';
  btn.appendChild(badgeEl);

  closeIconBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isFloatingBtnClosed = true;
    btn.remove();
  });
  closeIconBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  closeIconBtn.addEventListener('mouseup', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Function to align the floating button under the last team icon
  function alignButtonToSidebar() {
    if (isFloatingBtnClosed) return;
    // Find Mattermost team sidebar scroller or wrapper first, falling back to outer team sidebar
    let teamSidebar = document.querySelector(
      '.team-sidebar .team-wrapper, [class*="team-sidebar-items"], [class*="team-sidebar__scroller"], .team-wrapper, .team-sidebar, #teamSidebar, [class*="team-sidebar"]'
    );
    if (teamSidebar) {
      // Ensure the team sidebar is actually on the left side of the screen (to avoid matching elements inside posts/chatbox)
      const rect = teamSidebar.getBoundingClientRect();
      if (rect.left > 200) {
        teamSidebar = null; // Ignore if not on the left
      }
    }
    if (teamSidebar) {
      const teamItems = teamSidebar.querySelectorAll('a, .team-btn, [class*="team-container"], [class*="team-btn"]');
      if (teamItems && teamItems.length > 0) {
        const lastTeam = teamItems[teamItems.length - 1];
        if (btn.parentNode !== lastTeam.parentNode) {
          lastTeam.parentNode.insertBefore(btn, lastTeam.nextSibling);
        }
      } else {
        if (btn.parentNode !== teamSidebar) {
          teamSidebar.appendChild(btn);
        }
      }
      btn.classList.add('in-sidebar');
      btn.style.left = '';
      btn.style.top = '';
      btn.style.bottom = '';
      btn.style.right = '';
      btn.style.transform = '';
    } else {
      if (btn.parentNode !== document.body) {
        document.body.appendChild(btn);
      }
      btn.classList.remove('in-sidebar');
      btn.style.left = '';
      btn.style.top = '';
      btn.style.bottom = '160px';
      btn.style.right = '20px';
      btn.style.transform = '';
    }
  }

  async function updateFloatingBadgeCount() {
    if (!chrome.runtime?.id) return;
    try {
      const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
      const allItems = res[STORAGE_KEYS.MEMOS] || [];
      const pendingTasks = allItems.filter(m => m.type === 'task' && !m.done);
      const count = pendingTasks.length;

      const badge = document.getElementById('chatops-ext-floating-badge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count;
          badge.classList.remove('hidden');
        } else {
          badge.textContent = '';
          badge.classList.add('hidden');
        }
      }
    } catch (err) {
      if (err.message && err.message.includes('Extension context invalidated')) {
        return;
      }
      console.error('[ChatOps Ext] Failed to update badge count:', err);
    }
  }

  alignButtonToSidebar();
  updateFloatingBadgeCount();
  // Recalculate once DOM/React page has fully loaded
  window.addEventListener('load', () => {
    alignButtonToSidebar();
    updateFloatingBadgeCount();
  });
  setTimeout(() => {
    alignButtonToSidebar();
    updateFloatingBadgeCount();
  }, 1500); // 1.5s robust fallback

  // Periodically align button to vertical sidebar to survive Mattermost React updates/re-renders
  setInterval(alignButtonToSidebar, 2000);

  const handleFloatingBtnClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TOGGLE_SIDE_PANEL });
    } catch (err) {
      if (err.message && err.message.includes('Extension context invalidated')) {
        alert(language.extensionUpdated);
      }
    }
  };

  btn.addEventListener('click', handleFloatingBtnClick);
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  btn.addEventListener('mouseup', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  console.log('[ChatOps Ext] Floating button injected.');

  // --- Image Integration into Main & RHS Chat UI ---
  function injectImageButton() {
    const floatingButtons = cachedSettings.floatingButtons || { quickNote: true, quickTask: true, spamReactions: true, imagePicker: true, quickReply: false, quickCopy: false };
    const memeEnabled = (cachedSettings.memeEnabled !== false) && (floatingButtons.imagePicker !== false);
    
    const targets = [
      { id: 'emojiPickerButton', textboxId: 'post_textbox', btnId: 'chatops-ext-image-btn' },
      { id: 'rhsEmojiPickerButton', textboxId: 'reply_textbox', btnId: 'chatops-ext-image-btn-rhs' }
    ];

    targets.forEach(target => {
      // Prioritize scoped search inside the specific textbox container to avoid duplicate ID issues
      const textbox = document.getElementById(target.textboxId) || 
        (target.textboxId === 'reply_textbox' 
          ? document.querySelector('#reply_textbox, .sidebar-right textarea, .rhs-thread textarea, .sidebar--right textarea, [placeholder*="reply" i]')
          : document.querySelector('#post_textbox, .post-create-body textarea, [placeholder*="write" i]'));

      let emojiBtn = null;
      if (textbox) {
        const container = textbox.closest('.post-create-body, .input-container, .post-body__cell, .post-create, form, [class*="post-create"]');
        if (container) {
          // Find the emoji button belonging exclusively to this chatbox container
          emojiBtn = container.querySelector('#emojiPickerButton, #rhsEmojiPickerButton, button[aria-label*="emoji" i], button[aria-label*="Emoji"], button[class*="emoji" i], .emoji-picker__container button, button[id*="Emoji"]');
        }
      }

      // Fallback to global ID if scoped lookup is not found
      if (!emojiBtn) {
        emojiBtn = document.getElementById(target.id);
      }

      if (!emojiBtn) {
        return;
      }

      const parent = emojiBtn.parentNode;
      if (!parent) return;

      const existingBtn = parent.querySelector('.chatops-ext-image-picker-btn');

      if (!memeEnabled) {
        if (existingBtn) existingBtn.remove();
        delete emojiBtn.dataset.chatopsImageInjected;
        return;
      }

      if (existingBtn) {
        emojiBtn.dataset.chatopsImageInjected = 'true';
        if (!existingBtn.id) {
          existingBtn.id = target.btnId;
        }
        return;
      }

      const imageBtn = document.createElement('button');
      imageBtn.id = target.btnId;
      imageBtn.type = 'button';
      imageBtn.className = 'chatops-ext-image-picker-btn';
      imageBtn.innerHTML = '🖼️';
      imageBtn.title = 'Quick Image Picker';
      imageBtn.dataset.targetTextbox = target.textboxId;
      parent.insertBefore(imageBtn, emojiBtn.nextSibling);

      emojiBtn.dataset.chatopsImageInjected = 'true';

      imageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleImagePickerUI(imageBtn, target.textboxId);
      });
    });
  }

  imagePickerEl = null;

  function getBase64Size(dataURL) {
    if (!dataURL) return 0;
    const base64Part = dataURL.split(',')[1];
    if (!base64Part) return dataURL.length;
    const padding = base64Part.endsWith('==') ? 2 : (base64Part.endsWith('=') ? 1 : 0);
    return (base64Part.length * 3 / 4) - padding;
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  updateImagePickerTranslations = function() {
    if (!imagePickerEl) return;
    
    // Header title
    const headerTitleEl = imagePickerEl.querySelector('.chatops-image-picker-header span');
    if (headerTitleEl) headerTitleEl.textContent = language.imageLibrary || 'My Library';
    
    // Sub tabs
    const tabLibraryEl = imagePickerEl.querySelector('.chatops-picker-sub-tab[data-tab="library"]');
    if (tabLibraryEl) tabLibraryEl.textContent = language.imageLibraryTab || 'My Library';
    
    const tabGifsEl = imagePickerEl.querySelector('.chatops-picker-sub-tab[data-tab="gifs"]');
    if (tabGifsEl) tabGifsEl.textContent = language.gifLibraryTab || 'GIFs';
    
    // Your images header
    const yourImagesHeaderEl = imagePickerEl.querySelector('#chatops-your-images-header');
    if (yourImagesHeaderEl) yourImagesHeaderEl.textContent = language.yourImages || 'YOUR IMAGES';
    
    // Upload image button
    const uploadLabelEl = imagePickerEl.querySelector('.chatops-image-upload-btn');
    if (uploadLabelEl) {
      uploadLabelEl.textContent = language.uploadImageBtn || '+ Upload Image';
    }
    
    // No images hint
    const emptyHintEl = imagePickerEl.querySelector('.chatops-image-empty');
    if (emptyHintEl) emptyHintEl.textContent = language.noImagesHint || 'No images found';
    
    // GIF search input placeholder
    const gifSearchInput = imagePickerEl.querySelector('#chatops-picker-gif-search');
    if (gifSearchInput) gifSearchInput.placeholder = language.searchGifPlaceholder || 'Search GIFs...';
    
    // GIF hint notice
    const gifHintNoticeEl = imagePickerEl.querySelector('.chatops-gif-hint-notice [data-i18n="gifDefaultHint"]');
    if (gifHintNoticeEl) gifHintNoticeEl.textContent = language.gifDefaultHint || '';
    
    // Refresh images grid to update tooltips/titles in the new language
    loadCustomImages();
    
    // Refresh Giphy panel to display translated API status if any
    const apiStatusNotice = imagePickerEl.querySelector('#chatops-picker-gifs-grid');
    if (apiStatusNotice && gifSearchInput) {
      loadPickerGifs(gifSearchInput.value);
    }
  };

  updateResizeModalTranslations = function() {
    const overlay = document.getElementById('chatops-image-resize-overlay');
    if (!overlay) return;
    
    const titleEl = overlay.querySelector('.chatops-image-resize-title');
    if (titleEl) titleEl.textContent = language.resizeImageTitle || 'Resize Image';
    
    const scaleLabelEl = overlay.querySelector('.chatops-image-resize-slider-label span');
    if (scaleLabelEl) scaleLabelEl.textContent = language.resizeScaleLabel || 'Scale';
    
    const cancelBtn = overlay.querySelector('.chatops-image-resize-btn-cancel');
    if (cancelBtn) cancelBtn.textContent = language.cancel;
    
    const saveBtn = overlay.querySelector('.chatops-image-resize-btn-save');
    if (saveBtn) saveBtn.textContent = language.saveCopy || 'Save';
    
    const insertBtn = overlay.querySelector('.chatops-image-resize-btn-insert');
    if (insertBtn) insertBtn.textContent = language.insertToChat || 'Insert to Chat';
  };

  async function loadCustomImages() {
    const res = await chrome.storage.local.get(['custom_memes']);
    let customMemes = res.custom_memes;
    if (customMemes === undefined) {
      customMemes = DEFAULT_MEMES;
      await chrome.storage.local.set({ custom_memes: customMemes });
    }
    const container = document.getElementById('chatops-custom-images-grid');
    if (!container) return;

    // Calculate total size
    let totalBytes = 0;
    customMemes.forEach(url => {
      totalBytes += getBase64Size(url);
    });
    const formattedSize = formatSize(totalBytes);

    // Update dynamic header size subtitle
    const sizeEl = document.getElementById('chatops-your-images-size');
    if (sizeEl) {
      sizeEl.textContent = `(${formattedSize} / 10 MB)`;
    }

    if (customMemes.length === 0) {
      container.innerHTML = `<span style="font-size:11.5px; color:#999; text-align:center; width:100%; display:block; padding: 24px 0; grid-column: 1 / -1;">${language.noCustomImages}</span>`;
      return;
    }

    let col1Html = '';
    let col2Html = '';
    
    customMemes.forEach((url, idx) => {
      const cellHtml = `
        <div class="chatops-custom-image-cell">
          <img src="${url}" class="chatops-custom-image-item" loading="lazy" title="${language.clickToSend}" />
          <button class="chatops-custom-image-preview" data-idx="${idx}" title="${language.previewImage || 'Preview full image'}">&#x1F50D;</button>
          <button class="chatops-custom-image-resize" data-idx="${idx}" title="${language.resizeImage || 'Resize image'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; display:block;"><path d="M4 14h6v6"></path><path d="M20 10h-6V4"></path><path d="M14 10l7-7"></path><path d="M10 14l-7 7"></path></svg>
          </button>
          <button class="chatops-custom-image-delete" data-idx="${idx}" title="${language.deleteImage}">&times;</button>
        </div>
      `;
      if (idx % 2 === 0) {
        col1Html += cellHtml;
      } else {
        col2Html += cellHtml;
      }
    });

    container.innerHTML = `
      <div class="chatops-custom-images-column" style="display: flex; flex-direction: column; gap: 16px; flex: 1; min-width: 0;">${col1Html}</div>
      <div class="chatops-custom-images-column" style="display: flex; flex-direction: column; gap: 16px; flex: 1; min-width: 0;">${col2Html}</div>
    `;
  }

  // ─── Image Preview (hover/click) ───
  function openImagePreview(src) {
    let overlay = document.getElementById('chatops-image-preview-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'chatops-image-preview-overlay';
      overlay.className = 'chatops-image-preview-overlay';
      overlay.innerHTML = `
        <button id="chatops-image-preview-close" class="chatops-image-preview-close-btn">&times;</button>
        <div class="chatops-image-preview-wrapper" style="position: relative; display: inline-block;">
          <img id="chatops-image-preview-img" src="" alt="preview" />
        </div>
      `;
      overlay.addEventListener('click', (e) => {
        if (e.target.id === 'chatops-image-preview-img') {
          e.stopPropagation();
          return;
        }
        overlay.classList.add('hidden');
      });
      document.body.appendChild(overlay);
    }
    overlay.querySelector('#chatops-image-preview-img').src = src;
    overlay.classList.remove('hidden');
  }

  function openImageResizeModal(srcList, isLibraryEditIndex) {
    let overlay = document.getElementById('chatops-image-resize-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'chatops-image-resize-overlay';
      overlay.className = 'chatops-image-resize-overlay';
      overlay.innerHTML = `
        <div class="chatops-image-resize-container">
          <div class="chatops-image-resize-header">
            <h3 class="chatops-image-resize-title">${language.resizeImageTitle || 'Resize Image'}</h3>
            <button class="chatops-image-resize-close">&times;</button>
          </div>
          <div class="chatops-image-resize-body">
            <div class="chatops-image-resize-preview-box">
              <img class="chatops-image-resize-preview-img" src="" alt="preview" />
            </div>
            
            <!-- Slide Navigation -->
            <div class="chatops-image-resize-navigator">
              <button type="button" class="chatops-image-resize-nav-btn prev-btn">&lt;</button>
              <div class="chatops-image-resize-nav-dots"></div>
              <button type="button" class="chatops-image-resize-nav-btn next-btn">&gt;</button>
            </div>

            <div class="chatops-image-resize-controls">
              <div class="chatops-image-resize-info-row">
                <span class="chatops-image-resize-orig-size">Original: --</span>
                <span class="chatops-image-resize-new-size">Estimated: --</span>
              </div>
              <div class="chatops-image-resize-slider-group">
                <div class="chatops-image-resize-slider-label">
                  <span>${language.resizeScaleLabel || 'Scale'}</span>
                  <span class="chatops-image-resize-slider-val">100%</span>
                </div>
                <input type="range" class="chatops-image-resize-slider" min="10" max="100" step="5" value="100" />
              </div>
              <div class="chatops-image-resize-inputs-group">
                <div class="chatops-image-resize-input-wrapper">
                  <span>Width (px)</span>
                  <input type="number" class="chatops-image-resize-input chatops-image-resize-width" min="10" />
                </div>
                <button class="chatops-image-resize-lock-btn locked" title="Lock Aspect Ratio">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; display:block;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </button>
                <div class="chatops-image-resize-input-wrapper">
                  <span>Height (px)</span>
                  <input type="number" class="chatops-image-resize-input chatops-image-resize-height" min="10" />
                </div>
              </div>
            </div>
          </div>
          <div class="chatops-image-resize-footer">
            <button class="chatops-image-resize-btn chatops-image-resize-btn-cancel">${language.cancel}</button>
            <button class="chatops-image-resize-btn chatops-image-resize-btn-insert">${language.submitSaveBtn || 'Gửi & Lưu'}</button>
            <button class="chatops-image-resize-btn chatops-image-resize-btn-save">${language.saveCopy || 'Save Copy'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      // Hook closing event listeners
      overlay.querySelector('.chatops-image-resize-close').onclick = () => overlay.classList.remove('visible');
      overlay.querySelector('.chatops-image-resize-btn-cancel').onclick = () => overlay.classList.remove('visible');
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('visible');
      });
    }

    const previewImg = overlay.querySelector('.chatops-image-resize-preview-img');
    const origSizeEl = overlay.querySelector('.chatops-image-resize-orig-size');
    const newSizeEl = overlay.querySelector('.chatops-image-resize-new-size');
    const slider = overlay.querySelector('.chatops-image-resize-slider');
    const sliderVal = overlay.querySelector('.chatops-image-resize-slider-val');
    const widthInput = overlay.querySelector('.chatops-image-resize-width');
    const heightInput = overlay.querySelector('.chatops-image-resize-height');
    const lockBtn = overlay.querySelector('.chatops-image-resize-lock-btn');
    const saveBtn = overlay.querySelector('.chatops-image-resize-btn-save');
    const insertBtn = overlay.querySelector('.chatops-image-resize-btn-insert');
    
    const navigatorRow = overlay.querySelector('.chatops-image-resize-navigator');
    const prevBtn = overlay.querySelector('.prev-btn');
    const nextBtn = overlay.querySelector('.next-btn');
    const dotsContainer = overlay.querySelector('.chatops-image-resize-nav-dots');

    const sources = Array.isArray(srcList) ? srcList : [srcList];
    let imagesArray = sources.map(src => ({
      src: src,
      width: 0,
      height: 0,
      origWidth: 0,
      origHeight: 0,
      aspect: 1,
      sliderValue: 100,
      isAspectRatioLocked: true,
      testDataUrl: src,
      mimeType: src.split(';')[0].split(':')[1] || 'image/png'
    }));

    let currentIndex = 0;
    
    // Load and setup the active image state
    function loadActiveImage() {
      const activeImgObj = imagesArray[currentIndex];
      if (!activeImgObj) return;

      const img = new Image();
      img.onload = () => {
        // If dimensions are not initialized yet, initialize them
        if (activeImgObj.origWidth === 0) {
          activeImgObj.origWidth = img.width;
          activeImgObj.origHeight = img.height;
          activeImgObj.aspect = img.width / img.height;
          activeImgObj.width = img.width;
          activeImgObj.height = img.height;
        }

        origSizeEl.textContent = `Original: ${activeImgObj.origWidth}x${activeImgObj.origHeight} (${formatSize(getBase64Size(activeImgObj.src))})`;
        slider.value = activeImgObj.sliderValue;
        sliderVal.textContent = `${activeImgObj.sliderValue}%`;
        widthInput.value = activeImgObj.width;
        heightInput.value = activeImgObj.height;
        
        lockBtn.className = `chatops-image-resize-lock-btn ${activeImgObj.isAspectRatioLocked ? 'locked' : ''}`;
        
        // Handle lock toggle
        lockBtn.onclick = () => {
          activeImgObj.isAspectRatioLocked = !activeImgObj.isAspectRatioLocked;
          lockBtn.classList.toggle('locked', activeImgObj.isAspectRatioLocked);
        };

        function updateCalculatedSize() {
          const w = parseInt(widthInput.value, 10) || 10;
          const h = parseInt(heightInput.value, 10) || 10;
          
          activeImgObj.width = w;
          activeImgObj.height = h;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          if (activeImgObj.mimeType !== 'image/png') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(img, 0, 0, w, h);
          
          const testDataUrl = canvas.toDataURL(activeImgObj.mimeType, 0.9);
          activeImgObj.testDataUrl = testDataUrl;
          
          const newBytes = getBase64Size(testDataUrl);
          newSizeEl.textContent = `Estimated: ${w}x${h} (${formatSize(newBytes)})`;
          
          previewImg.src = testDataUrl;
          previewImg.style.width = w + 'px';
          previewImg.style.height = h + 'px';
        }

        slider.oninput = () => {
          const pct = parseInt(slider.value, 10) / 100;
          activeImgObj.sliderValue = parseInt(slider.value, 10);
          sliderVal.textContent = `${slider.value}%`;
          widthInput.value = Math.round(activeImgObj.origWidth * pct);
          heightInput.value = Math.round(activeImgObj.origHeight * pct);
          updateCalculatedSize();
        };

        widthInput.oninput = () => {
          const w = parseInt(widthInput.value, 10) || 10;
          if (activeImgObj.isAspectRatioLocked) {
            heightInput.value = Math.round(w / activeImgObj.aspect);
          }
          const pct = Math.round((w / activeImgObj.origWidth) * 100);
          slider.value = Math.min(100, Math.max(10, pct));
          activeImgObj.sliderValue = parseInt(slider.value, 10);
          sliderVal.textContent = `${slider.value}%`;
          updateCalculatedSize();
        };

        heightInput.oninput = () => {
          const h = parseInt(heightInput.value, 10) || 10;
          if (activeImgObj.isAspectRatioLocked) {
            widthInput.value = Math.round(h * activeImgObj.aspect);
          }
          const pct = Math.round((h / activeImgObj.origHeight) * 100);
          slider.value = Math.min(100, Math.max(10, pct));
          activeImgObj.sliderValue = parseInt(slider.value, 10);
          sliderVal.textContent = `${slider.value}%`;
          updateCalculatedSize();
        };

        // Initialize display
        updateCalculatedSize();
      };
      
      previewImg.src = activeImgObj.src;
      img.src = activeImgObj.src;
      
      renderSlideNavigator();
    }

    function renderSlideNavigator() {
      if (imagesArray.length <= 1) {
        navigatorRow.style.setProperty('display', 'none', 'important');
        return;
      }
      navigatorRow.style.removeProperty('display');
      
      // Update prev/next button disabled states
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === imagesArray.length - 1;
      
      // Render navigation dots
      dotsContainer.innerHTML = imagesArray.map((_, i) => {
        const isActive = i === currentIndex;
        return `
          <span class="chatops-image-resize-nav-dot ${isActive ? 'active' : ''}" data-index="${i}"></span>
        `;
      }).join('');
    }

    // Set up navigation clicks
    prevBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (currentIndex > 0) {
        currentIndex--;
        loadActiveImage();
      }
    };

    nextBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (currentIndex < imagesArray.length - 1) {
        currentIndex++;
        loadActiveImage();
      }
    };

    dotsContainer.onclick = (e) => {
      const dot = e.target.closest('.chatops-image-resize-nav-dot');
      if (dot) {
        const idx = parseInt(dot.dataset.index, 10);
        if (!isNaN(idx) && idx !== currentIndex) {
          currentIndex = idx;
          loadActiveImage();
        }
      }
    };

    // "Gửi & Lưu" (Submit & Save) handler - Processes active image only, slides to next or closes when done
    insertBtn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const activeImgObj = imagesArray[currentIndex];
      if (!activeImgObj) return;

      // 1. Submit to Chat
      insertImageToChat(activeImgObj.testDataUrl);

      // 2. Save to Image Library
      const res = await chrome.storage.local.get(['custom_memes']);
      const customMemes = res.custom_memes || [];
      
      let totalBytes = 0;
      customMemes.forEach((url, i) => {
        if (isLibraryEditIndex !== i) {
          totalBytes += getBase64Size(url);
        }
      });
      const newBytes = getBase64Size(activeImgObj.testDataUrl);

      if (totalBytes + newBytes > 10 * 1024 * 1024) {
        alert(language.storageLimitExceeded || 'Storage limit exceeded (10MB maximum)! Please delete some old images.');
        return;
      }

      if (isLibraryEditIndex !== undefined && isLibraryEditIndex >= 0 && isLibraryEditIndex < customMemes.length) {
        customMemes[isLibraryEditIndex] = activeImgObj.testDataUrl;
      } else {
        customMemes.unshift(activeImgObj.testDataUrl);
      }
      
      await chrome.storage.local.set({ custom_memes: customMemes });
      loadCustomImages();
      
      // 3. Remove image from slide deck
      imagesArray.splice(currentIndex, 1);

      if (imagesArray.length > 0) {
        // Switch to the next available image
        if (currentIndex >= imagesArray.length) {
          currentIndex = imagesArray.length - 1;
        }
        loadActiveImage();
        showToast(language.toastSentAndSavedNext || 'Đã gửi & lưu ảnh! Đang chuyển sang ảnh tiếp theo...');
      } else {
        // Complete! Close modal
        overlay.classList.remove('visible');
        showToast(language.toastSentAndSavedAll || 'Đã gửi & lưu toàn bộ ảnh thành công! 🎉');
      }
    };

    // Save only button (Lưu thư viện) - Processes active image only, slides to next or closes when done
    saveBtn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const activeImgObj = imagesArray[currentIndex];
      if (!activeImgObj) return;

      const res = await chrome.storage.local.get(['custom_memes']);
      const customMemes = res.custom_memes || [];
      
      let totalBytes = 0;
      customMemes.forEach((url, i) => {
        if (isLibraryEditIndex !== i) {
          totalBytes += getBase64Size(url);
        }
      });
      const newBytes = getBase64Size(activeImgObj.testDataUrl);

      if (totalBytes + newBytes > 10 * 1024 * 1024) {
        alert(language.storageLimitExceeded || 'Storage limit exceeded (10MB maximum)! Please delete some old images.');
        return;
      }

      if (isLibraryEditIndex !== undefined && isLibraryEditIndex >= 0 && isLibraryEditIndex < customMemes.length) {
        customMemes[isLibraryEditIndex] = activeImgObj.testDataUrl;
      } else {
        customMemes.unshift(activeImgObj.testDataUrl);
      }
      
      await chrome.storage.local.set({ custom_memes: customMemes });
      loadCustomImages();

      // Remove image from slide deck
      imagesArray.splice(currentIndex, 1);

      if (imagesArray.length > 0) {
        if (currentIndex >= imagesArray.length) {
          currentIndex = imagesArray.length - 1;
        }
        loadActiveImage();
        showToast(language.toastSavedToLibraryNext || 'Đã lưu ảnh vào thư viện! Đang chuyển sang ảnh tiếp theo...');
      } else {
        overlay.classList.remove('visible');
        showToast(language.toastSavedToLibraryAll || 'Đã lưu toàn bộ ảnh vào thư viện! 🎉');
      }
    };

    // Initial load
    loadActiveImage();
    overlay.classList.add('visible');
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

  function registerCustomImageEvents() {
    const fileInput = document.getElementById('chatops-image-upload-input');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (files.length > 5) {
          alert(language.maxUploadLimitError || 'Bạn chỉ có thể tải lên tối đa 5 ảnh cùng lúc.');
          fileInput.value = '';
          return;
        }

        const hasNonImage = files.some(f => !f.type.startsWith('image/'));
        if (hasNonImage) {
          alert(language.uploadOnlyImages || 'Please upload image files only.');
          fileInput.value = '';
          return;
        }

        // Read all selected files as Data URLs asynchronously
        const readers = files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          });
        });

        const sources = await Promise.all(readers);
        openImageResizeModal(sources);
        fileInput.value = '';
      });
    }

    const container = document.getElementById('chatops-custom-images-grid');
    if (container) {
      container.addEventListener('click', async (e) => {
        const img = e.target.closest('.chatops-custom-image-item');
        if (img) {
          insertImageToChat(img.src);
          if (imagePickerEl) imagePickerEl.classList.add('hidden');
          return;
        }

        const previewBtn = e.target.closest('.chatops-custom-image-preview');
        if (previewBtn) {
          e.stopPropagation();
          const idx = parseInt(previewBtn.dataset.idx, 10);
          const res = await chrome.storage.local.get(['custom_memes']);
          const customMemes = res.custom_memes || [];
          if (customMemes[idx]) {
            openImagePreview(customMemes[idx]);
          }
          return;
        }

        const resizeBtn = e.target.closest('.chatops-custom-image-resize');
        if (resizeBtn) {
          e.stopPropagation();
          const idx = parseInt(resizeBtn.dataset.idx, 10);
          const res = await chrome.storage.local.get(['custom_memes']);
          const customMemes = res.custom_memes || [];
          if (customMemes[idx]) {
            openImageResizeModal(customMemes[idx], idx);
          }
          return;
        }

        const delBtn = e.target.closest('.chatops-custom-image-delete');
        if (delBtn) {
          e.stopPropagation();
          const idx = parseInt(delBtn.dataset.idx, 10);
          const res = await chrome.storage.local.get(['custom_memes']);
          const customMemes = res.custom_memes || [];
          customMemes.splice(idx, 1);
          await chrome.storage.local.set({ custom_memes: customMemes });
          loadCustomImages();
        }
      });

      // Double-click to preview custom images
      container.addEventListener('dblclick', (e) => {
        const img = e.target.closest('.chatops-custom-image-item');
        if (img) {
          e.stopPropagation();
          openImagePreview(img.src);
        }
      });
    }
  }

  function toggleImagePickerUI(anchorBtn, targetTextboxId) {
    if (!imagePickerEl) {
      imagePickerEl = document.createElement('div');
      imagePickerEl.className = 'chatops-image-picker hidden';
      imagePickerEl.innerHTML = `
        <div class="chatops-image-picker-header" style="display: flex; flex-direction: column; align-items: stretch; gap: 8px; border-bottom: 1px solid #e0e0e5; padding: 10px 12px 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span style="font-weight: 700; font-size: 13px; color: #1c58d9;">${language.imageLibrary}</span>
            <button type="button" id="chatops-image-close" class="chatops-image-close-btn">✕</button>
          </div>
          <div class="chatops-picker-sub-tabs">
            <button type="button" class="chatops-picker-sub-tab active" data-tab="library">${language.imageLibraryTab}</button>
            <button type="button" class="chatops-picker-sub-tab" data-tab="gifs">${language.gifLibraryTab}</button>
          </div>
        </div>
        
        <!-- Panel 1: Library -->
        <div id="chatops-picker-panel-library" class="chatops-picker-panel active">
          <div class="chatops-image-upload-area">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
              <div style="display:flex; flex-direction:column; line-height: 1.2;">
                <span id="chatops-your-images-header" style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.5px;">${language.yourImages}</span>
                <span id="chatops-your-images-size" style="font-size:10px; color:#888; margin-top:2px;">(0 KB / 10 MB)</span>
              </div>
              <label for="chatops-image-upload-input" class="chatops-image-upload-btn">
                ${language.uploadImageBtn}
              </label>
              <input type="file" id="chatops-image-upload-input" accept="image/*" style="display:none;" multiple />
            </div>
            <div id="chatops-custom-images-grid" class="chatops-custom-images-grid-container">
              <span class="chatops-image-empty">${language.noImagesHint}</span>
            </div>
          </div>
        </div>

        <!-- Panel 2: GIFs -->
        <div id="chatops-picker-panel-gifs" class="chatops-picker-panel">
          <div style="padding: 6px 12px 10px; display: flex; flex-direction: column; gap: 6px; flex: 1; overflow: hidden; height: 100%; box-sizing: border-box;">
            <div id="chatops-picker-gif-search-area" class="chatops-gif-search-area" style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" id="chatops-picker-gif-search" placeholder="${language.searchGifPlaceholder}"
                style="width: 100%; padding: 6px 28px 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; outline: none; font-family: inherit; background:#fff; box-sizing:border-box;">
              <span style="position: absolute; right: 8px; font-size: 11px; color: #888; pointer-events: none;">🔍</span>
            </div>
            <div class="chatops-gif-hint-notice" style="font-size: 11.5px; color: #555; background: #f5f5f7; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; line-height: 1.4; box-sizing: border-box; display: flex; align-items: flex-start; gap: 4px; margin-top: 1px;">
              <span data-i18n="gifDefaultHint">${language.gifDefaultHint}</span>
            </div>
            <div id="chatops-picker-gifs-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; flex: 1; overflow-y: auto; padding: 2px 2px;">
              <!-- GIFs rendered here dynamically -->
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(imagePickerEl);
      document.getElementById('chatops-image-close').addEventListener('click', () => {
        imagePickerEl.classList.add('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!imagePickerEl) return;
        const isClickInside = imagePickerEl.contains(e.target);
        const isClickAnchor = e.target.closest('.chatops-ext-image-picker-btn');
        const isClickPreview = e.target.closest('#chatops-image-preview-overlay') || e.target.closest('.chatops-image-preview-overlay');
        const isClickResize = e.target.closest('#chatops-image-resize-overlay') || e.target.closest('.chatops-image-resize-overlay');
        if (!isClickInside && !isClickAnchor && !isClickPreview && !isClickResize) {
          imagePickerEl.classList.add('hidden');
        }
      });

      // Tab switching listeners
      imagePickerEl.querySelectorAll('.chatops-picker-sub-tab').forEach(tabBtn => {
        tabBtn.addEventListener('click', (e) => {
          imagePickerEl.querySelectorAll('.chatops-picker-sub-tab').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');

          const tabName = e.target.dataset.tab;
          imagePickerEl.querySelectorAll('.chatops-picker-panel').forEach(p => p.classList.remove('active'));
          
          const targetPanel = imagePickerEl.querySelector(`#chatops-picker-panel-${tabName}`);
          if (targetPanel) {
            targetPanel.classList.add('active');
          }

          if (tabName === 'gifs') {
            const pickerGifSearchInput = document.getElementById('chatops-picker-gif-search');
            const currentQuery = pickerGifSearchInput ? pickerGifSearchInput.value : '';
            if (currentQuery.trim() === '') {
              loadPickerGifs('');
            }
          }
        });
      });

      // GIF search input keyup/input listener
      const pickerGifSearchInput = document.getElementById('chatops-picker-gif-search');
      if (pickerGifSearchInput) {
        let pickerGifTimeout = null;
        pickerGifSearchInput.addEventListener('input', (e) => {
          clearTimeout(pickerGifTimeout);
          pickerGifTimeout = setTimeout(() => {
            loadPickerGifs(e.target.value);
          }, 300);
        });
      }

      // GIF Grid interactions
      const pickerGifsGrid = document.getElementById('chatops-picker-gifs-grid');
      if (pickerGifsGrid) {
        pickerGifsGrid.addEventListener('click', (e) => {
          const clickedImg = e.target.closest('img');
          const clickedItem = e.target.closest('.chatops-picker-meme-item');
          if (clickedImg && clickedItem) {
            const url = clickedItem.dataset.url;
            insertImageToChat(url);
            imagePickerEl.classList.add('hidden');
          }
        });

        // Double-click to preview in full
        pickerGifsGrid.addEventListener('dblclick', (e) => {
          const clickedImg = e.target.closest('img');
          const clickedItem = e.target.closest('.chatops-picker-meme-item');
          if (clickedImg && clickedItem) {
            e.stopPropagation();
            const url = clickedItem.dataset.url;
            openImagePreview(url);
          }
        });
      }

      loadCustomImages();
      registerCustomImageEvents();
    }

    // Set the tracking variables
    const container = anchorBtn.closest('.post-create-body, .input-container, .post-body__cell, .post-create, form, [class*="post-create"]');
    if (container) {
      activeChatTextarea = container.querySelector('textarea');
    } else {
      activeChatTextarea = document.getElementById(targetTextboxId) || 
        (targetTextboxId === 'reply_textbox'
          ? document.querySelector('#reply_textbox, .sidebar-right textarea, .rhs-thread textarea, .sidebar--right textarea, [placeholder*="reply" i]')
          : document.querySelector('#post_textbox, .post-create-body textarea, [placeholder*="write" i]'));
    }

    imagePickerEl.dataset.activeTextbox = targetTextboxId || 'post_textbox';

    const isHidden = imagePickerEl.classList.contains('hidden');
    if (isHidden) {
      // Revert to active tab (library) when opening
      imagePickerEl.querySelectorAll('.chatops-picker-sub-tab').forEach(b => {
        if (b.dataset.tab === 'library') b.classList.add('active');
        else b.classList.remove('active');
      });
      imagePickerEl.querySelectorAll('.chatops-picker-panel').forEach(p => {
        if (p.id === 'chatops-picker-panel-library') p.classList.add('active');
        else p.classList.remove('active');
      });

      loadCustomImages();
      const rect = anchorBtn.getBoundingClientRect();
      
      // Calculate normal bottom position (so it is 10px above the button)
      const pickerHeight = 480; // Height of the picker in CSS
      let bottomValue = window.innerHeight - rect.top + 10;
      
      // Prevent picker from going above the top of the viewport
      // Top position of picker = window.innerHeight - bottomValue - pickerHeight
      // We want: Top position of picker >= 10px
      // So: window.innerHeight - bottomValue - pickerHeight >= 10
      // => bottomValue <= window.innerHeight - pickerHeight - 10
      const maxBottom = window.innerHeight - pickerHeight - 10;
      if (bottomValue > maxBottom) {
        bottomValue = Math.max(10, maxBottom);
      }
      
      imagePickerEl.style.position = 'fixed'; // Ensure fixed viewport-relative positioning
      imagePickerEl.style.bottom = `${bottomValue}px`;
      imagePickerEl.style.left = `${Math.max(10, rect.left - 320)}px`;
      imagePickerEl.classList.remove('hidden');
    } else {
      imagePickerEl.classList.add('hidden');
    }
  }

  let cachedPickerTrendingGifs = [];
  let cachedPickerTrendingApiKey = '';

  async function loadPickerGifs(query = '') {
    const grid = document.getElementById('chatops-picker-gifs-grid');
    if (!grid) return;

    const searchArea = document.getElementById('chatops-picker-gif-search-area');

    try {
      const resSettings = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
      const settings = resSettings[STORAGE_KEYS.SETTINGS] || {};
      const apiKey = settings.giphyApiKey || '';
      const hintNotice = document.querySelector('.chatops-gif-hint-notice');

      // No API key configured — show setup hint and hide search box
      if (!apiKey) {
        if (searchArea) searchArea.style.display = 'none';
        if (hintNotice) hintNotice.style.display = 'none';
        grid.innerHTML = `
          <div style="grid-column: span 3; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; min-height: 180px; padding: 12px; text-align:center; box-sizing:border-box;">
            <span style="color:var(--text-3); font-size:12px; display:block; margin:0; padding:0;">${language.giphyNoApiKey}</span>
            <a href="#" id="chatops-gif-setup-link" style="font-size:12px; color:#1c58d9; font-weight:600; text-decoration:none; margin-top:2px;">${language.giphySetupLink} ↗</a>
          </div>
        `;
        // Open sidepanel and navigate to Settings → GIFs
        const setupLink = grid.querySelector('#chatops-gif-setup-link');
        if (setupLink) {
          setupLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.storage.local.set({
              [STORAGE_KEYS.SIDEPANEL_TAB]: 'settings',
              sidePanelSubTab: 'features-gif'
            });
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDE_PANEL }).catch(() => {});
          });
        }
        return;
      }

      // If key is present, show search box and toggle hint based on search query
      if (searchArea) searchArea.style.display = 'flex';
      if (hintNotice) {
        hintNotice.style.display = query.trim() === '' ? 'flex' : 'none';
      }

      // Reuse trending cache for same API key
      if (query.trim() === '' && cachedPickerTrendingGifs.length > 0 && cachedPickerTrendingApiKey === apiKey) {
        grid.innerHTML = cachedPickerTrendingGifs.map(gif => {
          const previewUrl = gif.images.fixed_height_small.url;
          const insertUrl = settings.giphySize === '100' ? gif.images.fixed_height_small.url : gif.images.fixed_height.url;
          return `<div class="chatops-picker-meme-item" data-url="${insertUrl}" title="${gif.title}"><img src="${previewUrl}" alt="${gif.title}" loading="lazy"></div>`;
        }).join('');
        return;
      }

      grid.innerHTML = '<div style="grid-column: span 3; display:flex; align-items:center; justify-content:center; min-height: 100px;"><span class="chatops-image-empty">Loading GIFs...</span></div>';

      let url;
      if (query.trim() === '') {
        url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=21&rating=g`;
      } else {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=21&offset=0&rating=g&lang=en`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          if (query.trim() === '') {
            cachedPickerTrendingGifs = result.data;
            cachedPickerTrendingApiKey = apiKey;
          }
          grid.innerHTML = result.data.map(gif => {
            const previewUrl = gif.images.fixed_height_small.url;
            const insertUrl = settings.giphySize === '100' ? gif.images.fixed_height_small.url : gif.images.fixed_height.url;
            return `<div class="chatops-picker-meme-item" data-url="${insertUrl}" title="${gif.title}"><img src="${previewUrl}" alt="${gif.title}" loading="lazy"></div>`;
          }).join('');
          return;
        }
      }
      
      // If API query fails (invalid key or rate limit) on initial load, hide search bar and show setup link
      if (query.trim() === '') {
        if (searchArea) searchArea.style.display = 'none';
        if (hintNotice) hintNotice.style.display = 'none';
        grid.innerHTML = `
          <div style="grid-column: span 3; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; min-height: 180px; padding: 12px; text-align:center; box-sizing:border-box;">
            <span style="color:#ef4444; font-size:12px; display:block; margin:0; padding:0;">${language.giphyInvalidKey}</span>
            <a href="#" id="chatops-gif-setup-link" style="font-size:12px; color:#1c58d9; font-weight:600; text-decoration:none; margin-top:2px;">${language.giphySetupLink} ↗</a>
          </div>
        `;
        const setupLink = grid.querySelector('#chatops-gif-setup-link');
        if (setupLink) {
          setupLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.storage.local.set({
              [STORAGE_KEYS.SIDEPANEL_TAB]: 'settings',
              sidePanelSubTab: 'features-gif'
            });
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDE_PANEL }).catch(() => {});
          });
        }
        return;
      }

      grid.innerHTML = '<div style="grid-column: span 3; display:flex; align-items:center; justify-content:center; min-height: 100px;"><span class="chatops-image-empty">No GIFs found</span></div>';
    } catch (err) {
      console.error('Failed to load GIFs in picker:', err);
      const hintNotice = document.querySelector('.chatops-gif-hint-notice');
      // Hide search bar if it is initial load error
      if (query.trim() === '') {
        if (searchArea) searchArea.style.display = 'none';
        if (hintNotice) hintNotice.style.display = 'none';
        grid.innerHTML = `
          <div style="grid-column: span 3; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; min-height: 180px; padding: 12px; text-align:center; box-sizing:border-box;">
            <span style="color:#ef4444; font-size:12px; display:block; margin:0; padding:0;">${language.giphyConnectionError}</span>
            <a href="#" id="chatops-gif-setup-link" style="font-size:12px; color:#1c58d9; font-weight:600; text-decoration:none; margin-top:2px;">${language.giphySetupLink} ↗</a>
          </div>
        `;
        const setupLink = grid.querySelector('#chatops-gif-setup-link');
        if (setupLink) {
          setupLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.storage.local.set({
              [STORAGE_KEYS.SIDEPANEL_TAB]: 'settings',
              sidePanelSubTab: 'features-gif'
            });
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDE_PANEL }).catch(() => {});
          });
        }
        return;
      }
      grid.innerHTML = '<div style="grid-column: span 3; display:flex; align-items:center; justify-content:center; min-height: 100px;"><span class="chatops-image-empty">Failed to load GIFs</span></div>';
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

  function insertImageToChat(url) {
    globalInsertImageToChat = insertImageToChat;
    let textarea = activeChatTextarea;
    if (!textarea) {
      const targetId = imagePickerEl?.dataset.activeTextbox || 'post_textbox';
      textarea = document.getElementById(targetId);
      if (!textarea) {
        if (targetId === 'reply_textbox') {
          textarea = document.querySelector('#reply_textbox, .sidebar-right textarea, .rhs-thread textarea, .sidebar--right textarea, [placeholder*="reply" i]');
        } else {
          textarea = document.querySelector('#post_textbox, .post-create-body textarea, [placeholder*="write" i]');
        }
      }
    }
    if (!textarea) return;

    if (url.startsWith('data:')) {
      try {
        const blob = dataURLtoBlob(url);
        const ext = blob.type.split('/')[1] || 'png';
        const file = new File([blob], `image.${ext}`, { type: blob.type });

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
        console.error('Failed to paste custom image:', err);
      }
      return;
    }

    const markdown = `![image](${url})`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + markdown + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // --- Quick Task on Messages ---
  quickNotePopover = null;
  quickNoteBackdrop = null;

  function convertToCustomDropdown(nativeSelect, width = null) {
    if (!nativeSelect) return;
    if (nativeSelect.nextElementSibling?.classList.contains('custom-dropdown-container')) {
      nativeSelect.nextElementSibling.remove();
    }

    nativeSelect.style.display = 'none';

    const computedStyle = window.getComputedStyle(nativeSelect);
    const selectWidth = width || computedStyle.width || '100%';

    const container = document.createElement('div');
    container.className = 'custom-dropdown-container';
    container.style.width = selectWidth;
    container.style.flexShrink = '0';
    container.style.boxSizing = 'border-box';
    container.style.display = 'inline-block';
    container.style.verticalAlign = 'middle';

    const options = Array.from(nativeSelect.options);
    const selectedIndex = nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0;
    const initialText = options[selectedIndex]?.textContent || 'Select...';

    container.innerHTML = `
      <div class="custom-dropdown" style="position: relative; width: 100%; box-sizing: border-box; font-family: var(--font);">
        <button type="button" class="custom-dropdown-toggle"
          style="width: 100%; height: 34px; font-size: 11.5px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #1a1a1c; cursor: pointer; outline: none; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; font-weight: 400; transition: all 0.2s ease; box-sizing: border-box;">
          <span class="custom-dropdown-selected-text" style="font-weight: 400; font-size: 11.5px;">${initialText}</span>
          <span class="custom-dropdown-arrow" style="font-size: 9px; opacity: 0.6; transition: transform 0.2s ease;">▼</span>
        </button>
        <ul class="custom-dropdown-menu"
          style="position: absolute; top: 100%; right: 0; margin-top: 6px; width: 100%; min-width: 120px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); padding: 4px 0; list-style: none; display: none; z-index: 1000000; max-height: 220px; overflow-y: auto; box-sizing: border-box;">
          ${options.map(opt => `
            <li class="custom-dropdown-item" data-value="${opt.value}" style="padding: 6px 12px; font-size: 11.5px; color: #1a1a1c; cursor: pointer; transition: all 0.2s ease; text-align: left; list-style: none; margin: 0; font-weight: 400;">${opt.textContent}</li>
          `).join('')}
        </ul>
      </div>
    `;

    nativeSelect.parentNode.insertBefore(container, nativeSelect.nextSibling);

    const toggleBtn = container.querySelector('.custom-dropdown-toggle');
    const menuList = container.querySelector('.custom-dropdown-menu');
    const selectedSpan = container.querySelector('.custom-dropdown-selected-text');
    const arrowSpan = container.querySelector('.custom-dropdown-arrow');

    if (!toggleBtn || !menuList || !selectedSpan || !arrowSpan) return;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
        if (m !== menuList) {
          m.style.display = 'none';
          const otherArrow = m.previousElementSibling?.querySelector('.custom-dropdown-arrow');
          if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
        }
      });

      const isVisible = menuList.style.display === 'block';

      if (!isVisible) {
        // Auto-direction layout logic (open upwards if close to viewport bottom edge)
        const rect = toggleBtn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 220; // Maximum allowed dropdown menu height (from CSS/inline style)
        if (spaceBelow < menuHeight) {
          menuList.style.top = 'auto';
          menuList.style.bottom = '100%';
          menuList.style.marginTop = '0px';
          menuList.style.marginBottom = '6px';
        } else {
          menuList.style.top = '100%';
          menuList.style.bottom = 'auto';
          menuList.style.marginTop = '6px';
          menuList.style.marginBottom = '0px';
        }
      }

      menuList.style.display = isVisible ? 'none' : 'block';
      arrowSpan.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    menuList.querySelectorAll('.custom-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.getAttribute('data-value');
        const text = item.textContent;

        selectedSpan.textContent = text;
        nativeSelect.value = val;
        nativeSelect.dispatchEvent(new Event('change'));

        menuList.style.display = 'none';
        arrowSpan.style.transform = 'rotate(0deg)';
      });
    });

    nativeSelect.addEventListener('change', () => {
      const activeOption = nativeSelect.options[nativeSelect.selectedIndex];
      if (activeOption) {
        selectedSpan.textContent = activeOption.textContent;
      }
    });
  }

  // Globally hide dropdown menus on body click
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
      m.style.display = 'none';
      const otherArrow = m.previousElementSibling?.querySelector('.custom-dropdown-arrow');
      if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
    });
  });

  function getCategoryDisplayName(cat) {
    if (!cat) return '';
    if (cat.toLowerCase() === 'all') return language.categoryAll;
    return cat;
  }

  function getOrCreatePopover() {
    if (quickNotePopover) return quickNotePopover;

    quickNoteBackdrop = document.createElement('div');
    quickNoteBackdrop.id = 'chatops-quick-note-backdrop';
    document.body.appendChild(quickNoteBackdrop);

    quickNotePopover = document.createElement('div');
    quickNotePopover.id = 'chatops-quick-note-popover';
    quickNotePopover.innerHTML = `
      <div class="sp-modal-header" style="border-top-left-radius: 11px; border-top-right-radius: 11px; border-bottom: 1px solid #cbd5e1;">
        <h3 class="sp-modal-title cqn-title" style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">${language.modalAddTaskTitle.toUpperCase()}</h3>
        <button id="cqn-close" class="sp-modal-close-btn" title="${language.cancel}">&times;</button>
      </div>
      
      <div class="sp-modal-body" style="padding: 14px 16px; box-sizing: border-box; background: #ffffff; border-bottom-left-radius: 11px; border-bottom-right-radius: 11px;">
        <div class="cqn-title-row" style="margin-bottom: 8px; width: 100%;">
          <input type="text" id="cqn-note-title" placeholder="${language.titleOptional}" style="width: 50%; height: 28px; font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; outline: none; box-sizing: border-box; font-family: inherit;" autocomplete="off">
        </div>
        <div class="task-quick-input-row" style="margin-bottom: 12px; width: 100%;">
          <textarea id="cqn-note-text" placeholder="${language.taskTextareaPlaceholder}" class="quick-note-textarea" style="width: 100%; min-height: 110px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>
        
        <div id="cqn-note-section" style="margin-bottom: 12px; width: 100%; display: none;">
          <div style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; margin-bottom:4px;">${language.categoryLabel}</div>
          <select id="cqn-category" class="custom-select" style="width:100%; height: 34px; font-size: 12.5px; border-radius: 6px; border:1px solid #cbd5e1; background:#fff; outline:none; cursor:pointer; box-sizing: border-box;">
            <option value="general">📁 ${language.categoryGeneral}</option>
            <option value="work">📁 ${language.categoryWork}</option>
            <option value="personal">📁 ${language.categoryPersonal}</option>
            <option value="ideas">📁 ${language.categoryIdeas}</option>
          </select>
        </div>

        <div id="cqn-task-section" style="margin-bottom: 12px; width: 100%;">
          <div class="task-reminder-wrapper" style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; width:100%; box-sizing: border-box;">
            <div class="task-reminder-row" id="cqnReminderRow"
              style="flex:1 1 220px; min-width:220px; background:#fff; padding:0 10px; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer; display:flex; align-items:center; height:34px; box-sizing:border-box; transition: opacity 0.2s ease;">
              <label class="task-reminder-label" for="cqn-reminder-time"
                style="margin-right:6px; cursor:pointer; display:inline-flex; align-items:center; white-space:nowrap; font-size:12.5px; line-height:1; height:100%; margin-bottom:0;">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"
                  style="margin-right:4px; opacity:0.7; flex-shrink:0; display:inline-block; vertical-align:middle; position:relative; top:-0.5px;">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
                </svg>
                ${language.taskReminderLabel}
              </label>
              <input type="text" id="cqn-reminder-time" class="quick-task-datetime" placeholder="${language.chooseDatePlaceholder}"
                style="flex:1; cursor:pointer; background:transparent; border:none; outline:none; font-size:12.5px; width:100%; min-width:0; padding:0; margin:0; display:inline-flex; align-items:center; line-height:1; height:100%; box-shadow:none;">
            </div>

            <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 0 4px; flex-shrink: 0; user-select: none; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0; line-height: 1;">${language.orLabel}</span>

            <select id="cqnReminderSelect" class="custom-select"
              style="width: 115px; height: 34px; font-size: 12.5px; border-radius: 6px; cursor: pointer; outline: none; box-sizing: border-box; flex-shrink: 0; line-height: 1; padding: 0 24px 0 10px;">
              <option value="">${language.remindInPreset}</option>
              <option value="15">+15m</option>
              <option value="30">+30m</option>
              <option value="60">+1h</option>
              <option value="120">+2h</option>
              <option value="240">+4h</option>
              <option value="360">+6h</option>
              <option value="480">+8h</option>
            </select>
          </div>
          <div class="task-reminder-repeat-row" style="margin-top: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="cqnTaskRemindDaily" style="cursor: pointer; width: 14px; height: 14px; margin: 0;">
            <label for="cqnTaskRemindDaily" style="font-size: 12px; color: #475569; cursor: pointer; user-select: none; font-weight: 500; margin-bottom: 0">${language.taskRemindDailyLabel}</label>
          </div>
          <div class="input-helper" id="cqnSnoozeHintText" style="margin-top: 6px; margin-bottom: 12px;"></div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; width: 100%; border-top: 1px solid #cbd5e1; padding-top: 12px; box-sizing: border-box;">
          <button type="button" id="cqn-cancel" class="chatops-btn chatops-btn-secondary" style="padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: transparent; height: 36px; color: #475569; display: inline-flex; align-items: center; justify-content: center; margin: 0; box-sizing: border-box;">${language.cancel}</button>
          <button type="button" id="cqn-save-note" class="chatops-btn chatops-btn-primary" style="padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; background: #1c58d9; color: #fff; border: none; height: 36px; min-width: 90px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(28, 88, 217, 0.2); margin: 0; box-sizing: border-box;">🎯 Add Task</button>
        </div>
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
    const reminderRow = document.getElementById('cqnReminderRow');
    const cqnCategorySelect = document.getElementById('cqn-category');
    const cqnReminderSelect = document.getElementById('cqnReminderSelect');

    function syncReminderDimming() {
      const customSelect = cqnReminderSelect?.nextElementSibling;
      if (reminderRow) {
        reminderRow.style.opacity = '1';
      }
      if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
        customSelect.style.opacity = '1';
      }
    }

    let fpCqn = null;
    function initCqnFlatpickr(noCalendarMode = false) {
      if (fpCqn) {
        try {
          fpCqn.destroy();
        } catch (e) {}
      }
      if (!timeInput) return;
      fpCqn = initCommonFlatpickr(timeInput, {
        noCalendar: noCalendarMode,
        enableTime: true,
        dateFormat: noCalendarMode ? "H:i" : "Y-m-d H:i",
        appendTo: quickNotePopover,
        onChange: function(selectedDates) {
          if (selectedDates.length > 0) {
            if (cqnReminderSelect) {
              cqnReminderSelect.value = '';
              const customSelect = cqnReminderSelect.nextElementSibling;
              if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
                const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
                if (selectedText) selectedText.textContent = language.remindInPreset;
              }
            }
          }
          syncReminderDimming();
        },
        onOpen: function(selectedDates, dateStr, instance) {
          if (instance && instance.calendarContainer) {
            instance.calendarContainer.classList.add('cqn-centered-calendar');
          }
          if (cqnReminderSelect) {
            cqnReminderSelect.value = '';
            const customSelect = cqnReminderSelect.nextElementSibling;
            if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
              const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
              if (selectedText) selectedText.textContent = language.remindInPreset;
            }
          }
          syncReminderDimming();
        }
      });
      timeInput._flatpickr = fpCqn;
      timeInput._initCqnFlatpickr = initCqnFlatpickr;
    }

    const repeatDailyCheckbox = document.getElementById('cqnTaskRemindDaily');
    if (repeatDailyCheckbox && timeInput) {
      repeatDailyCheckbox.addEventListener('change', () => {
        const isChecked = repeatDailyCheckbox.checked;
        const currentVal = timeInput.value;
        
        initCqnFlatpickr(isChecked);
        
        if (currentVal) {
          if (isChecked) {
            const match = currentVal.match(/\d{2}:\d{2}/);
            if (fpCqn) {
              if (match) {
                fpCqn.setDate(match[0], false);
              } else {
                fpCqn.clear();
              }
            }
          } else {
            const match = currentVal.match(/^(\d{2}):(\d{2})$/);
            if (fpCqn) {
              if (match) {
                const today = new Date();
                today.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
                fpCqn.setDate(today, false);
              } else {
                fpCqn.clear();
              }
            }
          }
        }
        syncReminderDimming();
      });
    }

    initCqnFlatpickr(repeatDailyCheckbox ? repeatDailyCheckbox.checked : false);

    if (reminderRow) {
      reminderRow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cqnReminderSelect) {
          cqnReminderSelect.value = '';
          const customSelect = cqnReminderSelect.nextElementSibling;
          if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
            const selectedText = customSelect.querySelector('.custom-dropdown-selected-text');
            if (selectedText) selectedText.textContent = language.remindInPreset;
          }
        }
        syncReminderDimming();
        if (e.target !== timeInput && fpCqn) {
          fpCqn.open();
        }
      });
    }

    // Convert selects to premium custom dropdowns
    convertToCustomDropdown(cqnCategorySelect);
    convertToCustomDropdown(cqnReminderSelect, '115px');

    const customSelect = cqnReminderSelect?.nextElementSibling;
    if (customSelect) {
      customSelect.addEventListener('click', () => {
        if (fpCqn) fpCqn.clear();
        syncReminderDimming();
      });
    }

    if (cqnReminderSelect && timeInput) {
      cqnReminderSelect.addEventListener('change', () => {
        const val = cqnReminderSelect.value;
        if (!val) {
          syncReminderDimming();
          return;
        }
        if (fpCqn) fpCqn.clear();
        syncReminderDimming();
      });
    }

    return quickNotePopover;
  }

  async function openQuickNote(postEl, anchorBtn, mode = 'task') {
    const popover = getOrCreatePopover();
    popover.dataset.mode = mode;

    try {
      const resSettings = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS, 'activeMemoCategory']);
      const categories = resSettings[STORAGE_KEYS.SETTINGS]?.memoCategories || ['General', 'Work'];
      const activeFilter = resSettings['activeMemoCategory'] || 'all';
      const cqnCategorySelect = document.getElementById('cqn-category');
      if (cqnCategorySelect) {
        cqnCategorySelect.innerHTML = categories.map(c => `
          <option value="${c}">📁 ${getCategoryDisplayName(c)}</option>
        `).join('');
        
        if (activeFilter !== 'all' && categories.includes(activeFilter)) {
          cqnCategorySelect.value = activeFilter;
        } else if (categories.length > 0) {
          cqnCategorySelect.value = categories[0];
        }
        
        convertToCustomDropdown(cqnCategorySelect);
      }
    } catch (err) {
      console.warn('[ChatOps Ext] Failed to load dynamic categories:', err);
    }

    const msgBodyEl = postEl.querySelector('.post-message__text, .post__body p, [class*="post-message"]');
    let msgTextFull = msgBodyEl ? msgBodyEl.innerText.trim() : '';
    
    // Find all images in the post to append as Markdown
    const imgEls = postEl.querySelectorAll('img.attachment__image, img.markdown-inline-img, .post-image__column img');
    if (imgEls.length > 0) {
      const imgUrls = Array.from(imgEls).map(img => img.src).filter(Boolean);
      if (imgUrls.length > 0) {
        const imageMarkdown = imgUrls.map(url => `![Image](${url})`).join('\n');
        if (msgTextFull) {
          msgTextFull += '\n\n' + imageMarkdown;
        } else {
          msgTextFull = imageMarkdown;
        }
      }
    }

    if (!msgTextFull) {
      msgTextFull = language.msgPreviewNoText;
    }
    const postId = cleanPostId(postEl);
    
    // Pre-fill the textarea directly
    const titleInput = document.getElementById('cqn-note-title');
    if (titleInput) titleInput.value = '';
    document.getElementById('cqn-note-text').value = msgTextFull;
    const reminderInput = document.getElementById('cqn-reminder-time');
    const repeatDailyCheckbox = document.getElementById('cqnTaskRemindDaily');
    if (repeatDailyCheckbox) {
      repeatDailyCheckbox.checked = false;
    }
    if (reminderInput?._flatpickr) {
      if (typeof reminderInput._initCqnFlatpickr === 'function') {
        reminderInput._initCqnFlatpickr(false);
      }
      reminderInput._flatpickr.clear();
    } else if (reminderInput) {
      reminderInput.value = '';
    }
    
    const presetSelect = document.getElementById('cqnReminderSelect');
    if (presetSelect) {
      presetSelect.value = '';
      presetSelect.dispatchEvent(new Event('change'));
    }

    popover.dataset.postId = postId;
    popover.dataset.postText = msgTextFull;
    
    quickNoteBackdrop.classList.add('visible');
    popover.classList.add('visible');

    const taskSection = popover.querySelector('#cqn-task-section');
    const noteSection = popover.querySelector('#cqn-note-section');
    const hintEl = popover.querySelector('#cqnSnoozeHintText');
    const saveBtn = document.getElementById('cqn-save-note');
    
    if (popover.dataset.mode === 'note') {
      if (taskSection) taskSection.style.display = 'none';
      if (noteSection) noteSection.style.display = 'block';
      popover.querySelector('.cqn-title').textContent = language.quickNoteTitle;
      saveBtn.innerHTML = language.memoAddBtn;
    } else {
      if (taskSection) taskSection.style.display = 'block';
      if (noteSection) noteSection.style.display = 'none';
      popover.querySelector('.cqn-title').textContent = language.quickTaskTitle;
      saveBtn.innerHTML = '🎯 ' + language.taskAddBtn;
      if (hintEl) {
        const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
        const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 30 };
        hintEl.innerHTML = language.taskReminderHint.replace('{minutes}', settings.snoozeMinutes);
      }
    }

    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => saveTask(popover));
    
    // Focus the textarea and put cursor at the end
    const textarea = document.getElementById('cqn-note-text');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  function formatDateTimeLocal(date) {
    const pad = num => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  async function saveTask(popover) {
    const { postId, postText, mode } = popover.dataset;
    const titleText = document.getElementById('cqn-note-title') ? document.getElementById('cqn-note-title').value.trim() : '';
    const noteText = document.getElementById('cqn-note-text').value.trim();
    const reminderTime = document.getElementById('cqn-reminder-time') ? document.getElementById('cqn-reminder-time').value : '';
    const category = document.getElementById('cqn-category') ? document.getElementById('cqn-category').value : 'General';
    const id = `${mode === 'note' ? 'memo_' : ALARMS.TASK_PREFIX}${Date.now()}`;
    const teamName = window.location.pathname.split('/')[1] || '';
    
    const repeatDailyCheckbox = document.getElementById('cqnTaskRemindDaily');
    const isRepeatDaily = (mode === 'note') ? false : (repeatDailyCheckbox ? repeatDailyCheckbox.checked : false);

    let reminderVal = (mode === 'note') ? null : (reminderTime || null);
    const presetVal = document.getElementById('cqnReminderSelect')?.value;
    if (mode === 'task' && !reminderVal && presetVal) {
      const mins = parseInt(presetVal, 10);
      if (!isNaN(mins)) {
        reminderVal = formatDateTimeLocal(new Date(Date.now() + mins * 60 * 1000));
      }
    }

    if (mode === 'task' && reminderVal && isRepeatDaily && reminderVal.length === 5 && reminderVal.includes(':')) {
      const today = new Date();
      const parts = reminderVal.split(':');
      today.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      if (today.getTime() <= Date.now()) {
        today.setDate(today.getDate() + 1);
      }
      reminderVal = formatDateTimeLocal(today);
    }

    const item = { 
      id, 
      type: mode === 'note' ? 'memo' : 'task', 
      postId, 
      postText, 
      title: titleText || '',
      note: noteText || postText, 
      category: mode === 'note' ? category : 'General',
      createdAt: Date.now(), 
      done: false, 
      reminder: reminderVal,
      repeatDaily: isRepeatDaily,
      status: 'pending', 
      teamName 
    };

    const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS, STORAGE_KEYS.SETTINGS]);
    const memos = res[STORAGE_KEYS.MEMOS] || [];
    const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 30 };
    memos.unshift(item);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MEMO_UPDATED });
    
    if (mode === 'task' && reminderVal) {
      const startTime = new Date(reminderVal).getTime();
      if (!isNaN(startTime)) {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_TASK_ALARM, taskId: id, time: startTime });
      }
    }
    
    popover.classList.remove('visible');
    quickNoteBackdrop.classList.remove('visible');
  }

  const DEFAULT_SETTINGS = {
    spamEnabled: true,
    memeEnabled: true,
    showTabs: { search: true, tasks: true, notes: true, missed: true, reactions: true },
    floatingButtons: { quickNote: true, quickTask: true, spamReactions: false, imagePicker: true, quickReply: true, quickCopy: true },
    spamEmojis: ['thumbsup', 'heart', 'fire', 'rocket', 'tada', 'laughing', 'smile', 'wink', 'heart_eyes', 'kissing_heart'],
    tabsCompactMode: false
  };
  let cachedSettings = { ...DEFAULT_SETTINGS };
  let cachedMemos = [];
  let myUserId = '';

  // Fetch initial settings and memos
  chrome.storage.local.get([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.MEMOS], (res) => {
    if (res[STORAGE_KEYS.SETTINGS]) {
      const raw = res[STORAGE_KEYS.SETTINGS];
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...raw,
        showTabs: { ...DEFAULT_SETTINGS.showTabs, ...raw.showTabs },
        floatingButtons: { ...DEFAULT_SETTINGS.floatingButtons, ...raw.floatingButtons }
      };
    }
    if (res[STORAGE_KEYS.MEMOS]) {
      cachedMemos = res[STORAGE_KEYS.MEMOS];
    }
    injectDynamicTheme();
    loadCustomImages();
    
    // Fetch my profile ID to identify our own messages
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_MY_PROFILE }, (profileRes) => {
      if (profileRes && profileRes.ok && profileRes.profile) {
        myUserId = profileRes.profile.id;
      }
    });

  });

  // Listen to settings and custom image changes reactively
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes[STORAGE_KEYS.SETTINGS]) {
        const raw = changes[STORAGE_KEYS.SETTINGS].newValue || {};
        const old = changes[STORAGE_KEYS.SETTINGS].oldValue || {};
        cachedSettings = {
          ...DEFAULT_SETTINGS,
          ...raw,
          showTabs: { ...DEFAULT_SETTINGS.showTabs, ...raw.showTabs },
          floatingButtons: { ...DEFAULT_SETTINGS.floatingButtons, ...raw.floatingButtons }
        };
        runWithObserverDisabled(() => {
          handleQuickActionButtonsVisibility();
          injectDynamicTheme();
        });

        // Real-time update of GIF picker in ChatOps on API key save
        if (raw.giphyApiKey !== old.giphyApiKey) {
          cachedPickerTrendingGifs = [];
          cachedPickerTrendingApiKey = '';
          const pickerEl = document.querySelector('.chatops-image-picker');
          if (pickerEl && !pickerEl.classList.contains('hidden')) {
            const activeSubTab = pickerEl.querySelector('.chatops-picker-sub-tab.active');
            if (activeSubTab && activeSubTab.dataset.tab === 'gifs') {
              loadPickerGifs('');
            }
          }
        }
      }
      if (changes.custom_memes) {
        loadCustomImages();
      }
      if (changes[STORAGE_KEYS.MEMOS]) {
        cachedMemos = changes[STORAGE_KEYS.MEMOS].newValue || [];
        updateFloatingBadgeCount();
      }
    }
  });

  function handleQuickActionButtonsVisibility() {
    // Clear post processing cache so buttons are properly re-evaluated
    document.querySelectorAll('[data-chatops-injected]').forEach(el => {
      el.removeAttribute('data-chatops-injected');
    });
    document.querySelectorAll('[data-chatops-image-injected]').forEach(el => {
      el.removeAttribute('data-chatops-image-injected');
    });

    const showTabs = cachedSettings.showTabs || { search: true, tasks: true, notes: true, missed: true, reactions: true };
    const floatingButtons = cachedSettings.floatingButtons || { quickNote: true, quickTask: true, spamReactions: true, reactAlong: false, imagePicker: true, quickReply: false, quickCopy: false };
    const tasksEnabled = floatingButtons.quickTask !== false;
    const notesEnabled = floatingButtons.quickNote !== false;
    const spamEnabled = floatingButtons.spamReactions !== false;
    const reactAlongEnabled = floatingButtons.reactAlong !== false;
    const replyEnabled = floatingButtons.quickReply !== false;
    const copyEnabled = floatingButtons.quickCopy !== false;

    if (!tasksEnabled) {
      document.querySelectorAll('.chatops-action-group .chatops-quick-note-btn.task-btn').forEach(el => el.remove());
    }
    if (!notesEnabled) {
      document.querySelectorAll('.chatops-action-group .chatops-quick-note-btn.note-btn').forEach(el => el.remove());
    }
    if (!replyEnabled) {
      document.querySelectorAll('.chatops-action-group .chatops-quick-note-btn.quick-reply-btn').forEach(el => el.remove());
    }
    if (!copyEnabled) {
      document.querySelectorAll('.chatops-action-group .chatops-quick-note-btn.quick-copy-btn').forEach(el => el.remove());
    }
    if (!spamEnabled) {
      document.querySelectorAll('.chatops-action-group .chatops-quick-note-btn.spam-btn, .chatops-action-group .chatops-quick-note-btn.retract-btn').forEach(el => el.remove());
    }
    if (!reactAlongEnabled) {
      document.querySelectorAll('.chatops-action-group .chatops-quick-note-btn.clone-btn').forEach(el => el.remove());
    }
    
    const isQuickDeleteEnabled = cachedSettings.quickDelete === true;
    if (!isQuickDeleteEnabled) {
      document.querySelectorAll('.chatops-action-group .chatops-quick-note-btn.msg-delete-btn').forEach(el => el.remove());
    }
    
    injectQuickNoteButtons();
    injectImageButton();
  }

  async function getPostUsername(postEl) {
    if (!postEl) return null;

    async function getPostUsernameFromReact(postId) {
      const bridgeResult = await new Promise((resolve) => {
        let timeoutId;
        const handler = (e) => {
          if (e.detail.postId === postId) {
            window.removeEventListener('chatops-username-response', handler);
            clearTimeout(timeoutId);
            resolve({ username: e.detail.username, userId: e.detail.userId });
          }
        };
        window.addEventListener('chatops-username-response', handler);

        window.dispatchEvent(new CustomEvent('chatops-username-request', {
          detail: { postId }
        }));

        // Short timeout: 200ms
        timeoutId = setTimeout(() => {
          window.removeEventListener('chatops-username-response', handler);
          resolve({ username: null, userId: null });
        }, 200);
      });

      // Fast path: bridge resolved the username via Redux store
      if (bridgeResult.username) return bridgeResult.username;

      // Slow path: bridge found userId but not username → resolve via background API
      if (bridgeResult.userId) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.RESOLVE_USER_ID,
            userId: bridgeResult.userId
          }, (response) => {
            resolve(response && response.ok ? response.username : null);
          });
        });
      }

      return null;
    }

    const postId = cleanPostId(postEl);
    if (postId) {
      const reactUsername = await getPostUsernameFromReact(postId);
      if (reactUsername) return reactUsername;
    }

    // Helper to extract login username from a post element
    function extractUsernameFromEl(el) {
      if (!el) return null;

      // 1. Check data-username attribute (most direct)
      const withDataUsername = el.querySelector('[data-username]') || (el.hasAttribute && el.hasAttribute('data-username') ? el : null);
      if (withDataUsername) {
        const val = withDataUsername.getAttribute('data-username');
        if (val && val.trim()) return val.trim();
      }

      // 2. Check user-popover buttons/links and their IDs
      const popovers = el.querySelectorAll('.user-popover, [id*="user-popover"], [class*="user-popover"], .post-header__username, .post-profile, [class*="username"]');
      for (const p of popovers) {
        const id = p.getAttribute('id') || '';
        const match = id.match(/user-popover_(.+)$/i) || id.match(/user-popover-(.+)$/i);
        if (match && match[1]) {
          const u = match[1].trim();
          const isUserId = /^[a-z0-9]{26}$/.test(u);
          if (u && !u.includes('undefined') && !isUserId) return u;
        }
        
        // Sometimes the popover button itself has data-username
        if (p.hasAttribute('data-username')) {
          const u = p.getAttribute('data-username');
          if (u && u.trim()) return u.trim();
        }
      }

      // 3. Check profile image alt text (English, Vietnamese, and generic)
      const imgs = el.querySelectorAll('img.Avatar, img[class*="avatar"], .post__img img, .status-wrapper img, [class*="avatar"] img');
      for (const img of imgs) {
        const alt = (img.getAttribute('alt') || '').trim();
        if (!alt) continue;
        
        // 3a. English: "username profile image"
        let match = alt.match(/^(.+?)\s+profile\s+image$/i);
        if (match && match[1]) {
          const u = match[1].trim();
          if (u !== 'user') return u;
        }

        // 3b. Vietnamese: "Ảnh hồ sơ của username" or "Ảnh đại diện của username"
        match = alt.match(/^(Ảnh hồ sơ của|Ảnh đại diện của|Ảnh hồ sơ|Ảnh đại diện)\s+(.+)$/i);
        if (match && match[2]) {
          const u = match[2].trim();
          if (u && u !== 'user') return u;
        }
        
        // 3c. Generic fallback: if alt has no spaces and is not a generic word, it might be the username
        if (alt && !alt.includes(' ') && !['avatar', 'profile', 'image', 'picture', 'user'].includes(alt.toLowerCase())) {
          return alt;
        }
      }

      return null;
    }

    // Helper to extract display name from a post element
    function extractDisplayNameFromEl(el) {
      if (!el) return null;
      const popover = el.querySelector('.user-popover, .post-header__username, [class*="username"]');
      if (popover) {
        const text = popover.textContent.trim();
        if (text) return text;
      }
      return null;
    }

    // Helper to resolve display name using background search API
    async function resolveDisplayName(displayName) {
      const cleaned = displayName
        .replace(/\[[^\]]+\]/g, '') // Remove [DN.DU2.DEV] etc.
        .replace(/\([^)]+\)/g, '')   // Remove (WFH) etc.
        .trim();
        
      if (!cleaned) return null;
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.RESOLVE_DISPLAY_NAME,
          displayName: cleaned
        }, (response) => {
          if (response && response.ok && response.username) {
            resolve(response.username);
          } else {
            resolve(null);
          }
        });
      });
    }

    // Helper to find the previous post element in the DOM regardless of wrappers
    function getPreviousPostElement(el) {
      const container = el.closest('.sidebar-right, .rhs-thread, .sidebar--right, .post-list__content, .post-list-holder-by-time, #post-list, [class*="post-list"]');
      const scope = container || document;
      const allPosts = Array.from(scope.querySelectorAll('.post, [id^="post_"], [id^="rhsPost_"]'));
      const idx = allPosts.indexOf(el);
      if (idx > 0) {
        return allPosts[idx - 1];
      }
      return null;
    }

    // Walk backwards through actual post elements until we find a username or display name
    let current = postEl;
    let lookback = 0;
    while (current && lookback < 30) {
      // 1. Try to extract username directly (no API call needed)
      const username = extractUsernameFromEl(current);
      if (username) return username;
      
      // 2. Try to extract display name and resolve it via API
      const displayName = extractDisplayNameFromEl(current);
      if (displayName) {
        const resolved = await resolveDisplayName(displayName);
        if (resolved) return resolved;
      }
      
      current = getPreviousPostElement(current);
      lookback++;
    }

    return null;
  }

  function findReplyButton(el) {
    if (!el) return null;

    // IMPORTANT: Exclude ChatOps extension's own buttons to prevent infinite click loops
    const EXCLUDE = ':not(.chatops-quick-note-btn):not(.chatops-action-group *)';
    
    // Native Mattermost reply button selectors (excluding our own extension buttons)
    const NATIVE_SELECTORS = [
      `button[aria-label*="reply" i]${EXCLUDE}`,
      `button[aria-label*="Reply" i]${EXCLUDE}`,
      `button[aria-label*="Trả lời" i]${EXCLUDE}`,
      `button[aria-label*="comment" i]${EXCLUDE}`,
      `button[aria-label*="phản hồi" i]${EXCLUDE}`,
      `.comment-icon__container${EXCLUDE}`,
      `button[data-testid="reply-btn"]${EXCLUDE}`,
    ].join(', ');

    // 1. Search in hover actions menu first (most reliable)
    const postMenu = el.querySelector('.post-menu, .post__actions, .dot-menu__container, [class*="post-menu"], .post-action-menu');
    if (postMenu) {
      const btn = postMenu.querySelector(NATIVE_SELECTORS);
      if (btn) return btn;
    }

    // 2. Direct search inside post element
    let btn = el.querySelector(NATIVE_SELECTORS);
    if (btn) return btn;

    // 3. Fallback: If it's a child reply, find the parent/root post in the DOM and click its reply button
    const parentId = el.getAttribute('data-parent-id') || el.getAttribute('data-root-id');
    if (parentId) {
      const rootEl = document.getElementById(`post_${parentId}`) || document.getElementById(`rhsPost_${parentId}`);
      if (rootEl) {
        btn = rootEl.querySelector(NATIVE_SELECTORS);
        if (btn) return btn;
      }
    }

    // 4. Broader parent container search if it's a reply message grouped under a parent
    const centerPostEl = el.closest('.post');
    if (centerPostEl && centerPostEl !== el) {
      btn = centerPostEl.querySelector(NATIVE_SELECTORS);
      if (btn) return btn;
    }

    return null;
  }

  function insertTextIntoTextarea(textarea, text) {
    if (!textarea) return;
    textarea.focus();

    // For React-controlled textareas (like Mattermost), we MUST use the native
    // HTMLTextAreaElement value setter to bypass React's controlled component.
    // Then dispatch an 'input' event so React picks up the change in its state.
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (nativeSetter) {
      const currentVal = textarea.value;
      const start = textarea.selectionStart || currentVal.length;
      const end = textarea.selectionEnd || currentVal.length;
      const newVal = currentVal.substring(0, start) + text + currentVal.substring(end);

      // Use native setter to bypass React's interception
      nativeSetter.call(textarea, newVal);

      // Place cursor after inserted text
      textarea.selectionStart = textarea.selectionEnd = start + text.length;

      // Dispatch input event that React's synthetic event system listens to
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      // Also dispatch change event for good measure
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // Ultimate fallback: direct assignment + event dispatch
    const val = textarea.value;
    textarea.value = val + text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function tagUserInChat(username, isRhs) {
    let textarea = null;
    if (isRhs) {
      textarea = document.getElementById('reply_textbox') || document.querySelector('.sidebar-right textarea, .rhs-thread textarea, .sidebar--right textarea, [placeholder*="reply" i]');
    }
    if (!textarea) {
      textarea = document.getElementById('post_textbox') || document.querySelector('textarea#post_textbox, .post-create-body textarea, [placeholder*="write" i]');
    }
    if (!textarea) {
      textarea = document.querySelector('textarea');
    }

    if (!textarea) {
      console.warn('[ChatOps Ext] No chat textbox found to tag user.');
      return;
    }

    const tag = `@${username} `;
    insertTextIntoTextarea(textarea, tag);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(language.copiedToClipboard || 'Đã sao chép tin nhắn vào clipboard!');
      }).catch(err => {
        console.error('Failed to copy text using navigator.clipboard: ', err);
        fallbackCopyToClipboard(text);
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  }

  function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(language.copiedToClipboard || 'Đã sao chép tin nhắn vào clipboard!');
    } catch (err) {
      console.error('Fallback copy failed: ', err);
    }
    document.body.removeChild(textArea);
  }

  function cleanPostId(postEl) {
    const rawId = postEl?.id || '';
    return rawId.replace('post_', '').replace('rhsPost_', '').replace('rhs_post_', '');
  }

  function injectQuickNoteButtons(target = document) {
    const postsSelector =
      `.post:not([data-chatops-injected]), ` +
      `[id^="post_"]:not([data-chatops-injected]), ` +
      `[id^="rhsPost_"]:not([data-chatops-injected]), ` +
      `.post[data-chatops-injected="true"]:not(:has(.chatops-action-group)), ` +
      `[id^="post_"][data-chatops-injected="true"]:not(:has(.chatops-action-group)), ` +
      `[id^="rhsPost_"][data-chatops-injected="true"]:not(:has(.chatops-action-group))`;

    const postSelectorPattern = '.post, [id^="post_"], [id^="rhsPost_"]';

    let posts = [];
    if (target && target !== document) {
      if (target.matches && target.matches(postSelectorPattern)) {
        if (!target.dataset.chatopsInjected || (target.dataset.chatopsInjected === 'true' && !target.querySelector('.chatops-action-group'))) {
          posts.push(target);
        }
      }
      if (target.querySelectorAll) {
        posts = posts.concat(Array.from(target.querySelectorAll(postsSelector)));
      }
    } else {
      posts = Array.from(document.querySelectorAll(postsSelector));
    }
    
    const showTabs = cachedSettings.showTabs || { search: true, tasks: true, notes: true, missed: true, reactions: true };
    const floatingButtons = cachedSettings.floatingButtons || { quickNote: true, quickTask: true, spamReactions: true, reactAlong: false, imagePicker: true, quickReply: false, quickCopy: false };
    const tasksEnabled = floatingButtons.quickTask !== false;
    const notesEnabled = floatingButtons.quickNote !== false;
    const spamEnabled = floatingButtons.spamReactions !== false;
    const reactAlongEnabled = floatingButtons.reactAlong !== false;
    const replyEnabled = floatingButtons.quickReply !== false;
    const copyEnabled = floatingButtons.quickCopy !== false;

    posts.forEach(postEl => {
      const postId = cleanPostId(postEl);
      if (!postId) {
        postEl.dataset.chatopsInjected = 'skipped';
        return;
      }

      const isPostDeleted = postEl.classList.contains('post--deleted') || 
                            postEl.querySelector('.post--deleted') ||
                            postEl.textContent.includes('(message deleted)') || 
                            postEl.textContent.includes('(tin nhắn đã bị xóa)');
      if (isPostDeleted) {
        postEl.querySelectorAll('.chatops-quick-note-btn').forEach(el => el.remove());
        postEl.dataset.chatopsInjected = 'skipped';
        return;
      }

      // Guard: skip if post no longer in DOM (fixes bug after quick add from outside ChatOps)
      if (!postEl.isConnected) return;

      // Find the action bar within this post
      const actionArea = postEl.querySelector('.post-menu, .post__actions, .dot-menu__container, [class*="post-menu"], .post-action-menu');
      if (!actionArea) return;

      // Get or create a dedicated container for ChatOps buttons
      let chatopsGroup = actionArea.querySelector('.chatops-action-group');
      if (postEl.dataset.chatopsInjected === 'true' && chatopsGroup) {
        return;
      }
      postEl.dataset.chatopsInjected = 'true';
      const position = cachedSettings.customButtonsPosition || 'before';

      if (!chatopsGroup) {
        chatopsGroup = document.createElement('span');
        chatopsGroup.className = 'chatops-action-group';
        
        // Apply position-based CSS styling
        if (position === 'above') {
          chatopsGroup.style.cssText = 'position: absolute; bottom: 100%; right: 0; display: inline-flex; align-items: center; gap: 0; margin-bottom: 2px; padding: 2px 4px; background: var(--bg-1, #ffffff); border: 1px solid var(--border, #e5e5e5); border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); z-index: 10;';
        } else if (position === 'below') {
          chatopsGroup.style.cssText = 'position: absolute; top: 100%; right: 0; display: inline-flex; align-items: center; gap: 0; margin-top: 2px; padding: 2px 4px; background: var(--bg-1, #ffffff); border: 1px solid var(--border, #e5e5e5); border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); z-index: 10;';
        } else {
          chatopsGroup.style.cssText = 'display: inline-flex; align-items: center; gap: 0;';
        }

        // Insert at the configured position relative to native action menu
        if (position === 'after') {
          actionArea.appendChild(chatopsGroup);
        } else {
          actionArea.insertBefore(chatopsGroup, actionArea.firstChild);
        }
      } else {
        // Update styling and layout order in case setting changed dynamically
        if (position === 'above') {
          chatopsGroup.style.cssText = 'position: absolute; bottom: 100%; right: 0; display: inline-flex; align-items: center; gap: 0; margin-bottom: 2px; padding: 2px 4px; background: var(--bg-1, #ffffff); border: 1px solid var(--border, #e5e5e5); border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); z-index: 10;';
        } else if (position === 'below') {
          chatopsGroup.style.cssText = 'position: absolute; top: 100%; right: 0; display: inline-flex; align-items: center; gap: 0; margin-top: 2px; padding: 2px 4px; background: var(--bg-1, #ffffff); border: 1px solid var(--border, #e5e5e5); border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); z-index: 10;';
        } else {
          chatopsGroup.style.cssText = 'display: inline-flex; align-items: center; gap: 0;';
        }

        if (position === 'after') {
          actionArea.appendChild(chatopsGroup);
        } else {
          actionArea.insertBefore(chatopsGroup, actionArea.firstChild);
        }
      }

      // Inject/Update Task button (🎯) if enabled
      if (tasksEnabled) {
        let taskBtn = chatopsGroup.querySelector('.chatops-quick-note-btn.task-btn');
        if (!taskBtn) {
          taskBtn = document.createElement('button');
          taskBtn.className = 'chatops-quick-note-btn task-btn';
          taskBtn.innerHTML = '🎯';
          taskBtn.title = language.quickTaskCreate;
          taskBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            openQuickNote(postEl, taskBtn, 'task');
          });
          chatopsGroup.appendChild(taskBtn);
        }
      } else {
        chatopsGroup.querySelector('.chatops-quick-note-btn.task-btn')?.remove();
      }

      // Inject/Update Note button (📒) if enabled
      if (notesEnabled) {
        let noteBtn = chatopsGroup.querySelector('.chatops-quick-note-btn.note-btn');
        if (!noteBtn) {
          noteBtn = document.createElement('button');
          noteBtn.className = 'chatops-quick-note-btn note-btn';
          noteBtn.innerHTML = '📒';
          noteBtn.title = language.quickNoteCreate;
          noteBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            openQuickNote(postEl, noteBtn, 'note');
          });
          chatopsGroup.appendChild(noteBtn);
        }
      } else {
        chatopsGroup.querySelector('.chatops-quick-note-btn.note-btn')?.remove();
      }

      // Inject/Update Quick Reply button (💬) if enabled
      if (replyEnabled) {
        let replyBtn = chatopsGroup.querySelector('.chatops-quick-note-btn.quick-reply-btn');
        if (!replyBtn) {
          replyBtn = document.createElement('button');
          replyBtn.className = 'chatops-quick-note-btn quick-reply-btn';
          replyBtn.innerHTML = '💬';
          replyBtn.title = language.quickReplyBtnTooltip || 'Phản hồi nhanh (@)';
          replyBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();

            // Re-entrancy guard: prevent infinite loop if this handler fires again
            if (replyBtn.dataset.busy === 'true') return;
            replyBtn.dataset.busy = 'true';
            const clearBusy = () => { replyBtn.dataset.busy = 'false'; };
            // Auto-clear after 3s safety net
            setTimeout(clearBusy, 3000);

            const username = await getPostUsername(postEl);
            if (!username) {
              showToast(language.usernameNotFoundError || 'Không tìm thấy tên người dùng để tag!');
              clearBusy();
              return;
            }
            
            const isInsideRhs = !!postEl.closest('.sidebar-right, .rhs-thread, .sidebar--right') || postEl.id.startsWith('rhsPost_');
            
            if (isInsideRhs) {
              // Already in RHS thread, just tag in the reply textbox
              tagUserInChat(username, true);
              clearBusy();
            } else {
              // Step 1: Trigger hover events to force Mattermost to render its action menu
              postEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              postEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              
              // Step 2: After hover menu renders, find and click the native Mattermost reply button
              setTimeout(() => {
                const nativeReplyBtn = findReplyButton(postEl);
                if (nativeReplyBtn) {
                  nativeReplyBtn.click();
                  
                  // Step 3: Poll until RHS reply textbox is available, then insert @tag
                  let attempts = 0;
                  const pollInterval = setInterval(() => {
                    attempts++;
                    const textarea = document.getElementById('reply_textbox') || document.querySelector('.sidebar-right textarea, .rhs-thread textarea, .sidebar--right textarea');
                    if (textarea) {
                      clearInterval(pollInterval);
                      // Small extra delay to let React fully hydrate the textarea
                      setTimeout(() => {
                        tagUserInChat(username, true);
                        clearBusy();
                      }, 100);
                    } else if (attempts > 30) {
                      // Timeout after ~3s - fall back to main chat
                      clearInterval(pollInterval);
                      tagUserInChat(username, false);
                      clearBusy();
                    }
                  }, 100);
                } else {
                  // No native reply button found, tag in the main chat input
                  tagUserInChat(username, false);
                  clearBusy();
                }
              }, 150);
            }
          });
          chatopsGroup.appendChild(replyBtn);
        }
      } else {
        chatopsGroup.querySelector('.chatops-quick-note-btn.quick-reply-btn')?.remove();
      }

      // Inject/Update Quick Copy button (📋) if enabled
      if (copyEnabled) {
        let copyBtn = chatopsGroup.querySelector('.chatops-quick-note-btn.quick-copy-btn');
        if (!copyBtn) {
          copyBtn = document.createElement('button');
          copyBtn.className = 'chatops-quick-note-btn quick-copy-btn';
          copyBtn.innerHTML = '📋';
          copyBtn.title = language.quickCopyBtnTooltip || 'Sao chép nhanh tin nhắn';
          copyBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const msgBodyEl = postEl.querySelector('.post-message__text, .post__body p, [class*="post-message"]');
            const msgTextFull = msgBodyEl ? msgBodyEl.innerText.trim() : '';
            if (!msgTextFull) {
              showToast(language.quickCopyTextOnlyError || 'Sao chép nhanh chỉ hỗ trợ tin nhắn dạng văn bản.');
              return;
            }
            copyToClipboard(msgTextFull);
          });
          chatopsGroup.appendChild(copyBtn);
        }
      } else {
        chatopsGroup.querySelector('.chatops-quick-note-btn.quick-copy-btn')?.remove();
      }

          // Remove delete association button (🗑️) as it is no longer needed on ChatOps
      chatopsGroup.querySelector('.chatops-quick-note-btn.delete-btn')?.remove();

      // Handle Spam and Retract buttons conditionally!
      if (spamEnabled) {
        // Inject Spam button (🔥) if not present
        if (!chatopsGroup.querySelector('.chatops-quick-note-btn.spam-btn')) {
          const spamBtn = document.createElement('button');
          spamBtn.className = 'chatops-quick-note-btn spam-btn';
          spamBtn.innerHTML = '🔥';
          spamBtn.title = language.spamReactionsTitle;
          spamBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const postId = cleanPostId(postEl);
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

              if (!res || !res.ok) {
                let errMsg = res?.error || language.unknown;
                if (errMsg.toLowerCase().includes('unable to save reaction') || errMsg.toLowerCase().includes('already spammed') || errMsg.toLowerCase().includes('already reacted')) {
                  errMsg = language.reactionAlreadyExists;
                }
                showToast(language.spamErrorPrefix + errMsg);
              }
            });
          });
          chatopsGroup.appendChild(spamBtn);
        }

        // Inject Retract button (↩️) if not present
        if (!chatopsGroup.querySelector('.chatops-quick-note-btn.retract-btn')) {
          const retractBtn = document.createElement('button');
          retractBtn.className = 'chatops-quick-note-btn retract-btn';
          retractBtn.innerHTML = '↩️';
          retractBtn.title = language.undoSpamTitle;
          retractBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const postId = cleanPostId(postEl);
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

              if (!res || !res.ok) {
                let errMsg = res?.error || language.unknown;
                if (errMsg.toLowerCase().includes('reaction not found') || errMsg.toLowerCase().includes('no reaction') || errMsg.toLowerCase().includes('unable to')) {
                  errMsg = language.reactionNotFound;
                }
                showToast(language.undoSpamErrorPrefix + errMsg);
              }
            });
          });
          chatopsGroup.appendChild(retractBtn);
        }
      } else {
        // If not enabled, clean up any existing spam and retract buttons from this post
        chatopsGroup.querySelectorAll('.chatops-quick-note-btn.spam-btn, .chatops-quick-note-btn.retract-btn').forEach(el => el.remove());
      }

      // Handle React-Along button (🎭) conditionally!
      if (reactAlongEnabled) {
        if (!chatopsGroup.querySelector('.chatops-quick-note-btn.clone-btn')) {
          const cloneBtn = document.createElement('button');
          cloneBtn.className = 'chatops-quick-note-btn clone-btn';
          cloneBtn.innerHTML = '🎭';
          cloneBtn.title = language.reactAlongTooltip || 'Reaction theo bài viết';
          cloneBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const postId = cleanPostId(postEl);
            if (!postId) return;

            const origHtml = cloneBtn.innerHTML;
            cloneBtn.innerHTML = '⏳';
            cloneBtn.style.opacity = '0.5';
            cloneBtn.disabled = true;

            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.CLONE_POST_REACTIONS,
              postId
            }, (res) => {
              cloneBtn.innerHTML = origHtml;
              cloneBtn.style.opacity = '1';
              cloneBtn.disabled = false;

              if (res && res.ok) {
                showToast(language.reactAlongSuccess || 'Sao chép các biểu tượng cảm xúc thành công! 🎭');
              } else {
                let errMsg = res?.error || language.unknown;
                if (errMsg.toLowerCase().includes('no reactions on this post to clone')) {
                  errMsg = language.noReactionsToClone || errMsg;
                } else if (errMsg.toLowerCase().includes('already reacted to all') || errMsg.toLowerCase().includes('already reacted')) {
                  errMsg = language.alreadyClonedAllReactions || errMsg;
                }
                showToast(language.reactAlongErrorPrefix + errMsg);
              }
            });
          });
          chatopsGroup.appendChild(cloneBtn);
        }
      } else {
        chatopsGroup.querySelector('.chatops-quick-note-btn.clone-btn')?.remove();
      }

      // Inject Delete Message button (🗑️ with red color) if it's our post and quickDelete is enabled
      const isOurPost = postEl.classList.contains('current--user') || (myUserId && postEl.getAttribute('data-user-id') === myUserId);
      const isQuickDeleteEnabled = cachedSettings.quickDelete === true;
      if (isOurPost && isQuickDeleteEnabled) {
        if (!chatopsGroup.querySelector('.chatops-quick-note-btn.msg-delete-btn')) {
          const msgDeleteBtn = document.createElement('button');
          msgDeleteBtn.className = 'chatops-quick-note-btn msg-delete-btn';
          msgDeleteBtn.innerHTML = '🗑️';
          msgDeleteBtn.title = language.deletePostTooltip || 'Xóa tin nhắn (ChatOps)';
          msgDeleteBtn.style.color = '#d0454c';
          msgDeleteBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.DELETE_POST,
              postId
            }, (res) => {
              if (res && res.ok) {
                // Fade out and remove post element
                postEl.style.transition = 'opacity 0.3s ease';
                postEl.style.opacity = '0';
                setTimeout(() => {
                   postEl.remove();
                }, 300);
              } else {
                console.error('[ChatOps Ext] Failed to delete message:', res?.error);
                alert(res?.error || 'Failed to delete message');
              }
            });
          });
          chatopsGroup.appendChild(msgDeleteBtn);
        }
      } else {
        chatopsGroup.querySelector('.chatops-quick-note-btn.msg-delete-btn')?.remove();
      }

      // Sort ChatOps action buttons dynamically to ensure consistent layout
      const orderClasses = [
        'task-btn',
        'note-btn',
        'quick-reply-btn',
        'quick-copy-btn',
        'spam-btn',
        'clone-btn',
        'retract-btn',
        'msg-delete-btn'
      ];
      const buttons = Array.from(chatopsGroup.querySelectorAll('.chatops-quick-note-btn'));
      buttons.sort((a, b) => {
        const classA = orderClasses.find(cls => a.classList.contains(cls));
        const classB = orderClasses.find(cls => b.classList.contains(cls));
        const idxA = classA ? orderClasses.indexOf(classA) : 999;
        const idxB = classB ? orderClasses.indexOf(classB) : 999;
        return idxA - idxB;
      });
      buttons.forEach(btn => chatopsGroup.appendChild(btn));
    });
  }

  // Handle click on settings links inside the Mattermost content script page (e.g. from Quick Task Popover)
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('.settings-subtab-link');
    if (link) {
      e.preventDefault();
      const subtabName = link.dataset.subtab;
      if (subtabName) {
        // Save target tab & sub-tab to local storage so the sidepanel opens directly to it
        await chrome.storage.local.set({ 
          [STORAGE_KEYS.SIDEPANEL_TAB]: 'settings',
          'sidePanelSubTab': subtabName 
        });
        
        // Open the sidepanel programmatically!
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDE_PANEL });
      }
    }
  });

  let lastPathname = window.location.pathname;

  function handleChannelChange() {
    document.querySelectorAll('[data-chatops-injected]').forEach(el => {
      el.removeAttribute('data-chatops-injected');
    });
    document.querySelectorAll('.chatops-action-group').forEach(el => {
      el.remove();
    });
    document.querySelectorAll('.chatops-ext-image-picker-btn').forEach(el => {
      el.remove();
    });
    document.querySelectorAll('[data-chatops-image-injected]').forEach(el => {
      el.removeAttribute('data-chatops-image-injected');
    });
  }

  let observerTimeout = null;
  let mutatedSubtrees = new Set();
  let emojiButtonMutations = false;

  observer = new MutationObserver((mutations) => {
    // Prevent orphaned scripts from continuing to run after extension update/reload
    try {
      if (!chrome.runtime || !chrome.runtime.id) {
        observer.disconnect();
        return;
      }
    } catch (err) {
      try { observer.disconnect(); } catch (e) {}
      return;
    }

    if (window.location.pathname !== lastPathname) {
      lastPathname = window.location.pathname;
      runWithObserverDisabled(() => {
        handleChannelChange();
        injectImageButton();
        injectQuickNoteButtons();
      });
      mutatedSubtrees.clear();
      emojiButtonMutations = false;
      return;
    }

    const postSelectorPattern = '.post, [id^="post_"], [id^="rhsPost_"]';

    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's a post or inside a post
            const postParent = node.closest ? node.closest(postSelectorPattern) : null;
            if (postParent) {
              mutatedSubtrees.add(postParent);
            } else if (node.querySelectorAll) {
              // It could be a container (e.g. post list) containing posts
              const matches = node.querySelectorAll(postSelectorPattern);
              matches.forEach(match => mutatedSubtrees.add(match));
            }

            // Check if emoji button is added
            if (
              node.id === 'emojiPickerButton' || 
              node.id === 'rhsEmojiPickerButton' ||
              node.matches?.('button[aria-label*="emoji" i], button[class*="emoji" i], .emoji-picker__container button') ||
              (node.querySelector && node.querySelector('#emojiPickerButton, #rhsEmojiPickerButton, button[aria-label*="emoji" i]'))
            ) {
              emojiButtonMutations = true;
            }
          }
        }
      }
    }

    if (mutatedSubtrees.size > 0 || emojiButtonMutations) {
      clearTimeout(observerTimeout);
      observerTimeout = setTimeout(() => {
        const subtreesToProcess = Array.from(mutatedSubtrees);
        const shouldInjectImages = emojiButtonMutations;
        
        // Reset state for next batch
        mutatedSubtrees.clear();
        emojiButtonMutations = false;

        runWithObserverDisabled(() => {
          if (shouldInjectImages) {
            injectImageButton();
          }
          if (subtreesToProcess.length > 0) {
            subtreesToProcess.forEach(subtree => {
              if (subtree.isConnected) {
                injectQuickNoteButtons(subtree);
              }
            });
          }
        });
      }, 100);
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  runWithObserverDisabled(() => {
    injectImageButton();
    injectQuickNoteButtons();
  });

  /*
  // Safety net: periodic injection check every 3 seconds to handle React DOM recycling and page state changes
  setInterval(() => {
    if (document.hidden) return;
    if (window.location.pathname !== lastPathname) {
      lastPathname = window.location.pathname;
      runWithObserverDisabled(() => {
        handleChannelChange();
      });
    }
    runWithObserverDisabled(() => {
      injectImageButton();
      injectQuickNoteButtons();
    });
  }, 3000);
  */
})();
