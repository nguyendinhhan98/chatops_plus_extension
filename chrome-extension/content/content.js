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
  
  const accentColor = settings.accentColor || settings.themeColor || '#1c58d9';
  const headerColor = settings.headerColor || settings.themeColor || '#1c58d9';
  
  let styleEl = document.getElementById('chatops-dynamic-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'chatops-dynamic-theme';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    :root {
      --chatops-accent: ${accentColor};
      --chatops-header: ${headerColor};
    }
    .chatops-reminder-banner { border-top-color: var(--chatops-accent) !important; }
    .crb-title { color: var(--chatops-accent) !important; }
    .crb-progress { background: var(--chatops-accent) !important; }
    .btn-primary { background: var(--chatops-accent) !important; color: #ffffff !important; }
    .cqn-mode-btn.active { color: var(--chatops-accent) !important; border-color: var(--chatops-accent) !important; background: rgba(0,0,0,0.05) !important; }
    .cqn-preview { border-left-color: var(--chatops-accent) !important; }
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
          ${isLongText ? `<button class="crb-collapse-btn collapse-btn" style="width:16px; height:16px; font-size:7px; margin-left:8px;" title="Expand/Collapse">▶</button>` : ''}
        </div>
        <div class="crb-text ${isLongText ? 'collapsible-body collapsed' : ''}" style="${isLongText ? 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; transition: all 0.2s;' : 'white-space: pre-wrap;'}">${escText}</div>
      </div>
      <button class="crb-close" title="${language.memoDelete}">×</button>
    </div>
    ${isTask ? `
      <div class="crb-task-actions">
        <button class="crb-done-btn" data-task-id="${taskId}">${language.reminderDoneBtn}</button>
        ${postId ? `<button class="crb-jump-btn" data-post-id="${postId}">${language.viewMessage || 'Go to message'}</button>` : ''}
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
          textEl.style.maxHeight = 'none';

          // Reschedule a short auto-close timer (3 seconds) when collapsed back
          if (closeTimer) clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            banner.classList.remove('visible');
            setTimeout(() => banner.remove(), 400);
          }, 3000);
        } else {
          collBtn.innerHTML = '▼';
          collBtn.classList.add('expanded');
          textEl.style.whiteSpace = 'pre-wrap';
          textEl.style.overflowY = 'auto';
          textEl.style.maxHeight = '120px';
          textEl.style.textOverflow = 'clip';
          textEl.style.maxWidth = 'none';
          
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
      showToast(language.reminderTaskCompleted);
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

(function () {
  injectDynamicTheme();
  // Prevent duplicate injections
  if (document.getElementById('chatops-ext-floating-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'chatops-ext-floating-btn';
  btn.title = language.floatingBtnTitle;
  btn.style.cursor = 'pointer';

  const BUBBLE_SVG = `
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:32px; height:32px; display:block;">
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
    e.stopPropagation();
    btn.remove();
  });

  document.body.appendChild(btn);

  // Function to align the floating button under the last team icon
  function alignButtonToSidebar() {
    let defaultLeft = '12px';
    let defaultTop = '240px';
    
    // Find Mattermost team sidebar and center the button under the last team icon (RUN)
    const teamSidebar = document.querySelector('.team-sidebar, #teamSidebar, .team-wrapper, [class*="team-sidebar"]');
    if (teamSidebar) {
      const teamItems = teamSidebar.querySelectorAll('a, .team-btn, [class*="team-container"], [class*="team-btn"]');
      if (teamItems && teamItems.length > 0) {
        const lastTeam = teamItems[teamItems.length - 1];
        const rect = lastTeam.getBoundingClientRect();
        // Centered horizontally inside the sidebar, and 12px below the last team item
        defaultLeft = `${rect.left + (rect.width - 44) / 2}px`;
        defaultTop = `${rect.bottom + 12}px`;
      }
    }
    
    btn.style.left = defaultLeft;
    btn.style.top = defaultTop;
    btn.style.right = 'auto';
    btn.style.transform = 'none';
  }

  async function updateFloatingBadgeCount() {
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

  btn.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TOGGLE_SIDE_PANEL });
    } catch (err) {
      if (err.message.includes('Extension context invalidated')) {
        alert(language.extensionUpdated);
      }
    }
  });

  console.log('[ChatOps Ext] Floating button injected.');

  // --- Image Integration into Main Chat UI ---
  function injectImageButton() {
    const emojiBtn = document.getElementById(SELECTORS.EMOJI_BUTTON.slice(1));
    if (!emojiBtn) return;

    const memeEnabled = cachedSettings.memeEnabled !== false;
    const existingBtn = document.getElementById('chatops-ext-image-btn');
    if (!memeEnabled) {
      if (existingBtn) existingBtn.remove();
      return;
    }

    if (existingBtn) return;

    const imageBtn = document.createElement('button');
    imageBtn.id = 'chatops-ext-image-btn';
    imageBtn.type = 'button';
    imageBtn.innerHTML = '🖼️';
    imageBtn.title = 'Quick Image Picker';
    emojiBtn.parentNode.insertBefore(imageBtn, emojiBtn.nextSibling);

    imageBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleImagePickerUI(imageBtn);
    });
  }

  let imagePickerEl = null;

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

  async function loadCustomImages() {
    const res = await chrome.storage.local.get(['custom_memes']);
    const customMemes = res.custom_memes || [];
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
      container.innerHTML = `<span style="font-size:11.5px; color:#999; text-align:center; width:100%; display:block; padding: 24px 0; grid-column: 1 / -1;">${language.noCustomImages || 'No custom images yet'}</span>`;
      return;
    }

    container.innerHTML = customMemes.map((url, idx) => `
      <div class="chatops-custom-image-cell">
        <img src="${url}" class="chatops-custom-image-item" loading="lazy" title="${language.clickToSend || 'Click to send'}" />
        <button class="chatops-custom-image-delete" data-idx="${idx}" title="${language.deleteImage || 'Delete image'}">&times;</button>
      </div>
    `).join('');
  }

  // ─── Image Preview (hover/click) ───
  function openImagePreview(src) {
    let overlay = document.getElementById('chatops-image-preview-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'chatops-image-preview-overlay';
      overlay.className = 'chatops-image-preview-overlay';
      overlay.innerHTML = `<img id="chatops-image-preview-img" src="" alt="preview" />`;
      overlay.addEventListener('click', () => overlay.classList.add('hidden'));
      document.body.appendChild(overlay);
    }
    overlay.querySelector('#chatops-image-preview-img').src = src;
    overlay.classList.remove('hidden');
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

        if (files.length > 10) {
          alert(language.maxUploadLimitError || 'You can only upload up to 10 images at once.');
        }

        const filesToProcess = files.slice(0, 10);
        
        // Process all images in parallel
        const compressionPromises = filesToProcess.map(file => {
          return new Promise((resolve) => {
            compressImage(file, 1000, 1000, 0.9, (dataUrl) => {
              resolve(dataUrl);
            });
          });
        });

        const dataUrls = await Promise.all(compressionPromises);
        const validUrls = dataUrls.filter(Boolean);

        if (validUrls.length > 0) {
          const res = await chrome.storage.local.get(['custom_memes']);
          const customMemes = res.custom_memes || [];
          
          let totalBytes = 0;
          customMemes.forEach(url => {
            totalBytes += getBase64Size(url);
          });
          
          let newBytes = 0;
          validUrls.forEach(url => {
            newBytes += getBase64Size(url);
          });
          
          if (totalBytes + newBytes > 10 * 1024 * 1024) {
            alert(language.storageLimitExceeded || 'Storage limit reached (10 MB). Please delete some images before uploading.');
            fileInput.value = '';
            return;
          }
          
          customMemes.unshift(...validUrls);
          await chrome.storage.local.set({ custom_memes: customMemes });
          loadCustomImages();
        }
        
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
    }
  }

  function toggleImagePickerUI(anchorBtn) {
    if (!imagePickerEl) {
      imagePickerEl = document.createElement('div');
      imagePickerEl.className = 'chatops-image-picker hidden';
      imagePickerEl.innerHTML = `
        <div class="chatops-image-picker-header">
          <span>${language.imageLibrary}</span>
          <button type="button" id="chatops-image-close" class="chatops-image-close-btn">✕</button>
        </div>
        <div class="chatops-image-upload-area">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <div style="display:flex; flex-direction:column; line-height: 1.2;">
              <span id="chatops-your-images-header" style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.5px;">${language.yourImages || 'Your images'}</span>
              <span id="chatops-your-images-size" style="font-size:10px; color:#888; margin-top:2px;">(0 KB / 10 MB)</span>
            </div>
            <label for="chatops-image-upload-input" class="chatops-image-upload-btn">
              ${language.uploadImageBtn || '+ Upload image'}
            </label>
            <input type="file" id="chatops-image-upload-input" accept="image/*" style="display:none;" multiple />
          </div>
          <div id="chatops-custom-images-grid" class="chatops-custom-images-grid-container">
            <span class="chatops-image-empty">${language.noImagesHint || 'No images yet. Click "Upload image" to add!'}</span>
          </div>
        </div>
      `;
      document.body.appendChild(imagePickerEl);
      document.getElementById('chatops-image-close').addEventListener('click', () => {
        imagePickerEl.classList.add('hidden');
      });
      loadCustomImages();
      registerCustomImageEvents();
    }

    const isHidden = imagePickerEl.classList.contains('hidden');
    if (isHidden) {
      loadCustomImages();
      const rect = anchorBtn.getBoundingClientRect();
      imagePickerEl.style.bottom = `${window.innerHeight - rect.top + 10}px`;
      imagePickerEl.style.left = `${Math.max(10, rect.left - 260)}px`;
      imagePickerEl.classList.remove('hidden');
    } else {
      imagePickerEl.classList.add('hidden');
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
    const textarea = document.getElementById(SELECTORS.CHAT_TEXTBOX.slice(1));
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
          style="width: 100%; height: 34px; font-size: 12.5px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #1a1a1c; cursor: pointer; outline: none; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; font-weight: 500; transition: all 0.2s ease; box-sizing: border-box;">
          <span class="custom-dropdown-selected-text">${initialText}</span>
          <span class="custom-dropdown-arrow" style="font-size: 9px; opacity: 0.6; transition: transform 0.2s ease;">▼</span>
        </button>
        <ul class="custom-dropdown-menu"
          style="position: absolute; top: 100%; right: 0; margin-top: 6px; width: 100%; min-width: 120px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); padding: 4px 0; list-style: none; display: none; z-index: 1000000; max-height: 220px; overflow-y: auto; box-sizing: border-box;">
          ${options.map(opt => `
            <li class="custom-dropdown-item" data-value="${opt.value}" style="padding: 6px 12px; font-size: 12.5px; color: #1a1a1c; cursor: pointer; transition: all 0.2s ease; text-align: left; list-style: none; margin: 0;">${opt.textContent}</li>
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

  function getOrCreatePopover() {
    if (quickNotePopover) return quickNotePopover;

    quickNoteBackdrop = document.createElement('div');
    quickNoteBackdrop.id = 'chatops-quick-note-backdrop';
    document.body.appendChild(quickNoteBackdrop);

    quickNotePopover = document.createElement('div');
    quickNotePopover.id = 'chatops-quick-note-popover';
    quickNotePopover.innerHTML = `
      <div class="sp-modal-header" style="border-top-left-radius: 11px; border-top-right-radius: 11px; border-bottom: 1px solid #cbd5e1;">
        <h3 class="sp-modal-title cqn-title" style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">ADD NEW TASK</h3>
        <button id="cqn-close" class="sp-modal-close-btn" title="Close">&times;</button>
      </div>
      
      <div class="sp-modal-body" style="padding: 14px 16px; box-sizing: border-box; background: #ffffff; border-bottom-left-radius: 11px; border-bottom-right-radius: 11px;">
        <div class="task-quick-input-row" style="margin-bottom: 12px; width: 100%;">
          <textarea id="cqn-note-text" placeholder="Add new task... (Shift + Enter to save)" class="quick-note-textarea" style="width: 100%; min-height: 110px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>
        
        <div id="cqn-note-section" style="margin-bottom: 12px; width: 100%; display: none;">
          <div style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; margin-bottom:4px;">${language.categoryLabel || 'Category:'}</div>
          <select id="cqn-category" class="custom-select" style="width:100%; height: 34px; font-size: 12.5px; border-radius: 6px; border:1px solid #cbd5e1; background:#fff; outline:none; cursor:pointer; box-sizing: border-box;">
            <option value="general">📁 ${language.categoryGeneral || 'General'}</option>
            <option value="work">📁 ${language.categoryWork || 'Work'}</option>
            <option value="personal">📁 ${language.categoryPersonal || 'Personal'}</option>
            <option value="ideas">📁 ${language.categoryIdeas || 'Ideas'}</option>
          </select>
        </div>

        <div id="cqn-task-section" style="margin-bottom: 12px; width: 100%;">
          <div class="task-reminder-wrapper" style="display:flex; align-items:center; gap:6px; width:100%; box-sizing: border-box;">
            <div class="task-reminder-row" id="cqnReminderRow"
              style="flex:1; background:#fff; padding:0 10px; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer; display:flex; align-items:center; min-width:0; height:34px; box-sizing:border-box;">
              <label class="task-reminder-label" for="cqn-reminder-time"
                style="margin-right:6px; cursor:pointer; display:inline-flex; align-items:center; white-space:nowrap; font-size:12.5px; line-height:1; height:100%; margin-bottom:0;">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"
                  style="margin-right:4px; opacity:0.7; flex-shrink:0; display:inline-block; vertical-align:middle; position:relative; top:-0.5px;">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
                </svg>
                Remind at:
              </label>
              <input type="datetime-local" id="cqn-reminder-time" class="quick-task-datetime"
                style="flex:1; cursor:pointer; background:transparent; border:none; outline:none; font-size:12.5px; width:100%; min-width:0; padding:0; margin:0; display:inline-flex; align-items:center; line-height:1; height:100%; box-shadow:none;">
            </div>

            <select id="cqnReminderSelect" class="custom-select"
              style="width: 115px; height: 34px; font-size: 12.5px; border-radius: 6px; cursor: pointer; outline: none; box-sizing: border-box; flex-shrink: 0; line-height: 1; padding: 0 24px 0 10px;">
              <option value="">Remind in...</option>
              <option value="15">+15m</option>
              <option value="30">+30m</option>
              <option value="60">+1h</option>
              <option value="120">+2h</option>
              <option value="240">+4h</option>
              <option value="360">+6h</option>
              <option value="480">+8h</option>
            </select>
          </div>
          <div class="input-helper" id="cqnSnoozeHintText" style="margin-top: 6px; margin-bottom: 12px;"></div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; width: 100%; border-top: 1px solid #cbd5e1; padding-top: 12px; box-sizing: border-box;">
          <button type="button" id="cqn-cancel" class="btn btn-secondary" style="padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: transparent; height: 36px; color: #475569; display: inline-flex; align-items: center; justify-content: center; margin: 0; box-sizing: border-box;">Cancel</button>
          <button type="button" id="cqn-save-note" class="btn btn-primary" style="padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; background: #1c58d9; color: #fff; border: none; height: 36px; min-width: 90px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(28, 88, 217, 0.2); margin: 0; box-sizing: border-box;">🎯 Add Task</button>
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

    if (reminderRow && timeInput) {
      reminderRow.addEventListener('click', (e) => {
        e.stopPropagation();
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

    // Convert selects to premium custom dropdowns
    const cqnCategorySelect = document.getElementById('cqn-category');
    const cqnReminderSelect = document.getElementById('cqnReminderSelect');

    convertToCustomDropdown(cqnCategorySelect);
    convertToCustomDropdown(cqnReminderSelect, '115px');

    if (cqnReminderSelect && timeInput) {
      cqnReminderSelect.addEventListener('change', () => {
        const val = cqnReminderSelect.value;
        if (!val) {
          timeInput.value = '';
          return;
        }
        const mins = parseInt(val, 10);
        const targetTime = new Date(Date.now() + mins * 60000);
        const tzOffset = targetTime.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(targetTime - tzOffset)).toISOString().slice(0, 16);
        timeInput.value = localISOTime;
      });

      timeInput.addEventListener('input', () => {
        cqnReminderSelect.value = '';
        const customSelect = cqnReminderSelect.nextElementSibling;
        if (customSelect && customSelect.classList.contains('custom-dropdown-container')) {
          const selectedText = customSelect.querySelector('.custom-dropdown-selected');
          if (selectedText) {
            selectedText.textContent = 'Remind in...';
          }
        }
      });
    }

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
        msgTextFull = language.msgPreviewImage || '[Image] Please view directly on ChatOps';
      } else {
        msgTextFull = language.msgPreviewNoText || '[No text content]';
      }
    }
    const postId = postEl.id ? postEl.id.replace(SELECTORS.POST_ID_PREFIX, '') : '';
    
    // Pre-fill the textarea directly
    document.getElementById('cqn-note-text').value = msgTextFull;
    document.getElementById('cqn-reminder-time').value = '';
    document.getElementById('cqn-reminder-time').dispatchEvent(new Event('change'));
    
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
      popover.querySelector('.cqn-title').textContent = language.quickNoteTitle || 'Add Quick Note';
      saveBtn.innerHTML = '📝 Add Note';
    } else {
      if (taskSection) taskSection.style.display = 'block';
      if (noteSection) noteSection.style.display = 'none';
      popover.querySelector('.cqn-title').textContent = language.quickTaskTitle || 'ADD NEW TASK';
      saveBtn.innerHTML = '🎯 Add Task';
      if (hintEl) {
        const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
        const settings = res[STORAGE_KEYS.SETTINGS] || { snoozeMinutes: 5 };
        hintEl.innerHTML = `⏰ Starts at selected time — snoozes every ${settings.snoozeMinutes} mins until completed (<a href="#" class="settings-subtab-link" data-subtab="features-snooze" style="color:var(--chatops-accent); font-weight:700; text-decoration:underline;">change in Settings</a>)`;
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
    showToast(mode === 'note' ? (language.quickNoteSaveSuccess || 'Note saved successfully') : language.quickTaskSaveSuccess);
  }

  let cachedSettings = { spamEnabled: true, memeEnabled: true, showTabs: { search: true, tasks: true, notes: true, missed: true } };

  // Fetch initial settings
  chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (res) => {
    if (res[STORAGE_KEYS.SETTINGS]) {
      cachedSettings = res[STORAGE_KEYS.SETTINGS];
      handleQuickActionButtonsVisibility();
    }
  });

  // Listen to settings and custom image changes reactively
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes[STORAGE_KEYS.SETTINGS]) {
        cachedSettings = changes[STORAGE_KEYS.SETTINGS].newValue || { spamEnabled: true, showTabs: { search: true, tasks: true, notes: true, missed: true } };
        handleQuickActionButtonsVisibility();
        injectDynamicTheme();
      }
      if (changes.custom_memes) {
        loadCustomImages();
      }
      if (changes[STORAGE_KEYS.MEMOS]) {
        updateFloatingBadgeCount();
      }
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
    injectImageButton();
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
          taskBtn.title = language.quickTaskCreate || 'Create Task';
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
          noteBtn.title = language.quickNoteCreate || 'Add Quick Note';
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
          spamBtn.title = language.spamReactionsTitle || 'Spam Reactions';
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
                showToast(language.spamSuccess || 'Spam reactions added successfully! 🔥');
              } else {
                showToast((language.spamErrorPrefix || 'Spam reactions error: ') + (res?.error || 'Unknown'));
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
          retractBtn.title = language.undoSpamTitle || 'Undo Spam Reactions';
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
                showToast(language.undoSpamSuccess || 'Spam reactions removed successfully! ↩️');
              } else {
                showToast((language.undoSpamErrorPrefix || 'Undo reactions error: ') + (res?.error || 'Unknown'));
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

  const observer = new MutationObserver(() => { injectImageButton(); injectQuickNoteButtons(); });
  observer.observe(document.body, { childList: true, subtree: true });
  injectImageButton();
  injectQuickNoteButtons();
})();
