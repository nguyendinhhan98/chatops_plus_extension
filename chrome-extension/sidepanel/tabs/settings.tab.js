import { STORAGE_KEYS, CHATOPS_CONFIG } from '../../src/constants.js';
import { language } from '../../src/lang.js';
import { getCustomEmojis, getConfig } from '../../src/api/index.js';

let chatopsUrl = CHATOPS_CONFIG.DEFAULT_URL;
const customEmojiMap = new Map();
let cachedCustomEmojis = []; // Local cache of loaded custom emojis
let customEmojiPage = 0; // Current scroll pagination page index
let hasMoreCustomEmojis = true; // Boolean flag to indicate end of workspace custom emojis
let isLoadingCustomEmojis = false; // Flag to prevent redundant parallel page queries

const STANDARD_EMOJIS = [
  // ─── Smileys & Emotions ───
  { name: 'thumbsup', char: '👍' },
  { name: 'heart', char: '❤️' },
  { name: 'fire', char: '🔥' },
  { name: 'rocket', char: '🚀' },
  { name: 'tada', char: '🎉' },
  { name: 'laughing', char: '😂' },
  { name: 'smile', char: '😄' },
  { name: 'wink', char: '😉' },
  { name: 'heart_eyes', char: '😍' },
  { name: 'kissing_heart', char: '😘' },
  { name: 'sunglasses', char: '😎' },
  { name: 'joy', char: '😂' },
  { name: 'sweat_smile', char: '😅' },
  { name: 'sob', char: '😭' },
  { name: 'scream', char: '😱' },
  { name: 'angry', char: '😠' },
  { name: 'rage', char: '😡' },
  { name: 'thinking', char: '🤔' },
  { name: 'shushing_face', char: '🤫' },
  { name: 'exploding_head', char: '🤯' },
  { name: 'clown_face', char: '🤡' },
  { name: 'smiling_imp', char: '😈' },
  { name: 'poop', char: '💩' },
  
  // ─── Gestures & Body ───
  { name: 'clap', char: '👏' },
  { name: 'raised_hands', char: '🙌' },
  { name: 'open_hands', char: '👐' },
  { name: 'pray', char: '🙏' },
  { name: 'ok_hand', char: '👌' },
  { name: 'punch', char: '👊' },
  { name: 'fist', char: '✊' },
  { name: 'v', char: '✌️' },
  { name: 'point_up', char: '👆' },
  { name: 'point_down', char: '👇' },
  { name: 'point_left', char: '👈' },
  { name: 'point_right', char: '👉' },
  { name: 'wave', char: '👋' },
  { name: 'muscle', char: '💪' },
  { name: 'eyes', char: '👀' },
  { name: 'brain', char: '🧠' },

  // ─── Animals & Nature ───
  { name: 'dog', char: '🐶' },
  { name: 'cat', char: '🐱' },
  { name: 'mouse', char: '🐭' },
  { name: 'fox_face', char: '🦊' },
  { name: 'bear', char: '🐻' },
  { name: 'panda_face', char: '🐼' },
  { name: 'koala', char: '🐨' },
  { name: 'tiger', char: '🐯' },
  { name: 'lion', char: '🦁' },
  { name: 'cow', char: '🐮' },
  { name: 'pig', char: '🐷' },
  { name: 'monkey_face', char: '🐵' },
  { name: 'chicken', char: '🐔' },
  { name: 'penguin', char: '🐧' },
  { name: 'bird', char: '🐦' },
  { name: 'duck', char: '🦆' },
  { name: 'eagle', char: '🦅' },
  { name: 'owl', char: '🦉' },
  { name: 'bee', char: '🐝' },
  { name: 'bug', char: '🐛' },
  { name: 'butterfly', char: '🦋' },
  { name: 'snail', char: '🐌' },
  { name: 'ladybug', char: '🐞' },
  { name: 'ant', char: '🐜' },
  { name: 'spider', char: '🕷️' },
  { name: 'octopus', char: '🐙' },
  { name: 'squid', char: '🦑' },
  { name: 'crab', char: '🦀' },
  { name: 'tropical_fish', char: '🐠' },
  { name: 'dolphin', char: '🐬' },
  { name: 'whale', char: '🐳' },
  { name: 'shark', char: '🦈' },
  { name: 'crocodile', char: '🐊' },
  { name: 't-rex', char: '🦖' },
  { name: 'unicorn', char: '🦄' },

  // ─── Food & Drink ───
  { name: 'green_apple', char: '🍏' },
  { name: 'apple', char: '🍎' },
  { name: 'tangerine', char: '🍊' },
  { name: 'lemon', char: '🍋' },
  { name: 'banana', char: '🍌' },
  { name: 'watermelon', char: '🍉' },
  { name: 'grapes', char: '🍇' },
  { name: 'strawberry', char: '🍓' },
  { name: 'cherries', char: '🍒' },
  { name: 'peach', char: '🍑' },
  { name: 'pineapple', char: '🍍' },
  { name: 'coconut', char: '🥥' },
  { name: 'kiwi_fruit', char: '🥝' },
  { name: 'tomato', char: '🍅' },
  { name: 'eggplant', char: '🍆' },
  { name: 'avocado', char: '🥑' },
  { name: 'broccoli', char: ' Broccoli ' },
  { name: 'hot_pepper', char: '🌶️' },
  { name: 'corn', char: '🌽' },
  { name: 'carrot', char: '🥕' },
  { name: 'bread', char: '🍞' },
  { name: 'croissant', char: '🥐' },
  { name: 'hamburger', char: '🍔' },
  { name: 'fries', char: '🍟' },
  { name: 'pizza', char: '🍕' },
  { name: 'hotdog', char: '🌭' },
  { name: 'sandwich', char: '🥪' },
  { name: 'taco', char: '🌮' },
  { name: 'sushi', char: '🍣' },
  { name: 'ramen', char: '🍜' },
  { name: 'dumpling', char: '🥟' },
  { name: 'icecream', char: '🍦' },
  { name: 'doughnut', char: '🍩' },
  { name: 'cookie', char: '🍪' },
  { name: 'chocolate_bar', char: '🍫' },
  { name: 'candy', char: '🍬' },
  { name: 'popcorn', char: '🍿' },
  { name: 'mate', char: '🧉' },

  // ─── Hearts & Colors ───
  { name: 'broken_heart', char: '💔' },
  { name: 'sparkling_heart', char: '💖' },
  { name: 'two_hearts', char: '💕' },
  { name: 'blue_heart', char: '💙' },
  { name: 'green_heart', char: '💚' },
  { name: 'yellow_heart', char: '💛' },
  { name: 'purple_heart', char: '💜' },
  { name: 'orange_heart', char: '🧡' },
  { name: 'black_heart', char: '🖤' },
  { name: 'white_heart', char: '🤍' },
  { name: '100', char: '💯' },

  // ─── Celebration & Activities ───
  { name: 'confetti_ball', char: '🎊' },
  { name: 'balloon', char: '🎈' },
  { name: 'gift', char: '🎁' },
  { name: 'sparkles', char: '✨' },
  { name: 'beer', char: '🍺' },
  { name: 'beers', char: '🍻' },
  { name: 'wine_glass', char: '🍷' },
  { name: 'coffee', char: '☕' },
  { name: 'cake', char: '🍰' },
  { name: 'trophy', char: '🏆' },
  { name: 'medal', char: '🏅' },
  { name: 'crown', char: '👑' },
  { name: 'star', char: '⭐' },
  { name: 'sparkler', char: '🎇' },

  // ─── Sports & Travel ───
  { name: 'soccer', char: '⚽' },
  { name: 'basketball', char: '🏀' },
  { name: 'football', char: '🏈' },
  { name: 'baseball', char: '⚾' },
  { name: 'tennis', char: '🎾' },
  { name: 'volleyball', char: '🏐' },
  { name: '8ball', char: '🎱' },
  { name: 'ping_pong', char: '🏓' },
  { name: 'badminton', char: '🏸' },
  { name: 'boxing_glove', char: '🥊' },
  { name: 'bicyclist', char: '🚴' },
  { name: 'runner', char: '🏃' },
  { name: 'yoga', char: '🧘' },
  { name: 'swimmer', char: '🏊' },
  { name: 'airplane', char: '✈️' },
  { name: 'car', char: '🚗' },
  { name: 'bike', char: '🚲' },
  { name: 'world_map', char: '🗺️' },
  { name: 'volcano', char: '🌋' },
  { name: 'tent', char: '⛺' },

  // ─── Office & Technology ───
  { name: 'computer', char: '💻' },
  { name: 'phone', char: '📱' },
  { name: 'bell', char: '🔔' },
  { name: 'bulb', char: '💡' },
  { name: 'moneybag', char: '💰' },
  { name: 'chart_with_upwards_trend', char: '📈' },
  { name: 'calendar', char: '📅' },
  { name: 'clipboard', char: '📋' },
  { name: 'pushpin', char: '📌' },
  { name: 'key', char: '🔑' },
  { name: 'lock', char: '🔒' },
  { name: 'memo', char: '📝' },
  { name: 'book', char: '📖' },
  { name: 'hammer_and_wrench', char: '🛠️' },

  // ─── Nature & Symbols ───
  { name: 'sun', char: '☀️' },
  { name: 'crescent_moon', char: '🌙' },
  { name: 'rainbow', char: '🌈' },
  { name: 'cloud', char: '☁️' },
  { name: 'umbrella', char: '☔' },
  { name: 'snowflake', char: '❄️' },
  { name: 'zap', char: '⚡' },
  { name: 'warning', char: '⚠️' },
  { name: 'no_entry', char: '⛔' },
  { name: 'checkoff-later', char: '✔️' },
  { name: 'x', char: '❌' },
  { name: 'question', char: '❓' },
  { name: 'exclamation', char: '❗' },
  { name: 'arrows_counterclockwise', char: '🔄' },
  { name: 'gem', char: '💎' },
  { name: 'heart_decoration', char: '💟' }
];

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
    missed: true
  },
  memoCategories: ['Chung', 'Công việc', 'Cá nhân', 'Ý tưởng'],
  spamEnabled: true,
  spamEmojis: ['thumbsup', 'heart', 'fire', 'rocket', 'laughing']
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
  document.getElementById('settingShowSearch').checked = settings.showTabs.search !== false;
  document.getElementById('settingShowTasks').checked = settings.showTabs.tasks !== false;
  document.getElementById('settingShowNotes').checked = settings.showTabs.notes !== false;
  document.getElementById('settingShowMissed').checked = settings.showTabs.missed !== false;

  // Apply categories
  renderCategoryList(settings.memoCategories || []);

  // Fetch chatopsUrl
  const config = await getConfig();
  chatopsUrl = config.chatopsUrl || CHATOPS_CONFIG.DEFAULT_URL;

  // Apply spam reactions toggle
  const chkSpamEnabled = document.getElementById('settingSpamEnabled');
  if (chkSpamEnabled) {
    chkSpamEnabled.checked = settings.spamEnabled !== false;
    const configArea = document.getElementById('reactionsConfigArea');
    if (configArea) {
      configArea.style.opacity = chkSpamEnabled.checked ? '1' : '0.5';
      configArea.style.pointerEvents = chkSpamEnabled.checked ? 'auto' : 'none';
    }
  }

  // Pre-load selected, standard grid, and personal memes
  renderSelectedEmojis(settings);
  renderStandardEmojiGrid(settings);
  renderSidepanelMemes();

  applyThemeToDOM(settings);
  applyTabVisibilityToDOM(settings.showTabs);
  
  // Update snooze hint text dynamically
  const snoozeHint = document.getElementById('snoozeHintText');
  if (snoozeHint) {
    snoozeHint.textContent = language.taskReminderHint.replace('{minutes}', settings.snoozeMinutes);
  }
}

function setupEventListeners() {
  const fileInput = document.getElementById('sidepanel-meme-upload');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      compressSidepanelImage(file, 1000, 1000, 0.9, async (dataUrl) => {
        const res = await chrome.storage.local.get(['custom_memes']);
        const customMemes = res.custom_memes || [];
        customMemes.unshift(dataUrl);
        await chrome.storage.local.set({ custom_memes: customMemes });
        fileInput.value = '';
        renderSidepanelMemes();
      });
    });
  }

  const memesGrid = document.getElementById('sidepanel-memes-grid');
  if (memesGrid) {
    memesGrid.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.sidepanel-meme-delete');
      if (delBtn) {
        e.stopPropagation();
        const idx = parseInt(delBtn.dataset.idx, 10);
        const res = await chrome.storage.local.get(['custom_memes']);
        const customMemes = res.custom_memes || [];
        customMemes.splice(idx, 1);
        await chrome.storage.local.set({ custom_memes: customMemes });
        renderSidepanelMemes();
      }
    });
  }

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

  const chkSpamEnabled = document.getElementById('settingSpamEnabled');
  if (chkSpamEnabled) {
    chkSpamEnabled.addEventListener('change', async (e) => {
      await updateSettings({ spamEnabled: e.target.checked });
      showAutoSaveFeedback();
      const configArea = document.getElementById('reactionsConfigArea');
      if (configArea) {
        configArea.style.opacity = e.target.checked ? '1' : '0.5';
        configArea.style.pointerEvents = e.target.checked ? 'auto' : 'none';
      }
    });
  }

  // Dynamic tab toggle saving and sidepanel DOM adjustments
  const bindTabToggle = (checkboxId, key) => {
    const chk = document.getElementById(checkboxId);
    if (chk) {
      chk.addEventListener('change', async (e) => {
        const settings = await getSettings();
        if (!settings.showTabs) settings.showTabs = {};
        settings.showTabs[key] = e.target.checked;
        await updateSettings({ showTabs: settings.showTabs });
        applyTabVisibilityToDOM(settings.showTabs);
        showAutoSaveFeedback();
      });
    }
  };

  bindTabToggle('settingShowSearch', 'search');
  bindTabToggle('settingShowTasks', 'tasks');
  bindTabToggle('settingShowNotes', 'notes');
  bindTabToggle('settingShowMissed', 'missed');

  const btnTabStd = document.getElementById('emojiTabStandard');
  const btnTabCustom = document.getElementById('emojiTabCustom');
  const gridStd = document.getElementById('standardEmojiGrid');
  const gridCustom = document.getElementById('customEmojiGrid');

  if (btnTabStd && btnTabCustom && gridStd && gridCustom) {
    btnTabStd.addEventListener('click', () => {
      btnTabStd.classList.add('active');
      btnTabCustom.classList.remove('active');
      gridStd.style.display = 'grid';
      gridCustom.style.display = 'none';
    });

    btnTabCustom.addEventListener('click', async () => {
      btnTabCustom.classList.add('active');
      btnTabStd.classList.remove('active');
      gridStd.style.display = 'none';
      gridCustom.style.display = 'flex'; // Use flex for column layout of items + loader
      
      // Reset paging states to pull fresh on first activation
      customEmojiPage = 0;
      hasMoreCustomEmojis = true;
      cachedCustomEmojis = [];
      const gridItems = document.getElementById('customEmojiGridItems');
      if (gridItems) gridItems.innerHTML = '';
      
      const settings = await getSettings();
      await loadNextCustomEmojiPage(settings);
    });

    // Infinite scroll listener
    gridCustom.addEventListener('scroll', async () => {
      if (gridCustom.scrollTop + gridCustom.clientHeight >= gridCustom.scrollHeight - 20) {
        const settings = await getSettings();
        await loadNextCustomEmojiPage(settings);
      }
    });
  }

  const searchInput = document.getElementById('emojiSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      const term = e.target.value.trim().toLowerCase();
      const settings = await getSettings();
      renderStandardEmojiGrid(settings, term);
      renderCustomEmojiGrid(settings, term);
    });
  }

  const selectedContainer = document.getElementById('selectedEmojisContainer');
  if (selectedContainer) {
    selectedContainer.addEventListener('click', async (e) => {
      const tag = e.target.closest('.selected-emoji-tag');
      if (tag) {
        const name = tag.dataset.name;
        if (name) {
          await toggleEmojiSelection(name);
        }
      }
    });
  }

  const handleGridClick = async (e) => {
    const btn = e.target.closest('.emoji-btn');
    if (btn) {
      const name = btn.dataset.name;
      if (name) {
        await toggleEmojiSelection(name);
      }
    }
  };

  gridStd?.addEventListener('click', handleGridClick);
  // Grid click target should be the sub-grid items container
  document.getElementById('customEmojiGridItems')?.addEventListener('click', handleGridClick);

  // Dynamic Capturing Image Error Delegation (satisfies Manifest V3 CSP directive 'script-src 'self'')
  gridCustom?.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">❓</text></svg>';
    }
  }, true); // useCapture = true is critical because error events do not bubble

  selectedContainer?.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
      e.target.style.display = 'none';
    }
  }, true); // useCapture = true is critical because error events do not bubble

  const inputCat = document.getElementById('settingNewCategory');
  const btnAddCat = document.getElementById('btnAddCategory');
  const listCat = document.getElementById('settingCategoryList');

  const addCategory = async () => {
    const val = inputCat.value.trim();
    if (!val) return;
    const settings = await getSettings();
    if (!settings.memoCategories) settings.memoCategories = [];
    
    // Check maximum 5 categories
    if (settings.memoCategories.length >= 5) {
      showErrorFeedback("Tối đa chỉ được tạo 5 danh mục!");
      return;
    }
    
    if (!settings.memoCategories.includes(val)) {
      settings.memoCategories.push(val);
      await updateSettings({ memoCategories: settings.memoCategories });
      renderCategoryList(settings.memoCategories);
      showAutoSaveFeedback();
      chrome.runtime.sendMessage({ type: 'MEMO_CATEGORIES_UPDATED' });
    }
    inputCat.value = '';
  };

  if (btnAddCat) btnAddCat.addEventListener('click', addCategory);
  if (inputCat) inputCat.addEventListener('keydown', e => { if (e.key === 'Enter') addCategory(); });

  if (listCat) {
    listCat.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-delete-cat');
      if (btn) {
        const cat = btn.dataset.cat;
        
        // Check if there is active data associated with this category
        const resMemos = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = resMemos[STORAGE_KEYS.MEMOS] || [];
        const hasData = memos.some(m => m.type === 'memo' && (m.category || 'Chung') === cat);
        
        if (hasData) {
          showErrorFeedback(`Danh mục "${cat}" đang chứa dữ liệu ghi chú, không thể xóa!`);
          return;
        }
        
        const settings = await getSettings();
        settings.memoCategories = (settings.memoCategories || []).filter(c => c !== cat);
        await updateSettings({ memoCategories: settings.memoCategories });
        renderCategoryList(settings.memoCategories);
        showAutoSaveFeedback();
        chrome.runtime.sendMessage({ type: 'MEMO_CATEGORIES_UPDATED' });
      }
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
  const fb = document.getElementById('settingsStatus');
  if (fb) {
    fb.style.display = 'block';
    fb.style.color = 'var(--success)';
    fb.style.background = 'rgba(46, 204, 113, 0.1)';
    fb.style.border = '1px solid var(--success)';
    fb.style.borderRadius = 'var(--radius-sm)';
    fb.textContent = 'Đã tự động lưu';
    setTimeout(() => { fb.style.display = 'none'; }, 2000);
  }
}

function showErrorFeedback(message) {
  const fb = document.getElementById('settingsStatus');
  if (fb) {
    fb.style.display = 'block';
    fb.style.color = '#e74c3c';
    fb.style.background = 'rgba(231, 76, 60, 0.1)';
    fb.style.border = '1px solid #e74c3c';
    fb.style.borderRadius = 'var(--radius-sm)';
    fb.textContent = message;
    setTimeout(() => { fb.style.display = 'none'; }, 3000);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
  );
}

/**
 * Renders currently selected emojis in Reactions tab
 */
function renderSelectedEmojis(settings) {
  const container = document.getElementById('selectedEmojisContainer');
  if (!container) return;

  let currentList = settings.spamEmojis || [];
  if (typeof currentList === 'string') {
    currentList = currentList.split(',').map(e => e.trim()).filter(Boolean);
  }

  if (currentList.length === 0) {
    container.innerHTML = `<span style="font-size:12px; color:var(--text-3); font-style:italic;">Chưa chọn biểu cảm nào. Vui lòng chọn bên dưới!</span>`;
    return;
  }

  container.innerHTML = currentList.map(name => {
    const std = STANDARD_EMOJIS.find(s => s.name === name);
    let content = '';
    if (std) {
      content = `<span style="font-size:16px;">${std.char}</span>`;
    } else {
      const customEmojiId = customEmojiMap.get(name);
      if (customEmojiId) {
        content = `<img src="${chatopsUrl}/api/v4/emoji/${customEmojiId}/image" />`;
      } else {
        content = `<span style="font-size:12px; font-weight:600; color:var(--accent);">:${name}:</span>`;
      }
    }

    return `
      <div class="selected-emoji-tag" data-name="${name}" title="Click để xóa">
        ${content}
        <span style="font-size:11px; font-weight:500;">${name}</span>
        <span class="emoji-tag-remove">&times;</span>
      </div>
    `;
  }).join('');
}

/**
 * Renders Standard Emojis Grid
 */
function renderStandardEmojiGrid(settings, filterQuery = '') {
  const grid = document.getElementById('standardEmojiGrid');
  if (!grid) return;

  let currentList = settings.spamEmojis || [];
  if (typeof currentList === 'string') {
    currentList = currentList.split(',').map(e => e.trim()).filter(Boolean);
  }

  // Filter standard emojis locally in memory
  const filtered = STANDARD_EMOJIS.filter(item => item.name.toLowerCase().includes(filterQuery));

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-3); font-size:12px;">Không tìm thấy biểu cảm nào phù hợp.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const active = currentList.includes(item.name);
    return `
      <button type="button" class="emoji-btn ${active ? 'active' : ''}" data-name="${item.name}" title="${item.name}">
        ${item.char}
      </button>
    `;
  }).join('');
}

/**
 * Loads and renders Custom Emojis from Workspace
 */
/**
 * Loads and renders the next page of Custom Emojis from Workspace (Load More / Infinite Scroll)
 */
async function loadNextCustomEmojiPage(settings) {
  if (isLoadingCustomEmojis || !hasMoreCustomEmojis) return;

  isLoadingCustomEmojis = true;
  const loadingEl = document.getElementById('customEmojiLoading');
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    const customEmojis = await getCustomEmojis(customEmojiPage, 100);
    
    if (Array.isArray(customEmojis)) {
      customEmojis.forEach(e => {
        // Only append if it's not already in cachedCustomEmojis to prevent duplicates
        if (!cachedCustomEmojis.some(existing => existing.name === e.name)) {
          cachedCustomEmojis.push(e);
          customEmojiMap.set(e.name, e.id);
        }
      });
      
      if (customEmojis.length < 100) {
        hasMoreCustomEmojis = false;
      }
      
      customEmojiPage++;
    } else {
      hasMoreCustomEmojis = false;
    }

    // Determine current search filter query
    const searchInput = document.getElementById('emojiSearchInput');
    const filterQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    renderCustomEmojiGrid(settings, filterQuery);
  } catch (err) {
    console.error('Failed to load next custom emojis page:', err);
    const gridItems = document.getElementById('customEmojiGridItems');
    if (gridItems && gridItems.children.length === 0) {
      gridItems.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:#e74c3c; font-size:12px;">Không thể kết nối đến ChatOps server hoặc chưa đồng bộ cookie.</div>`;
    }
  } finally {
    isLoadingCustomEmojis = false;
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

/**
 * Renders Custom Emojis Grid inside #customEmojiGridItems
 */
function renderCustomEmojiGrid(settings, filterQuery = '') {
  const gridItems = document.getElementById('customEmojiGridItems');
  if (!gridItems) return;

  let currentList = settings.spamEmojis || [];
  if (typeof currentList === 'string') {
    currentList = currentList.split(',').map(e => e.trim()).filter(Boolean);
  }

  // Filter custom emojis locally in memory
  const filtered = cachedCustomEmojis.filter(item => item.name.toLowerCase().includes(filterQuery));

  if (filtered.length === 0) {
    if (customEmojiPage <= 1) {
      gridItems.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-3); font-size:12px;">Không tìm thấy biểu cảm tự chế nào phù hợp.</div>`;
    }
    return;
  }

  gridItems.innerHTML = filtered.map(item => {
    const active = currentList.includes(item.name);
    const imgSrc = `${chatopsUrl}/api/v4/emoji/${item.id}/image`;
    return `
      <button type="button" class="emoji-btn ${active ? 'active' : ''}" data-name="${item.name}" title="${item.name}">
        <img src="${imgSrc}" loading="lazy" />
      </button>
    `;
  }).join('');
}

/**
 * Toggles an emoji in selected list
 */
async function toggleEmojiSelection(emojiName) {
  const settings = await getSettings();
  let list = settings.spamEmojis || [];
  
  if (!Array.isArray(list)) {
    if (typeof list === 'string') {
      list = list.split(',').map(e => e.trim()).filter(Boolean);
    } else {
      list = [];
    }
  }

  if (list.includes(emojiName)) {
    list = list.filter(name => name !== emojiName);
  } else {
    if (list.length >= 20) {
      showErrorFeedback('Chỉ chọn tối đa 20 biểu cảm thả spam!');
      return;
    }
    list.push(emojiName);
  }

  await updateSettings({ spamEmojis: list });
  showAutoSaveFeedback();

  // Re-render keeping search query intact
  const updatedSettings = await getSettings();
  renderSelectedEmojis(updatedSettings);

  const searchInput = document.getElementById('emojiSearchInput');
  const filterQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

  renderStandardEmojiGrid(updatedSettings, filterQuery);
  renderCustomEmojiGrid(updatedSettings, filterQuery);
}

function renderCategoryList(categories) {
  const listEl = document.getElementById('settingCategoryList');
  if (!listEl) return;
  listEl.innerHTML = categories.map(cat => `
    <li style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg-2); border-radius:4px; border:1px solid var(--border);">
      <span style="font-size:13px; font-weight:500; color:var(--text-1);">${escapeHtml(cat)}</span>
      <button class="btn-delete-cat" data-cat="${escapeHtml(cat)}" title="Xóa" style="background:none; border:none; cursor:pointer; color:#ef4444; display:flex; align-items:center; justify-content:center; padding:4px;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
      </button>
    </li>
  `).join('');

  // Automatically hide the add row if 5 or more categories exist, otherwise show it
  const addRow = document.querySelector('.category-add-row');
  if (addRow) {
    addRow.style.setProperty('display', categories.length >= 5 ? 'none' : 'flex', 'important');
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
    'tasks': 'tasks',
    'notes': 'memo',
    'missed': 'mentions'
  };
  
  // Find first active visible tab
  let firstVisibleTabId = 'tasks';
  for (const [key, tabId] of Object.entries(navMap)) {
    const isVisible = showTabs[key] !== false;
    if (isVisible) {
      firstVisibleTabId = tabId;
      break;
    }
  }

  for (const [key, tabId] of Object.entries(navMap)) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (btn) {
      const isVisible = showTabs[key] !== false;
      btn.style.display = isVisible ? 'flex' : 'none';
      
      // If the currently active tab is hidden, switch to the first visible tab
      if (!isVisible && btn.classList.contains('active')) {
        const fallbackBtn = document.querySelector(`.tab-btn[data-tab="${firstVisibleTabId}"]`);
        if (fallbackBtn) fallbackBtn.click();
      }
    }
  }
}

export async function renderSidepanelMemes() {
  const res = await chrome.storage.local.get(['custom_memes']);
  const customMemes = res.custom_memes || [];
  const container = document.getElementById('sidepanel-memes-grid');
  if (!container) return;

  if (customMemes.length === 0) {
    container.innerHTML = `<span style="font-size:12px; color:var(--text-3); grid-column: 1/-1; text-align: center; margin: auto; padding: 10px;">Chưa có meme tự thêm. Tải lên để sử dụng!</span>`;
    return;
  }

  container.innerHTML = customMemes.map((url, idx) => `
    <div style="position:relative; width: 100%; padding-top: 100%; border-radius: 4px; overflow: hidden; border: 1px solid var(--border); background: var(--bg-1);">
      <img src="${url}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;" />
      <button class="sidepanel-meme-delete" data-idx="${idx}" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; line-height:1; font-weight:bold; z-index: 10;">&times;</button>
    </div>
  `).join('');
}

export function compressSidepanelImage(file, maxWidth, maxHeight, quality, callback) {
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
