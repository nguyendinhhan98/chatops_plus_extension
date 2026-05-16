import { STORAGE_KEYS, CHATOPS_CONFIG } from '../../src/constants.js';
import { language } from '../../src/lang.js';

let _state = null;

const DEFAULT_SETTINGS = {
  snoozeMinutes: 5,
  headerColor: '#1c58d9',
  navColor: '#1153ab',
  accentColor: '#1c58d9',
  showTabs: {
    search: true,
    tasks: true, // Always true
    notes: true,
    missed: true,
    leave: true
  },
  memoCategories: ['Chung', 'Công việc', 'Cá nhân', 'Ý tưởng']
};

/**
 * Initializes the Settings Tab
 * @param {Object} state - Centralized state module
 */
export async function setup(state) {
  _state = state;
  await loadAndApplySettings();
  setupEventListeners();
}

export async function getSettings() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  return { ...DEFAULT_SETTINGS, ...res[STORAGE_KEYS.SETTINGS] };
}

async function loadAndApplySettings() {
  const settings = await getSettings();

  // Apply inputs
  document.getElementById('settingSnoozeMinutes').value = settings.snoozeMinutes;
  
  // Apply colors to pickers
  const colorKeys = ['headerColor', 'navColor', 'accentColor'];
  colorKeys.forEach(key => {
    const row = document.querySelector(`.color-presets-row[data-key="${key}"]`);
    if (row) {
      row.querySelectorAll('.color-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === settings[key]);
      });
    }
  });
  
  // Apply toggles
  document.getElementById('settingShowSearch').checked = settings.showTabs.search;
  document.getElementById('settingShowNotes').checked = settings.showTabs.notes;
  document.getElementById('settingShowMissed').checked = settings.showTabs.missed;
  document.getElementById('settingShowLeave').checked = settings.showTabs.leave;

  // Apply categories
  const categoriesTextarea = document.getElementById('settingMemoCategories');
  if (categoriesTextarea) {
    categoriesTextarea.value = (settings.memoCategories || []).join('\n');
  }

  applyThemeToDOM(settings);
  applyTabVisibilityToDOM(settings.showTabs);
  
  // Update snooze hint text dynamically
  const snoozeHint = document.getElementById('snoozeHintText');
  if (snoozeHint) {
    snoozeHint.textContent = language.taskReminderHint.replace('{minutes}', settings.snoozeMinutes);
  }
}

function setupEventListeners() {
  const snoozeInput = document.getElementById('settingSnoozeMinutes');
  snoozeInput.addEventListener('change', async (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    e.target.value = val;
    await updateSettings({ snoozeMinutes: val });
    
    const snoozeHint = document.getElementById('snoozeHintText');
    if (snoozeHint) {
      snoozeHint.textContent = language.taskReminderHint.replace('{minutes}', val);
    }
    showAutoSaveFeedback();
  });

  document.querySelectorAll('.color-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.color-presets-row');
      const color = e.target.dataset.color;
      if (row) {
        row.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Auto-save structural color
        const newSettings = {
          headerColor: document.querySelector('.color-presets-row[data-key="headerColor"] .color-preset.active')?.dataset.color,
          navColor: document.querySelector('.color-presets-row[data-key="navColor"] .color-preset.active')?.dataset.color,
          accentColor: document.querySelector('.color-presets-row[data-key="accentColor"] .color-preset.active')?.dataset.color
        };
        updateSettings(newSettings);
        applyThemeToDOM(newSettings);
        showAutoSaveFeedback();
      }
    });
  });

  document.querySelectorAll('.settings-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const settings = await getSettings();
      settings.showTabs[e.target.id.replace('settingShow', '').toLowerCase()] = e.target.checked;
      await updateSettings(settings);
      applyTabVisibilityToDOM(settings.showTabs);
      showAutoSaveFeedback();
    });
  });

  const categoriesTextarea = document.getElementById('settingMemoCategories');
  if (categoriesTextarea) {
    categoriesTextarea.addEventListener('change', async (e) => {
      const lines = e.target.value.split('\n').map(l => l.trim()).filter(l => l !== '');
      await updateSettings({ memoCategories: lines });
      showAutoSaveFeedback();
      
      // Update memo tab if active
      chrome.runtime.sendMessage({ type: 'MEMO_CATEGORIES_UPDATED' });
    });
  }

  // Settings sub-tabs
  document.getElementById('settingsSubTabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('memo-sub-tab')) {
      const sectionId = e.target.dataset.section;
      if (!sectionId) return;

      // Update tabs
      document.querySelectorAll('#settingsSubTabs .memo-sub-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      // Update panels
      document.querySelectorAll('.settings-tab-panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });
      const targetPanel = document.getElementById(`settings-section-${sectionId}`);
      if (targetPanel) {
        targetPanel.style.display = 'block';
        targetPanel.classList.add('active');
      }
    }
  });
}

function showAutoSaveFeedback() {
  const status = document.getElementById('settingsStatus');
  if (status) {
    status.style.display = 'block';
    status.textContent = 'Đã tự động lưu';
    setTimeout(() => {
      status.style.display = 'none';
    }, 1500);
  }
}

async function updateSettings(partial) {
  const settings = await getSettings();
  const newSettings = { ...settings, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: newSettings });
}

export function applyThemeToDOM(settings) {
  const root = document.documentElement;
  
  // Header Block
  root.style.setProperty('--header-bg', settings.headerColor || '#1c58d9');
  
  // Nav Block
  root.style.setProperty('--nav-bg', settings.navColor || '#1153ab');
  
  // Accent Block (Primary color for buttons, etc)
  root.style.setProperty('--accent', settings.accentColor || '#1c58d9');
}

export function applyTabVisibilityToDOM(showTabs) {
  const navMap = {
    'search': 'search',
    'notes': 'memo',
    'missed': 'mentions',
    'leave': 'leave'
  };
  
  for (const [key, tabId] of Object.entries(navMap)) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (btn) {
      btn.style.display = showTabs[key] ? 'flex' : 'none';
      
      // If the currently active tab is hidden, switch to tasks
      if (!showTabs[key] && btn.classList.contains('active')) {
        const taskBtn = document.querySelector(`.tab-btn[data-tab="tasks"]`);
        if (taskBtn) taskBtn.click();
      }
    }
  }
}
