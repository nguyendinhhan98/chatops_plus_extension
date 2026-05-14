/**
 * Content Script cho trang chat.runsystem.vn
 * Nhúng một floating button để mở nhanh ChatOps Extension Side Panel.
 */

// ─── Lắng nghe thông báo nhắc nhở từ Background ───
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_REMINDER') {
    showReminderBanner(message.message, message.taskId, message.isTask);
  }
});

function showReminderBanner(text, taskId, isTask = false) {
  document.querySelectorAll('.chatops-reminder-banner').forEach(el => el.remove());

  const banner = document.createElement('div');
  banner.className = 'chatops-reminder-banner';
  banner.innerHTML = `
    <div class="crb-inner">
      <div class="crb-icon">${isTask ? '📋' : '⏰'}</div>
      <div class="crb-content">
        <div class="crb-title">${isTask ? 'Task chưa hoàn thành' : 'Nhắc nhở từ ChatOps Helper'}</div>
        <div class="crb-text">${text.replace(/</g, '&lt;')}</div>
      </div>
      <button class="crb-close" title="Đóng">×</button>
    </div>
    ${isTask ? `
      <div class="crb-task-actions">
        <button class="crb-done-btn" data-task-id="${taskId}">✅ Đã xong — Dừng nhắc</button>
      </div>
    ` : ''}
    <div class="crb-progress"></div>
  `;
  document.body.appendChild(banner);

  const DURATION = isTask ? 20000 : 15000;
  const progressEl = banner.querySelector('.crb-progress');
  progressEl.style.animationDuration = `${DURATION}ms`;

  setTimeout(() => banner.classList.add('visible'), 10);

  const closeTimer = setTimeout(() => {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  }, DURATION);

  banner.querySelector('.crb-close').addEventListener('click', () => {
    clearTimeout(closeTimer);
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  });

  if (isTask && taskId) {
    banner.querySelector('.crb-done-btn').addEventListener('click', () => {
      clearTimeout(closeTimer);
      chrome.runtime.sendMessage({ type: 'MARK_TASK_DONE', taskId });
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
      showToast('✅ Task hoàn thành!');
    });
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'chatops-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('visible'), 10);
  setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

(function () {
  // Tránh tạo nhiều nút nếu script chạy nhiều lần
  if (document.getElementById('chatops-ext-floating-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'chatops-ext-floating-btn';
  btn.title = 'Mở ChatOps Helper';
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

  // Thêm nút X nhỏ để tắt hẳn floating button nếu cần
  const closeIconBtn = document.createElement('div');
  closeIconBtn.id = 'chatops-ext-close-btn';
  closeIconBtn.innerHTML = '×';
  closeIconBtn.title = 'Ẩn nút này';
  btn.appendChild(closeIconBtn);

  closeIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.remove(); // Xóa hẳn khỏi DOM trang hiện tại
  });

  // Thêm vào body
  document.body.appendChild(btn);

  // Restore position from chrome.storage
  chrome.storage.local.get(['chatops_ext_btn_pos'], (result) => {
    const pos = result.chatops_ext_btn_pos;
    if (pos) {
      btn.style.top = pos.top;
      btn.style.left = pos.left;
      btn.style.right = 'auto';
      btn.style.transform = 'none';
    }
  });

  // Drag logic
  let isDragging = false;
  let hasMoved = false;
  let startX, startY, initialX, initialY;

  btn.addEventListener('mousedown', (e) => {
    // Only handle left click
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
          chatops_ext_btn_pos: {
            top: btn.style.top,
            left: btn.style.left
          }
        });
      }
      
      // Delay reset hasMoved so click event can check it
      setTimeout(() => { hasMoved = false; }, 50);
    }
  });

  // Xử lý sự kiện click
  btn.addEventListener('click', (e) => {
    if (hasMoved) {
      e.preventDefault();
      return;
    }
    
    // Gửi message tới background script để toggle Side Panel
    try {
      chrome.runtime.sendMessage({ type: 'TOGGLE_SIDE_PANEL' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[ChatOps Ext] Error toggling side panel:', chrome.runtime.lastError.message);
        }
      });
    } catch (err) {
      if (err.message.includes('Extension context invalidated')) {
        alert('Trợ lý ChatOps vừa được cập nhật bản mới! Vui lòng ấn F5 tải lại trang để tiếp tục sử dụng.');
      }
    }
  });

  console.log('[ChatOps Ext] Floating button injected.');

  // ─── Meme Integration into Main UI ───

  function injectMemeButton() {
    const emojiBtn = document.getElementById('emojiPickerButton');
    if (!emojiBtn || document.getElementById('chatops-ext-meme-btn')) return;

    const memeBtn = document.createElement('button');
    memeBtn.id = 'chatops-ext-meme-btn';
    memeBtn.type = 'button';
    memeBtn.innerHTML = '🖼️';
    memeBtn.title = 'Chèn Meme nhanh';
    
    // Chèn sau nút Emoji
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
          <span>😂 Kho Memes</span>
          <button type="button" id="chatops-meme-close" style="background:none; border:none; cursor:pointer;">✖</button>
        </div>
        <div id="chatops-meme-grid" class="chatops-meme-picker-grid">
          <div style="grid-column: 1/-1; text-align:center; padding: 20px;">Đang tải...</div>
        </div>
      `;
      document.body.appendChild(memePickerEl);

      document.getElementById('chatops-meme-close').addEventListener('click', () => {
        memePickerEl.classList.add('hidden');
      });

      // Event delegation for grid
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
      // Position it above the anchor button
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
      
      grid.innerHTML = allMemes.slice(0, 60).map(m => `
        <img src="${m.url}" class="chatops-meme-item" loading="lazy" />
      `).join('');
    } catch (err) {
      grid.innerHTML = '<div style="grid-column: 1/-1; padding:20px; color:red;">Lỗi tải memes.</div>';
    }
  }

  function insertMemeToChat(url) {
    const textarea = document.getElementById('post_textbox');
    if (!textarea) {
      console.warn('[ChatOps Ext] Không tìm thấy ô nhập liệu #post_textbox');
      return;
    }

    const markdown = `![meme](${url})`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + markdown + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
    
    // Trigger input event for React/Mattermost to detect change
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ─── Quick Note/Task on Messages ───

  let quickNotePopover = null;
  let currentPopoverMode = 'task'; // 'task' | 'note'

  function getOrCreatePopover() {
    if (quickNotePopover) return quickNotePopover;

    quickNotePopover = document.createElement('div');
    quickNotePopover.id = 'chatops-quick-note-popover';
    quickNotePopover.innerHTML = `
      <div class="cqn-header">
        <span>📌 ChatOps Helper</span>
        <button id="cqn-close" title="Đóng">×</button>
      </div>
      <div id="cqn-msg-preview" class="cqn-preview"></div>

      <div class="cqn-mode-tabs">
        <button class="cqn-mode-btn active" data-mode="task">📋 Task</button>
        <button class="cqn-mode-btn" data-mode="note">📝 Ghi chú</button>
      </div>

      <textarea id="cqn-note-text" placeholder="Ghi chú thêm (tùy chọn)..."></textarea>

      <div id="cqn-task-section">
        <div class="cqn-reminder-row">
          <label for="cqn-reminder-time">⏰ Nhắc từ:</label>
          <input type="datetime-local" id="cqn-reminder-time">
        </div>
        <div class="cqn-task-hint">Nhắc lại mỗi 5 phút cho đến khi hoàn thành ✅</div>
      </div>

      <div class="cqn-actions">
        <button id="cqn-save-note" class="cqn-btn cqn-btn-primary">💾 Lưu</button>
        <button id="cqn-cancel" class="cqn-btn cqn-btn-secondary">Hủy</button>
      </div>
    `;
    document.body.appendChild(quickNotePopover);

    // Mode tabs
    quickNotePopover.querySelectorAll('.cqn-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        quickNotePopover.querySelectorAll('.cqn-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPopoverMode = btn.dataset.mode;
        const taskSection = document.getElementById('cqn-task-section');
        taskSection.style.display = currentPopoverMode === 'task' ? 'block' : 'none';
        const placeholder = currentPopoverMode === 'task'
          ? 'Ghi chú thêm (tùy chọn)...'
          : 'Nội dung ghi chú...';
        document.getElementById('cqn-note-text').placeholder = placeholder;
      });
    });

    document.getElementById('cqn-close').addEventListener('click', closePopover);
    document.getElementById('cqn-cancel').addEventListener('click', closePopover);

    document.addEventListener('mousedown', (e) => {
      if (quickNotePopover && !quickNotePopover.contains(e.target) && !e.target.closest('.chatops-quick-note-btn')) {
        closePopover();
      }
    });

    return quickNotePopover;
  }

  function closePopover() {
    if (quickNotePopover) quickNotePopover.classList.remove('visible');
  }

  function openQuickNote(postEl, anchorBtn) {
    const popover = getOrCreatePopover();

    const msgBodyEl = postEl.querySelector('.post-message__text, .post__body p, [class*="post-message"]');
    const msgText = msgBodyEl ? msgBodyEl.innerText.trim().slice(0, 120) : '(Không lấy được nội dung)';
    const postId = postEl.id ? postEl.id.replace('post_', '') : '';

    document.getElementById('cqn-msg-preview').textContent = msgText + (msgText.length >= 120 ? '...' : '');
    document.getElementById('cqn-note-text').value = '';
    document.getElementById('cqn-reminder-time').value = '';

    // Reset về Task mode
    currentPopoverMode = 'task';
    popover.querySelectorAll('.cqn-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'task'));
    document.getElementById('cqn-task-section').style.display = 'block';

    popover.dataset.postId = postId;
    popover.dataset.postText = msgText;

    // Vị trí popover
    const rect = anchorBtn.getBoundingClientRect();
    const popoverWidth = 310;
    let left = rect.left - popoverWidth - 8;
    if (left < 8) left = rect.right + 8;
    let top = rect.top;
    const maxTop = window.innerHeight - 360;
    if (top > maxTop) top = maxTop;
    if (top < 8) top = 8;

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.classList.add('visible');

    // Gắn handler lưu (cloneNode để tránh duplicate listener)
    const saveBtn = document.getElementById('cqn-save-note');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => saveItem(popover));

    setTimeout(() => document.getElementById('cqn-note-text').focus(), 50);
  }

  async function saveItem(popover) {
    const postId = popover.dataset.postId;
    const postText = popover.dataset.postText;
    const noteText = document.getElementById('cqn-note-text').value.trim();
    const reminderTime = document.getElementById('cqn-reminder-time').value;
    const type = currentPopoverMode; // 'task' | 'note'

    const id = `${type}_` + Date.now();

    const item = {
      id,
      type,
      postId,
      postText,
      note: noteText,
      createdAt: Date.now(),
      // Task fields
      done: false,
      reminder: type === 'task' ? (reminderTime || null) : null,
      status: 'pending'
    };

    // Lưu storage
    const res = await chrome.storage.local.get(['memos']);
    const memos = res.memos || [];
    memos.unshift(item);
    await chrome.storage.local.set({ memos });

    // Gửi tín hiệu để Side Panel cập nhật UI ngay lập tức
    chrome.runtime.sendMessage({ type: 'MEMO_UPDATED' });

    // Nếu là Task → đặt alarm nhắc lặp
    if (type === 'task') {
      const startTime = reminderTime
        ? new Date(reminderTime).getTime()
        : Date.now() + 5 * 60 * 1000; // Ngay sau 5 phút nếu không chọn giờ

      if (startTime > Date.now() || !reminderTime) {
        chrome.runtime.sendMessage({
          type: 'SET_TASK_ALARM',
          taskId: id,
          time: startTime
        });
      }
    }

    closePopover();
    showToast(type === 'task' ? '📋 Đã thêm Task!' : '📝 Đã lưu ghi chú!');
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'chatops-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function injectQuickNoteButtons() {
    // Selector cho từng bài post trong Mattermost
    const posts = document.querySelectorAll(
      '.post:not(.chatops-note-injected), [class*="post_"]:not(.chatops-note-injected)'
    );

    posts.forEach(postEl => {
      // Chỉ inject vào post có id bắt đầu bằng "post_"
      if (!postEl.id || !postEl.id.startsWith('post_')) return;
      postEl.classList.add('chatops-note-injected');

      // Tìm khu vực action bar của Mattermost (hover actions)
      const actionArea = postEl.querySelector(
        '.post__actions, .post-menu, [class*="post-menu"], [aria-label*="actions"], .actions-container'
      );

      if (!actionArea) return;

      // Tạo nút Quick Note
      const noteBtn = document.createElement('button');
      noteBtn.className = 'chatops-quick-note-btn';
      noteBtn.innerHTML = '📌';
      noteBtn.title = 'Quick Note / Nhắc nhở';
      noteBtn.setAttribute('aria-label', 'Ghi chú nhanh');

      noteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openQuickNote(postEl, noteBtn);
      });

      actionArea.appendChild(noteBtn);
    });
  }

  // Monitor for emoji button and new posts
  const observer = new MutationObserver(() => {
    injectMemeButton();
    injectQuickNoteButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Initial check
  injectMemeButton();
  injectQuickNoteButtons();
})();
