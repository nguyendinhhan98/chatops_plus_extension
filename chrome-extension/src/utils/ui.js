/**
 * UI Helper Utilities — Chrome Extension
 */

/**
 * Hiển thị toast notification
 * @param {string} message
 * @param {number} [duration=2500]
 */
export function showToast(message, duration = 2500) {
  // Tránh tạo nhiều toast cùng lúc
  const existing = document.querySelector('.chatops-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'chatops-toast';
  toast.textContent = message;
  
  // Style properties (matched with current implementation)
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    bottom: 'auto',
    left: 'auto',
    transform: 'translateX(120%)',
    zIndex: '10001'
  });
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.classList.add('visible');
  }, 10);
  
  // Auto remove
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Render loading state vào element
 * @param {HTMLElement} el 
 * @param {string} message 
 */
export function showLoading(el, message = 'Đang tải...') {
  if (!el) return;
  el.innerHTML = `<div class="loading-state"><span class="spinner"></span> ${message}</div>`;
}

/**
 * Render error state vào element
 * @param {HTMLElement} el 
 * @param {string} message 
 */
export function showError(el, message) {
  if (!el) return;
  el.innerHTML = `<div class="empty-state error" style="color:var(--error)">❌ ${message}</div>`;
}

/**
 * Render empty state vào element
 * @param {HTMLElement} el 
 * @param {string} message 
 */
export function showEmpty(el, message) {
  if (!el) return;
  el.innerHTML = `<div class="empty-state">${message}</div>`;
}
