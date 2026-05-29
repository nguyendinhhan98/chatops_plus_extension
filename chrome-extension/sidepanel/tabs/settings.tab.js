import { STORAGE_KEYS, CHATOPS_CONFIG, MESSAGE_TYPES, DEFAULT_MEMES } from '../../src/constants.js';
import { language, setLanguage, applyI18n } from '../../src/lang.js';
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
  snoozeMinutes: 30,
  headerColor: '#1c58d9',
  headerTextColor: '#ffffff',
  navColor: '#1153ab',
  tabTextColor: '#ffffff',
  accentColor: '#1c58d9',
  accentTextColor: '#ffffff',
  showTabs: {
    search: true,
    tasks: true, // Always true
    notes: true,
    missed: true,
    reactions: true
  },
  floatingButtons: {
    quickNote: true,
    quickTask: true,
    spamReactions: false,
    reactAlong: true,
    imagePicker: true,
    quickReply: true,
    quickCopy: true
  },
  memoCategories: ['General', 'Work'],
  spamEnabled: true,
  memeEnabled: true,
  giphyApiKey: '',
  spamEmojis: ['thumbsup', 'heart', 'fire', 'rocket', 'tada', 'laughing', 'smile', 'wink', 'heart_eyes', 'kissing_heart'],
  autoCleanupDays: 30,
  notificationType: 'in-page',
  appPadding: '12px',
  quickDelete: false,
  soundNotification: false,
  customButtonsPosition: 'before',
  activeReactionGroupId: 0,
  reactionGroups: null,
  reactAlongEnabled: true
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
  const rawSettings = res[STORAGE_KEYS.SETTINGS] || {};
  const settings = { 
    ...DEFAULT_SETTINGS, 
    ...rawSettings,
    showTabs: { ...DEFAULT_SETTINGS.showTabs, ...rawSettings.showTabs },
    floatingButtons: { ...DEFAULT_SETTINGS.floatingButtons, ...rawSettings.floatingButtons }
  };

  if (!settings.reactionGroups) {
    settings.reactionGroups = [
      { id: 0, name: 'Nhóm 1', emojis: Array.isArray(settings.spamEmojis) ? settings.spamEmojis : ['thumbsup', 'heart', 'fire', 'rocket', 'tada'] },
      { id: 1, name: 'Nhóm 2', emojis: ['laughing', 'smile', 'wink', 'heart_eyes', 'kissing_heart'] },
      { id: 2, name: 'Nhóm 3', emojis: [] },
      { id: 3, name: 'Nhóm 4', emojis: [] },
      { id: 4, name: 'Nhóm 5', emojis: [] }
    ];
  }

  // Auto-migrate old Vietnamese default categories to English
  if (settings.memoCategories) {
    const vnToEnMap = {
      'chung': 'General',
      'công việc': 'Work',
      'cá nhân': 'Personal',
      'ý tưởng': 'Ideas'
    };
    let migrated = false;
    const newCategories = settings.memoCategories.map(cat => {
      const lower = cat.trim().toLowerCase();
      if (vnToEnMap[lower]) {
        migrated = true;
        return vnToEnMap[lower];
      }
      return cat;
    });

    if (migrated) {
      settings.memoCategories = newCategories;
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    }
  }

  return settings;
}

async function loadAndApplySettings() {
  const settings = await getSettings();

  // Apply inputs
  document.getElementById('settingSnoozeMinutes').value = settings.snoozeMinutes;

  const giphyApiKeyInput = document.getElementById('settingGiphyApiKey');
  if (giphyApiKeyInput) {
    giphyApiKeyInput.value = settings.giphyApiKey || '';
  }
  
  const autoCleanupSelect = document.getElementById('settingsAutoCleanupDays');
  if (autoCleanupSelect) {
    autoCleanupSelect.value = settings.autoCleanupDays !== undefined ? settings.autoCleanupDays : 30;
  }

  const notificationTypeSelect = document.getElementById('settingNotificationType');
  if (notificationTypeSelect) {
    notificationTypeSelect.value = settings.notificationType || 'both';
  }

  const appPaddingSelect = document.getElementById('settingAppPadding');
  if (appPaddingSelect) {
    appPaddingSelect.value = settings.appPadding || '12px';
  }
  
  // Apply colors to pickers
  const colorKeys = ['headerColor', 'headerTextColor', 'navColor', 'tabTextColor', 'accentColor', 'accentTextColor'];
  colorKeys.forEach(key => {
    const row = document.querySelector(`.color-presets-row[data-key="${key}"]`);
    if (row) {
      let matchedPreset = false;
      const presets = row.querySelectorAll('.color-preset:not(.color-preset-custom-wrapper)');
      presets.forEach(btn => {
        const isMatched = btn.dataset.color === settings[key];
        btn.classList.toggle('active', isMatched);
        if (isMatched) matchedPreset = true;
      });

      const customWrapper = row.querySelector('.color-preset-custom-wrapper');
      if (customWrapper) {
        const customInput = customWrapper.querySelector('.custom-color-picker-input');
        if (!matchedPreset && settings[key]) {
          customWrapper.classList.add('active');
          customWrapper.dataset.color = settings[key];
          customWrapper.style.background = settings[key];
          if (customInput) customInput.value = settings[key];
        } else {
          customWrapper.classList.remove('active');
          customWrapper.dataset.color = '';
          customWrapper.style.background = 'linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet)';
          if (customInput) customInput.value = '#000000';
        }
      }
    }
  });
  
  // Apply toggles
  document.getElementById('settingShowSearch').checked = settings.showTabs.search !== false;
  document.getElementById('settingShowTasks').checked = settings.showTabs.tasks !== false;
  document.getElementById('settingShowNotes').checked = settings.showTabs.notes !== false;
  document.getElementById('settingShowMissed').checked = settings.showTabs.missed !== false;
  
  // Tools parent toggle: on if any sub-tab is enabled
  const toolsAnyOn = (settings.showTabs.search !== false) || (settings.memeEnabled !== false) || (settings.showTabs.reactions !== false) || (settings.showTabs.missed !== false);
  const settingShowToolsEl = document.getElementById('settingShowTools');
  if (settingShowToolsEl) settingShowToolsEl.checked = toolsAnyOn;

  // Reactions sub-toggle
  const settingShowReactionsEl = document.getElementById('settingShowReactions');
  if (settingShowReactionsEl) settingShowReactionsEl.checked = settings.showTabs.reactions !== false;

  // Expand/collapse tools sub-group based on Tools parent state
  const toolsSubGroup = document.getElementById('toolsSubToggles');
  if (toolsSubGroup) {
    if (toolsAnyOn) toolsSubGroup.classList.add('expanded');
    else toolsSubGroup.classList.remove('expanded');
  }

  // Apply floating buttons checkboxes
  document.getElementById('settingFloatingQuickTask').checked = settings.floatingButtons?.quickTask !== false;
  document.getElementById('settingFloatingQuickNote').checked = settings.floatingButtons?.quickNote !== false;
  document.getElementById('settingFloatingSpamReactions').checked = settings.floatingButtons?.spamReactions !== false;
  document.getElementById('settingReactAlongEnabled').checked = settings.floatingButtons?.reactAlong !== false;
  document.getElementById('settingFloatingImagePicker').checked = settings.floatingButtons?.imagePicker !== false;
  document.getElementById('settingFloatingQuickReply').checked = settings.floatingButtons?.quickReply !== false;
  document.getElementById('settingFloatingQuickCopy').checked = settings.floatingButtons?.quickCopy !== false;

  // Sync disabled/dimmed states
  updateFloatingCheckboxesSync(settings);

  // Apply Menu Tabs and Floating Buttons accordions open/close state (default open/true)
  const resAcc = await chrome.storage.local.get(['accordionMenuTabsOpen', 'accordionFloatingButtonsOpen']);
  
  const menuTabsOpen = resAcc.accordionMenuTabsOpen !== false;
  const menuTabsAcc = document.getElementById('accordionMenuTabs');
  if (menuTabsAcc) {
    menuTabsAcc.classList.toggle('open', menuTabsOpen);
  }

  const floatingButtonsOpen = resAcc.accordionFloatingButtonsOpen !== false;
  const floatingButtonsAcc = document.getElementById('accordionFloatingButtons');
  if (floatingButtonsAcc) {
    floatingButtonsAcc.classList.toggle('open', floatingButtonsOpen);
  }

  // Apply categories
  renderCategoryList(settings.memoCategories || []);

  // Fetch chatopsUrl
  const config = await getConfig();
  chatopsUrl = config.chatopsUrl || CHATOPS_CONFIG.DEFAULT_URL;

  // Apply spam reactions configuration area state (always active and interactive)
  const configArea = document.getElementById('reactionsConfigArea');
  if (configArea) {
    configArea.style.opacity = '1';
    configArea.style.pointerEvents = 'auto';
  }

  // Apply personal memes toggle
  const chkMemeEnabled = document.getElementById('settingMemeEnabled');
  if (chkMemeEnabled) {
    chkMemeEnabled.checked = settings.memeEnabled !== false;
    const configArea = document.getElementById('personalMemesConfigArea');
    if (configArea) {
      configArea.style.opacity = '1';
      configArea.style.pointerEvents = 'auto';
    }
  }

  const chkQuickDelete = document.getElementById('settingQuickDelete');
  if (chkQuickDelete) {
    chkQuickDelete.checked = settings.quickDelete === true;
  }

  const chkSoundNotification = document.getElementById('settingSoundNotification');
  if (chkSoundNotification) {
    chkSoundNotification.checked = settings.soundNotification === true;
  }

  const customButtonsPosSelect = document.getElementById('settingCustomButtonsPosition');
  if (customButtonsPosSelect) {
    customButtonsPosSelect.value = settings.customButtonsPosition || 'before';
  }

  // Pre-load selected, standard grid, and personal memes
  renderReactionGroups(settings);
  renderSelectedEmojis(settings);
  renderStandardEmojiGrid(settings);
  renderSidepanelMemes();

  applyThemeToDOM(settings);
  applyTabVisibilityToDOM(settings.showTabs, settings.memeEnabled);
  
  // Update snooze hint text dynamically
  const snoozeHint = document.getElementById('snoozeHintText');
  if (snoozeHint) {
    snoozeHint.innerHTML = language.taskReminderHint.replace('{minutes}', settings.snoozeMinutes);
  }

  // Update cloud sync status
  updateSyncStatusText();

  if (typeof window.convertToCustomDropdown === 'function') {
    window.convertToCustomDropdown('settingsAutoCleanupDays');
    window.convertToCustomDropdown('settingNotificationType', '220px');
    window.convertToCustomDropdown('settingAppPadding', '200px');
    window.convertToCustomDropdown('settingCustomButtonsPosition', '180px');
  }

  // Validate Giphy API Key on load
  if (settings.giphyApiKey) {
    validateGiphyApiKey(settings.giphyApiKey);
  }
}

async function validateGiphyApiKey(key) {
  const statusEl = document.getElementById('settingGiphyApiKeyStatus');
  if (!statusEl) return;

  if (!key) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
    statusEl.removeAttribute('data-i18n');
    return;
  }

  statusEl.setAttribute('data-i18n', 'giphyCheckingKey');
  statusEl.textContent = language.giphyCheckingKey;
  statusEl.style.color = 'var(--text-3)';
  statusEl.style.display = 'block';

  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=1`);
    if (res.ok) {
      statusEl.setAttribute('data-i18n', 'giphyValidKey');
      statusEl.textContent = language.giphyValidKey;
      statusEl.style.color = '#10b981'; // Green
    } else {
      statusEl.setAttribute('data-i18n', 'giphyInvalidKey');
      statusEl.textContent = language.giphyInvalidKey;
      statusEl.style.color = '#ef4444'; // Red
    }
  } catch (err) {
    statusEl.setAttribute('data-i18n', 'giphyConnectionError');
    statusEl.textContent = language.giphyConnectionError;
    statusEl.style.color = '#ef4444'; // Red
  }
}

function setupEventListeners() {
  const fileInput = document.getElementById('sidepanel-meme-upload');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      if (files.length > 5) {
        alert(language.maxUploadLimitError || 'Bạn chỉ có thể tải lên tối đa 5 ảnh cùng lúc.');
        fileInput.value = '';
        return;
      }

      const res = await chrome.storage.local.get(['custom_memes']);
      const customMemes = res.custom_memes || [];

      const getBase64Size = (url) => {
        if (!url) return 0;
        const base64Part = url.split(',')[1];
        if (!base64Part) return url.length;
        const padding = base64Part.endsWith('==') ? 2 : (base64Part.endsWith('=') ? 1 : 0);
        return (base64Part.length * 3 / 4) - padding;
      };

      let totalBytes = 0;
      customMemes.forEach(url => {
        totalBytes += getBase64Size(url);
      });

      let hitLimit = false;

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name}: ${language.uploadOnlyImages}`);
          continue;
        }

        const dataUrl = await new Promise((resolve) => {
          if (file.type === 'image/gif') {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          } else {
            compressSidepanelImage(file, 1000, 1000, 0.9, (compressedUrl) => {
              resolve(compressedUrl);
            });
          }
        });

        if (dataUrl) {
          const newBytes = getBase64Size(dataUrl);
          if (totalBytes + newBytes > 10 * 1024 * 1024) {
            hitLimit = true;
            break;
          }
          totalBytes += newBytes;
          customMemes.unshift(dataUrl);
        }
      }

      if (hitLimit) {
        alert(language.storageLimitExceeded);
      }

      await chrome.storage.local.set({ custom_memes: customMemes });
      fileInput.value = '';
      renderSidepanelMemes();
    });
  }

  const memesGrid = document.getElementById('sidepanel-memes-grid');
  if (memesGrid) {
    memesGrid.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.sidepanel-meme-delete') || e.target.closest('.chatops-custom-image-delete');
      if (delBtn) {
        e.stopPropagation();
        const idx = parseInt(delBtn.dataset.idx, 10);
        const res = await chrome.storage.local.get(['custom_memes']);
        const customMemes = res.custom_memes || [];
        customMemes.splice(idx, 1);
        await chrome.storage.local.set({ custom_memes: customMemes });
        renderSidepanelMemes();
        return;
      }

      // Preview image when clicking the image itself
      const clickedImg = e.target.closest('img');
      if (clickedImg) {
        const modal = document.getElementById('imagePreviewModal');
        const previewImg = document.getElementById('imgPreviewTarget');
        if (modal && previewImg) {
          previewImg.src = clickedImg.src;
          modal.style.display = 'flex';
        }
      }
    });
  }

  // Close image preview modal handlers
  const btnImgPreviewClose = document.getElementById('btnImagePreviewClose');
  const imgPreviewModal = document.getElementById('imagePreviewModal');
  if (btnImgPreviewClose && imgPreviewModal) {
    btnImgPreviewClose.addEventListener('click', () => {
      imgPreviewModal.style.display = 'none';
    });
    imgPreviewModal.addEventListener('click', (e) => {
      if (e.target === imgPreviewModal) {
        imgPreviewModal.style.display = 'none';
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
      snoozeHint.innerHTML = language.taskReminderHint.replace('{minutes}', val);
    }
    showAutoSaveFeedback();
  });

  const giphyApiKeyInput = document.getElementById('settingGiphyApiKey');
  if (giphyApiKeyInput) {
    giphyApiKeyInput.addEventListener('change', async (e) => {
      const val = e.target.value.trim();
      await updateSettings({ giphyApiKey: val });
      showAutoSaveFeedback();
      validateGiphyApiKey(val);
    });
  }

  const notificationTypeSelect = document.getElementById('settingNotificationType');
  if (notificationTypeSelect) {
    notificationTypeSelect.addEventListener('change', async (e) => {
      await updateSettings({ notificationType: e.target.value });
      showAutoSaveFeedback();
    });
  }

  const appPaddingSelect = document.getElementById('settingAppPadding');
  if (appPaddingSelect) {
    appPaddingSelect.addEventListener('change', async (e) => {
      await updateSettings({ appPadding: e.target.value });
      applyThemeToDOM(await getSettings());
      showAutoSaveFeedback();
    });
  }

  const customButtonsPosSelect = document.getElementById('settingCustomButtonsPosition');
  if (customButtonsPosSelect) {
    customButtonsPosSelect.addEventListener('change', async (e) => {
      await updateSettings({ customButtonsPosition: e.target.value });
      showAutoSaveFeedback();
    });
  }

  const btnTestNotification = document.getElementById('btnTestNotification');
  if (btnTestNotification) {
    btnTestNotification.addEventListener('click', () => {
      const typeVal = document.getElementById('settingNotificationType')?.value || 'both';
      chrome.runtime.sendMessage({ 
        type: MESSAGE_TYPES.TEST_NOTIFICATION, 
        notificationType: typeVal 
      }, (response) => {
        if (response && response.ok) {
          if (typeVal === 'in-page') {
            alert(language.testBannerSuccess);
          } else if (typeVal === 'system') {
            alert(language.testSystemSuccess);
          } else {
            alert(language.testBothSuccess);
          }
        } else if (response && !response.ok) {
          alert(language.testErrorPrefix + response.error);
        } else if (!response) {
          alert(language.testBgWorkerError);
        }
      });
    });
  }

  document.querySelectorAll('.color-preset:not(.color-preset-custom-wrapper)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.color-presets-row');
      if (row) {
        row.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Reset the sibling custom color picker wrapper back to original gradient state if a preset was clicked
        const customWrapper = row.querySelector('.color-preset-custom-wrapper');
        if (customWrapper) {
          customWrapper.classList.remove('active');
          customWrapper.dataset.color = '';
          customWrapper.style.background = 'linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet)';
          const customInput = customWrapper.querySelector('.custom-color-picker-input');
          if (customInput) customInput.value = '#000000';
        }
        
        // Auto-save structural color
        const newSettings = {
          headerColor: document.querySelector('.color-presets-row[data-key="headerColor"] .color-preset.active, .color-presets-row[data-key="headerColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          headerTextColor: document.querySelector('.color-presets-row[data-key="headerTextColor"] .color-preset.active, .color-presets-row[data-key="headerTextColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          navColor: document.querySelector('.color-presets-row[data-key="navColor"] .color-preset.active, .color-presets-row[data-key="navColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          tabTextColor: document.querySelector('.color-presets-row[data-key="tabTextColor"] .color-preset.active, .color-presets-row[data-key="tabTextColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          accentColor: document.querySelector('.color-presets-row[data-key="accentColor"] .color-preset.active, .color-presets-row[data-key="accentColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          accentTextColor: document.querySelector('.color-presets-row[data-key="accentTextColor"] .color-preset.active, .color-presets-row[data-key="accentTextColor"] .color-preset-custom-wrapper.active')?.dataset.color
        };
        updateSettings(newSettings);
        applyThemeToDOM(newSettings);
        showAutoSaveFeedback();
      }
    });
  });

  document.querySelectorAll('.custom-color-picker-input').forEach(input => {
    const handleCustomColorChange = async (e) => {
      const color = e.target.value;
      const wrapper = e.target.closest('.color-preset-custom-wrapper');
      const row = e.target.closest('.color-presets-row');
      
      if (wrapper && row) {
        row.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
        wrapper.classList.add('active');
        wrapper.dataset.color = color;
        wrapper.style.background = color;
        
        // Auto-save structural color
        const newSettings = {
          headerColor: document.querySelector('.color-presets-row[data-key="headerColor"] .color-preset.active, .color-presets-row[data-key="headerColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          headerTextColor: document.querySelector('.color-presets-row[data-key="headerTextColor"] .color-preset.active, .color-presets-row[data-key="headerTextColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          navColor: document.querySelector('.color-presets-row[data-key="navColor"] .color-preset.active, .color-presets-row[data-key="navColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          tabTextColor: document.querySelector('.color-presets-row[data-key="tabTextColor"] .color-preset.active, .color-presets-row[data-key="tabTextColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          accentColor: document.querySelector('.color-presets-row[data-key="accentColor"] .color-preset.active, .color-presets-row[data-key="accentColor"] .color-preset-custom-wrapper.active')?.dataset.color,
          accentTextColor: document.querySelector('.color-presets-row[data-key="accentTextColor"] .color-preset.active, .color-presets-row[data-key="accentTextColor"] .color-preset-custom-wrapper.active')?.dataset.color
        };
        await updateSettings(newSettings);
        applyThemeToDOM(newSettings);
        showAutoSaveFeedback();
      }
    };
    input.addEventListener('input', handleCustomColorChange);
    input.addEventListener('change', handleCustomColorChange);
  });



  const chkMemeEnabled = document.getElementById('settingMemeEnabled');
  if (chkMemeEnabled) {
    chkMemeEnabled.addEventListener('change', async (e) => {
      const isChecked = e.target.checked;
      await updateSettings({ memeEnabled: isChecked });
      showAutoSaveFeedback();
      const configArea = document.getElementById('personalMemesConfigArea');
      if (configArea) {
        configArea.style.opacity = '1';
        configArea.style.pointerEvents = 'auto';
      }
      const settings = await getSettings();
      applyTabVisibilityToDOM(settings.showTabs, isChecked);
      updateFloatingCheckboxesSync(settings);
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  const chkQuickDelete = document.getElementById('settingQuickDelete');
  if (chkQuickDelete) {
    chkQuickDelete.addEventListener('change', async (e) => {
      await updateSettings({ quickDelete: e.target.checked });
      showAutoSaveFeedback();
    });
  }

  const chkSoundNotification = document.getElementById('settingSoundNotification');
  if (chkSoundNotification) {
    chkSoundNotification.addEventListener('change', async (e) => {
      await updateSettings({ soundNotification: e.target.checked });
      showAutoSaveFeedback();
    });
  }

  const bindTabToggle = (checkboxId, key) => {
    const chk = document.getElementById(checkboxId);
    if (chk) {
      chk.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        const settings = await getSettings();
        if (!settings.showTabs) settings.showTabs = {};
        if (key === 'meme') {
          await updateSettings({ memeEnabled: isChecked });
          settings.memeEnabled = isChecked;
        } else {
          settings.showTabs[key] = isChecked;
          await updateSettings({ showTabs: settings.showTabs });
        }
        applyTabVisibilityToDOM(settings.showTabs, settings.memeEnabled);
        updateFloatingCheckboxesSync(settings);
        showAutoSaveFeedback();
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      });
    }
  };

  bindTabToggle('settingShowSearch', 'search');
  bindTabToggle('settingShowTasks', 'tasks');
  bindTabToggle('settingShowNotes', 'notes');
  bindTabToggle('settingShowMissed', 'missed');
  bindTabToggle('settingShowReactions', 'reactions');

  // Tools parent toggle — controls sub-group expand/collapse + all child sub-tabs
  const chkShowTools = document.getElementById('settingShowTools');
  if (chkShowTools) {
    chkShowTools.addEventListener('change', async (e) => {
      const isOn = e.target.checked;
      const settings = await getSettings();
      if (!settings.showTabs) settings.showTabs = {};

      // When turning ON: always restore all sub-tabs to true (default)
      // When turning OFF: disable all sub-tabs
      settings.showTabs.search = isOn;
      settings.showTabs.missed = isOn;
      settings.showTabs.reactions = isOn;
      const newMemeEnabled = isOn;

      await updateSettings({ showTabs: settings.showTabs, memeEnabled: newMemeEnabled });
      settings.memeEnabled = newMemeEnabled;

      // Sync child toggles UI
      const subSearch = document.getElementById('settingShowSearch');
      const subMissed = document.getElementById('settingShowMissed');
      const subImages = document.getElementById('settingMemeEnabled');
      const subReactions = document.getElementById('settingShowReactions');
      if (subSearch) subSearch.checked = isOn;
      if (subMissed) subMissed.checked = isOn;
      if (subImages) subImages.checked = isOn;
      if (subReactions) subReactions.checked = isOn;

      // Expand/collapse sub-group
      const toolsSubGroup = document.getElementById('toolsSubToggles');
      if (toolsSubGroup) {
        if (isOn) toolsSubGroup.classList.add('expanded');
        else toolsSubGroup.classList.remove('expanded');
      }

      applyTabVisibilityToDOM(settings.showTabs, newMemeEnabled);
      updateFloatingCheckboxesSync(settings);
      showAutoSaveFeedback();
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  // Floating buttons toggle saving
  const bindFloatingToggle = (checkboxId, key) => {
    const chk = document.getElementById(checkboxId);
    if (chk) {
      chk.addEventListener('change', async (e) => {
        const settings = await getSettings();
        if (!settings.floatingButtons) settings.floatingButtons = {};
        settings.floatingButtons[key] = e.target.checked;
        await updateSettings({ floatingButtons: settings.floatingButtons });
        showAutoSaveFeedback();

        if (key === 'spamReactions') {
          const configArea = document.getElementById('reactionsConfigArea');
          if (configArea) {
            configArea.style.opacity = '1';
            configArea.style.pointerEvents = 'auto';
          }
        }
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      });
    }
  };

  bindFloatingToggle('settingFloatingQuickTask', 'quickTask');
  bindFloatingToggle('settingFloatingQuickNote', 'quickNote');
  bindFloatingToggle('settingFloatingSpamReactions', 'spamReactions');
  bindFloatingToggle('settingReactAlongEnabled', 'reactAlong');
  bindFloatingToggle('settingFloatingImagePicker', 'imagePicker');
  bindFloatingToggle('settingFloatingQuickReply', 'quickReply');
  bindFloatingToggle('settingFloatingQuickCopy', 'quickCopy');

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
      const removeBtn = e.target.closest('.emoji-tag-remove');
      if (removeBtn) {
        const tag = removeBtn.closest('.selected-emoji-tag');
        if (tag) {
          const name = tag.dataset.name;
          if (name) {
            await toggleEmojiSelection(name);
          }
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

  // Reaction groups tab click listener
  const groupsTabs = document.getElementById('reactionGroupsTabs');
  if (groupsTabs) {
    groupsTabs.addEventListener('click', async (e) => {
      const btn = e.target.closest('.memo-sub-tab');
      if (btn) {
        const id = parseInt(btn.dataset.groupId, 10);
        if (!isNaN(id)) {
          const settings = await getSettings();
          await updateSettings({ activeReactionGroupId: id, spamEmojis: settings.reactionGroups[id].emojis || [] });
          const updatedSettings = await getSettings();
          renderReactionGroups(updatedSettings);
          renderSelectedEmojis(updatedSettings);
          renderStandardEmojiGrid(updatedSettings);
          
          const searchInput = document.getElementById('emojiSearchInput');
          const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
          renderCustomEmojiGrid(updatedSettings, term);
        }
      }
    });
  }

  // Reaction group rename listener
  const btnSaveGroupName = document.getElementById('btnSaveReactionGroupName');
  const inputGroupName = document.getElementById('reactionGroupNameInput');
  if (btnSaveGroupName && inputGroupName) {
    btnSaveGroupName.addEventListener('click', async () => {
      const val = inputGroupName.value.trim();
      if (!val) return;
      if (val.length > 10) {
        showErrorFeedback(language.groupNameLengthError || "Group name cannot exceed 10 characters!");
        return;
      }
      
      const settings = await getSettings();
      const activeGroupId = settings.activeReactionGroupId !== undefined ? settings.activeReactionGroupId : 0;
      const groups = settings.reactionGroups || [];
      const activeGroup = groups.find(g => g.id === activeGroupId);
      if (activeGroup) {
        activeGroup.name = val;
        await updateSettings({ reactionGroups: groups });
        showAutoSaveFeedback();
        const updatedSettings = await getSettings();
        renderReactionGroups(updatedSettings);
      }
    });

    // Enter key to rename
    inputGroupName.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        btnSaveGroupName.click();
      }
    });
  }

  const inputCat = document.getElementById('settingNewCategory');
  const btnAddCat = document.getElementById('btnAddCategory');
  const listCat = document.getElementById('settingCategoryList');

  const addCategory = async () => {
    const val = inputCat.value.trim();
    if (!val) return;
    if (val.length > 10) {
      showErrorFeedback("Category name cannot exceed 10 characters!");
      return;
    }
    const settings = await getSettings();
    if (!settings.memoCategories) settings.memoCategories = [];
    
    // Check duplicate case-insensitively
    const isDuplicate = settings.memoCategories.some(cat => cat.toLowerCase() === val.toLowerCase());
    if (isDuplicate) {
      showErrorFeedback("This category already exists!");
      return;
    }

    // Check maximum 5 categories
    if (settings.memoCategories.length >= 5) {
      showErrorFeedback("Maximum of 5 categories allowed!");
      return;
    }
    
    settings.memoCategories.push(val);
    await updateSettings({ memoCategories: settings.memoCategories });
    renderCategoryList(settings.memoCategories);
    showAutoSaveFeedback();
    chrome.runtime.sendMessage({ type: 'MEMO_CATEGORIES_UPDATED' });
    inputCat.value = '';
    const counterEl = document.getElementById('categoryCharCounter');
    if (counterEl) counterEl.textContent = '0/10';
  };

  if (btnAddCat) btnAddCat.addEventListener('click', addCategory);
  if (inputCat) {
    inputCat.addEventListener('keydown', e => { if (e.key === 'Enter') addCategory(); });
    inputCat.addEventListener('input', () => {
      if (inputCat.value.length > 10) {
        inputCat.value = inputCat.value.slice(0, 10);
      }
      const counterEl = document.getElementById('categoryCharCounter');
      if (counterEl) {
        counterEl.textContent = `${inputCat.value.length}/10`;
      }
    });
  }

  if (listCat) {
    listCat.addEventListener('click', async (e) => {
      // Edit button click -> switch to edit mode
      const btnEdit = e.target.closest('.btn-edit-cat');
      if (btnEdit) {
        const li = btnEdit.closest('li');
        const cat = btnEdit.dataset.cat;
        const idx = btnEdit.dataset.idx;
        
        li.innerHTML = `
          <div class="cat-edit-mode" style="display:flex; align-items:center; gap:8px; width:100%;">
            <input type="text" class="edit-cat-input" maxlength="10" value="${escapeHtml(cat)}" style="flex:1; height:28px; font-size:13px; font-weight:600; padding:4px 8px; border-radius:6px; border:1px solid var(--border); outline:none; box-sizing:border-box; background:var(--bg-1); color:var(--text-1);" autocomplete="off">
            <button class="btn-save-cat-edit" data-idx="${idx}" data-old="${escapeHtml(cat)}" title="${language.saveBtn || 'Save'}" style="background:none; border:none; padding:4px 6px; cursor:pointer; color:var(--success); font-size:14px; font-weight:bold; display:inline-flex; align-items:center; justify-content:center;">✓</button>
            <button class="btn-cancel-cat-edit" title="${language.cancel || 'Cancel'}" style="background:none; border:none; padding:4px 6px; cursor:pointer; color:var(--danger); font-size:14px; font-weight:bold; display:inline-flex; align-items:center; justify-content:center;">✗</button>
          </div>
        `;
        
        const input = li.querySelector('.edit-cat-input');
        input.focus();
        input.select();
        
        input.addEventListener('input', () => {
          if (input.value.length > 10) {
            input.value = input.value.slice(0, 10);
          }
        });
        
        input.addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter') {
            li.querySelector('.btn-save-cat-edit').click();
          } else if (evt.key === 'Escape') {
            li.querySelector('.btn-cancel-cat-edit').click();
          }
        });
        return;
      }

      // Cancel edit click
      const btnCancel = e.target.closest('.btn-cancel-cat-edit');
      if (btnCancel) {
        const settings = await getSettings();
        renderCategoryList(settings.memoCategories || []);
        return;
      }

      // Save edit click
      const btnSave = e.target.closest('.btn-save-cat-edit');
      if (btnSave) {
        const idx = parseInt(btnSave.dataset.idx, 10);
        const oldCat = btnSave.dataset.old;
        const li = btnSave.closest('li');
        const input = li.querySelector('.edit-cat-input');
        const newVal = input.value.trim();
        
        if (!newVal) {
          showErrorFeedback("Category name cannot be empty!");
          return;
        }
        if (newVal.length > 10) {
          showErrorFeedback("Category name cannot exceed 10 characters!");
          return;
        }
        
        const settings = await getSettings();
        const categories = settings.memoCategories || [];
        
        // Check duplicate case-insensitively, ignoring current index
        const isDuplicate = categories.some((c, i) => i !== idx && c.toLowerCase() === newVal.toLowerCase());
        if (isDuplicate) {
          showErrorFeedback("This category already exists!");
          return;
        }
        
        categories[idx] = newVal;
        settings.memoCategories = categories;
        await updateSettings({ memoCategories: categories });
        
        // Update category name in existing memos
        const resMemos = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = resMemos[STORAGE_KEYS.MEMOS] || [];
        let memosChanged = false;
        
        memos.forEach(m => {
          if (m.type === 'memo' && (m.category || 'General') === oldCat) {
            m.category = newVal;
            memosChanged = true;
          }
        });
        
        if (memosChanged) {
          await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        }
        
        // If edited category was activeMemoCategory, update it as well
        const activeRes = await chrome.storage.local.get(['activeMemoCategory']);
        if (activeRes.activeMemoCategory === oldCat) {
          await chrome.storage.local.set({ activeMemoCategory: newVal });
        }
        
        renderCategoryList(categories);
        showAutoSaveFeedback();
        chrome.runtime.sendMessage({ type: 'MEMO_CATEGORIES_UPDATED' });
        return;
      }

      const btn = e.target.closest('.btn-delete-cat');
      if (btn) {
        const cat = btn.dataset.cat;
        
        // Check if there is active data associated with this category
        const resMemos = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = resMemos[STORAGE_KEYS.MEMOS] || [];
        const hasData = memos.some(m => m.type === 'memo' && (m.category || 'General') === cat);
        
        if (hasData) {
          showErrorFeedback(`Category "${cat}" contains notes and cannot be deleted!`);
          return;
        }
        
        const settings = await getSettings();
        const categories = settings.memoCategories || [];
        if (categories.length <= 1) {
          showErrorFeedback(language.atLeastOneCategoryRequired || "At least one category must exist!");
          return;
        }
        settings.memoCategories = categories.filter(c => c !== cat);
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
      
      if (window.isRedirectingToSetting) return;

      // Collapse other accordions but restore the Menu Tabs & Floating Buttons accordion states
      document.querySelectorAll('.settings-accordion').forEach(acc => {
        if (acc.id === 'accordionMenuTabs') {
          chrome.storage.local.get(['accordionMenuTabsOpen'], (res) => {
            const isOpen = res.accordionMenuTabsOpen !== false;
            acc.classList.toggle('open', isOpen);
          });
        } else if (acc.id === 'accordionFloatingButtons') {
          chrome.storage.local.get(['accordionFloatingButtonsOpen'], (res) => {
            const isOpen = res.accordionFloatingButtonsOpen !== false;
            acc.classList.toggle('open', isOpen);
          });
        } else {
          acc.classList.remove('open');
        }
        acc.classList.remove('highlighted');
      });
    }
  });

  // Tools sub-tabs
  document.getElementById('toolsSubTabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('memo-sub-tab')) {
      const sectionId = e.target.dataset.section;
      if (!sectionId) return;

      // Update tabs active state
      document.querySelectorAll('#toolsSubTabs .memo-sub-tab').forEach(b => b.classList.toggle('active', b === e.target));

      // Update panels active state
      document.querySelectorAll('#tab-tools .tools-tab-panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });
      const targetPanel = document.getElementById(`tools-section-${sectionId}`);
      if (targetPanel) {
        targetPanel.style.display = 'flex';
        targetPanel.classList.add('active');
      }

      // Initialize content dynamically
      if (sectionId === 'images') {
        fetchGiphyGifs(document.getElementById('gifSearchInput')?.value || '');
        renderSidepanelMemes();
      } else if (sectionId === 'reactions') {
        getSettings().then(settings => {
          renderStandardEmojiGrid(settings);
          renderCustomEmojiGrid(settings, document.getElementById('customEmojiSearchInput')?.value || '');
        });
      }
    }
  });

  // Giphy GIFs Search Debounce
  const gifSearchInput = document.getElementById('gifSearchInput');
  if (gifSearchInput) {
    gifSearchInput.addEventListener('input', (e) => {
      clearTimeout(giphyTimeout);
      giphyTimeout = setTimeout(() => {
        fetchGiphyGifs(e.target.value);
      }, 300);
    });
  }

  // Giphy Grid Interactions
  const giphyGifsGrid = document.getElementById('giphy-gifs-grid');
  if (giphyGifsGrid) {
    giphyGifsGrid.addEventListener('click', async (e) => {
      const sendBtn = e.target.closest('.btn-send');
      if (sendBtn) {
        const url = sendBtn.dataset.url;
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab) {
          chrome.tabs.sendMessage(activeTab.id, { type: 'INSERT_IMAGE_TO_CHAT', url });
        }
        return;
      }

      const previewBtn = e.target.closest('.btn-preview');
      const clickedImg = e.target.closest('img');
      if (previewBtn || (clickedImg && !e.target.closest('.gif-item-btn'))) {
        const url = previewBtn ? previewBtn.dataset.url : e.target.closest('.gif-item').dataset.fullUrl;
        const modal = document.getElementById('imagePreviewModal');
        const previewImg = document.getElementById('imgPreviewTarget');
        if (modal && previewImg) {
          previewImg.src = url;
          modal.style.display = 'flex';
        }
      }
    });
  }

  // Handle click on sub-tabs inside panels (Reactions & Sync)
  document.querySelectorAll('.settings-subtab-bar').forEach(bar => {
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-subtab-btn');
      if (!btn) return;

      const subtabName = btn.dataset.subtab;
      if (!subtabName) return;

      // Deactivate all sibling buttons in this bar
      bar.querySelectorAll('.settings-subtab-btn').forEach(b => {
        b.classList.remove('active');
      });

      // Activate clicked button
      btn.classList.add('active');

      // Find the parent panel (e.g. #settings-section-reactions or #settings-section-sync)
      const panel = bar.closest('.settings-tab-panel') || bar.closest('#tab-reactions');
      if (panel) {
        // Hide all subtab content divs inside this panel
        panel.querySelectorAll('.settings-subtab-content').forEach(content => {
          content.style.display = 'none';
        });

        // Show target subtab content div
        const targetContent = panel.querySelector(`#subtab-content-${subtabName}`);
        if (targetContent) {
          targetContent.style.display = 'block';
        }
      }
    });
  });

  // Global accordion helper to open a specific group by child key/subtab name
  window.openSettingsAccordion = function(subtabName) {
    if (!subtabName) return;
    let elementId = '';
    if (subtabName === 'features-toggle') {
      elementId = 'settingShowSearch';
    } else if (subtabName === 'features-floating') {
      elementId = 'settingFloatingQuickTask';
    } else if (subtabName === 'features-snooze') {
      elementId = 'settingSnoozeMinutes';
    } else if (subtabName === 'features-gif') {
      elementId = 'settingGiphyApiKey';
    } else if (subtabName === 'categories') {
      elementId = 'settingNewCategory';
    }

    if (elementId) {
      const el = document.getElementById(elementId);
      const accordion = el ? el.closest('.settings-accordion') : null;
      if (accordion) {
        // Close all other accordions first (except restoring Menu Tabs & Floating Buttons states)
        document.querySelectorAll('.settings-accordion').forEach(acc => {
          if (acc === accordion) return;
          if (acc.id === 'accordionMenuTabs') {
            chrome.storage.local.get(['accordionMenuTabsOpen'], (res) => {
              const isOpen = res.accordionMenuTabsOpen !== false;
              acc.classList.toggle('open', isOpen);
            });
          } else if (acc.id === 'accordionFloatingButtons') {
            chrome.storage.local.get(['accordionFloatingButtonsOpen'], (res) => {
              const isOpen = res.accordionFloatingButtonsOpen !== false;
              acc.classList.toggle('open', isOpen);
            });
          } else {
            acc.classList.remove('open');
          }
          acc.classList.remove('highlighted');
        });
        // Open and highlight target accordion
        accordion.classList.add('open');
        accordion.classList.add('highlighted');
        
        // Scroll into view
        setTimeout(() => {
          const container = document.getElementById('settingsScrollContainer');
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const accRect = accordion.getBoundingClientRect();
            const relativeTop = accRect.top - containerRect.top + container.scrollTop;
            const targetScrollTop = relativeTop - 12; // 12px margin
            container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          } else {
            accordion.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  };

  // Helper to programmatically navigate to a settings sub-tab
  function navigateToSubtab(subtabName) {
    let sectionId = '';
    if (subtabName.startsWith('features-') || subtabName === 'categories') {
      sectionId = 'features';
    } else if (subtabName.startsWith('reactions-')) {
      sectionId = 'reactions';
    } else if (subtabName.startsWith('sync-')) {
      sectionId = 'sync';
    }

    if (!sectionId) return;

    // 1. Switch top-level Settings Category
    const tabBtn = document.querySelector(`#settingsSubTabs .memo-sub-tab[data-section="${sectionId}"]`);
    if (tabBtn) {
      // Deactivate sibling top-level buttons
      document.querySelectorAll('#settingsSubTabs .memo-sub-tab').forEach(b => b.classList.remove('active'));
      // Activate target top-level button
      tabBtn.classList.add('active');

      // Show target section panel
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

    // 2. Open corresponding accordion if target section is features
    if (sectionId === 'features') {
      window.openSettingsAccordion(subtabName);
    }
  }

  window.navigateToSettingsSubtab = navigateToSubtab;

  // Cloud Sync click listeners
  const btnBackup = document.getElementById('btnSyncCloudBackup');
  const btnRestore = document.getElementById('btnSyncCloudRestore');
  
  if (btnBackup) {
    btnBackup.addEventListener('click', async () => {
      try {
        btnBackup.disabled = true;
        btnBackup.textContent = '⏳ ' + language.backingUp;
        
        // Get memos from local
        const localRes = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
        const memos = localRes[STORAGE_KEYS.MEMOS] || [];
        
        // Fetch all current keys in sync to clean up older sync_memo_ keys
        const allSyncData = await chrome.storage.sync.get(null);
        const oldKeys = Object.keys(allSyncData).filter(k => k.startsWith('sync_memo_') || k === STORAGE_KEYS.MEMOS);
        
        if (oldKeys.length > 0) {
          await chrome.storage.sync.remove(oldKeys);
        }
        
        // Save each memo as an individual key to bypass the 8KB limit per item
        const syncObj = {};
        memos.forEach(m => {
          try {
            if (m && typeof m === 'object' && m.id) {
              syncObj[`sync_memo_${m.id}`] = m;
            }
          } catch (e) {
            console.warn('[ChatOps Ext] Ignoring invalid memo item:', m, e);
          }
        });
        
        if (Object.keys(syncObj).length > 0) {
          await chrome.storage.sync.set(syncObj);
        }
        
        // Save last sync time
        await chrome.storage.local.set({ last_cloud_sync_time: Date.now() });
        
        await updateSyncStatusText();
        showAutoSaveFeedback();
        
        alert(language.backupSuccess);
      } catch (err) {
        console.error('[ChatOps Ext] Cloud backup error:', err);
        alert(language.backupFailed);
      } finally {
        btnBackup.disabled = false;
        btnBackup.textContent = '☁️ ' + language.backupToCloud;
      }
    });
  }
  
  if (btnRestore) {
    btnRestore.addEventListener('click', async () => {
      try {
        const confirmRestore = confirm(language.confirmRestore);
        if (!confirmRestore) return;
        
        btnRestore.disabled = true;
        btnRestore.textContent = '⏳ ' + language.restoring;
        
        // Get all keys from sync
        const allSyncData = await chrome.storage.sync.get(null);
        
        // Support both monolithic old layout and new split-key layout
        let memos = [];
        if (allSyncData[STORAGE_KEYS.MEMOS] && Array.isArray(allSyncData[STORAGE_KEYS.MEMOS])) {
          memos = allSyncData[STORAGE_KEYS.MEMOS];
        } else {
          memos = Object.keys(allSyncData)
            .filter(k => k.startsWith('sync_memo_'))
            .map(k => allSyncData[k]);
        }
        
        // Sort memos by createdAt in descending order (newest first) to maintain consistent order
        memos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        // Save to local
        await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: memos });
        
        // Save sync time
        await chrome.storage.local.set({ last_cloud_sync_time: Date.now() });
        
        await updateSyncStatusText();
        showAutoSaveFeedback();
        
        // Force reload all UI tabs
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MEMO_UPDATED });
        
        alert(language.restoreSuccess);
      } catch (err) {
        console.error('[ChatOps Ext] Cloud restore error:', err);
        alert(language.restoreFailed);
      } finally {
        btnRestore.disabled = false;
        btnRestore.textContent = '🔄 ' + language.restoreFromCloud;
      }
    });
  }

  // Auto-Cleanup settings change listener
  const cleanupSelect = document.getElementById('settingsAutoCleanupDays');
  if (cleanupSelect) {
    cleanupSelect.addEventListener('change', async (e) => {
      const days = parseInt(e.target.value, 10);
      await updateSettings({ autoCleanupDays: days });
      showAutoSaveFeedback();
      
      // Instantly run cleanup if days is changed to a positive number
      if (days > 0) {
        runAutoCleanup();
      }
    });
  }

  // Manual cleanup trigger
  const btnManualCleanup = document.getElementById('btnManualCleanupNow');
  if (btnManualCleanup) {
    btnManualCleanup.addEventListener('click', async () => {
      const confirmCleanup = confirm(language.confirmCleanup);
      if (!confirmCleanup) return;
      
      btnManualCleanup.disabled = true;
      btnManualCleanup.textContent = '⏳ ' + language.cleaningUp;
      
      try {
        const deletedCount = await runAutoCleanupForce();
        await updateStorageUsageDisplay();
        alert(language.cleanupSuccess.replace('{count}', deletedCount));
      } catch (err) {
        console.error('[ChatOps Ext] Manual cleanup error:', err);
        alert(language.cleanupFailed);
      } finally {
        btnManualCleanup.disabled = false;
        btnManualCleanup.textContent = '🧹 ' + language.cleanUpNow;
      }
    });
  }

  // Listen for storage changes to sync custom images reactively
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.custom_memes) {
      renderSidepanelMemes();
    }
  });

  // Accordion Toggle
  document.querySelectorAll('.settings-accordion-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('input, button, a, select')) return;
      const acc = header.parentElement;
      const isOpening = !acc.classList.contains('open');
      
      // Close other accordions first
      if (isOpening) {
        document.querySelectorAll('.settings-accordion').forEach(other => {
          if (other !== acc) {
            other.classList.remove('open');
            other.classList.remove('highlighted');
          }
        });
      }
      
      acc.classList.toggle('open', isOpening);
      if (!isOpening) {
        acc.classList.remove('highlighted');
      } else {
        acc.classList.add('highlighted');
        setTimeout(() => {
          const container = document.getElementById('settingsScrollContainer');
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const accRect = acc.getBoundingClientRect();
            const relativeTop = accRect.top - containerRect.top + container.scrollTop;
            const targetScrollTop = relativeTop - 12; // 12px margin
            container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          } else {
            acc.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 180);
      }

      // Persist accordion open/close states
      if (acc.id === 'accordionMenuTabs') {
        const isOpen = acc.classList.contains('open');
        chrome.storage.local.set({ accordionMenuTabsOpen: isOpen });
      } else if (acc.id === 'accordionFloatingButtons') {
        const isOpen = acc.classList.contains('open');
        chrome.storage.local.set({ accordionFloatingButtonsOpen: isOpen });
      }
    });
  });
}

async function updateSyncStatusText() {
  const syncStatusEl = document.getElementById('syncStatusMessage');
  if (!syncStatusEl) return;
  
  const res = await chrome.storage.local.get(['last_cloud_sync_time']);
  const lastSync = res.last_cloud_sync_time;
  
  if (lastSync) {
    const date = new Date(lastSync);
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timeStr = `${hrs}:${mins} - ${day}/${month}`;
    syncStatusEl.innerHTML = language.lastSyncText.replace('{time}', timeStr);
  } else {
    syncStatusEl.innerHTML = language.neverSyncedText;
  }

  // Update storage usage display
  updateStorageUsageDisplay();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function updateStorageUsageDisplay() {
  const displayEl = document.getElementById('storageUsageDisplay');
  if (!displayEl) return;
  
  try {
    const localBytes = await chrome.storage.local.getBytesInUse(null);
    const syncBytes = await chrome.storage.sync.getBytesInUse(null);
    
    displayEl.innerHTML = language.storageUsageText
      .replace('{local}', formatBytes(localBytes))
      .replace('{sync}', formatBytes(syncBytes));
  } catch (err) {
    console.error('[ChatOps Ext] Failed to get storage usage:', err);
    displayEl.textContent = 'N/A';
  }
}

let autoSaveTimeoutId = null;

function showAutoSaveFeedback() {
  const fb = document.getElementById('settingsStatus');
  if (!fb) return;

  if (autoSaveTimeoutId) {
    clearTimeout(autoSaveTimeoutId);
  }

  fb.style.background = '#10b981';
  fb.style.boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.4), 0 8px 10px -6px rgba(16, 185, 129, 0.4)';
  fb.innerHTML = `
    <span style="font-size: 15px;">✓</span>
    <span>${language.settingsSaved || 'Saved automatically'}</span>
  `;

  fb.style.opacity = '1';
  fb.style.transform = 'translateX(-50%) translateY(0)';

  autoSaveTimeoutId = setTimeout(() => {
    fb.style.opacity = '0';
    fb.style.transform = 'translateX(-50%) translateY(20px)';
    autoSaveTimeoutId = null;
  }, 2000);
}

function showErrorFeedback(message) {
  const fb = document.getElementById('settingsStatus');
  if (!fb) return;

  if (autoSaveTimeoutId) {
    clearTimeout(autoSaveTimeoutId);
  }

  fb.style.background = '#ef4444';
  fb.style.boxShadow = '0 10px 25px -5px rgba(239, 68, 68, 0.4), 0 8px 10px -6px rgba(239, 68, 68, 0.4)';
  fb.innerHTML = `
    <span style="font-size: 15px;">✗</span>
    <span>${escapeHtml(message)}</span>
  `;

  fb.style.opacity = '1';
  fb.style.transform = 'translateX(-50%) translateY(0)';

  autoSaveTimeoutId = setTimeout(() => {
    fb.style.opacity = '0';
    fb.style.transform = 'translateX(-50%) translateY(20px)';
    autoSaveTimeoutId = null;
  }, 3000);
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
function getActiveEmojisList(settings) {
  const activeGroupId = settings.activeReactionGroupId !== undefined ? settings.activeReactionGroupId : 0;
  const groups = settings.reactionGroups || [];
  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  return activeGroup ? (activeGroup.emojis || []) : [];
}

function renderReactionGroups(settings) {
  const tabsContainer = document.getElementById('reactionGroupsTabs');
  if (!tabsContainer) return;

  const activeGroupId = settings.activeReactionGroupId !== undefined ? settings.activeReactionGroupId : 0;
  const groups = settings.reactionGroups || [];

  tabsContainer.innerHTML = groups.map(g => {
    const isActive = g.id === activeGroupId;
    const checkmark = isActive ? '<span style="color:#10b981; font-weight:bold; margin-left:4px;">✓</span>' : '';
    return `
      <button type="button" class="memo-sub-tab ${isActive ? 'active' : ''}" data-group-id="${g.id}" style="display:flex; align-items:center; gap:4px; font-weight:600; padding:6px 12px; border-radius:6px; font-size:12.5px;">
        ${escapeHtml(g.name || `Nhóm ${g.id + 1}`)} ${checkmark}
      </button>
    `;
  }).join('');

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  const renameInput = document.getElementById('reactionGroupNameInput');
  if (renameInput && activeGroup) {
    renameInput.value = activeGroup.name || `Nhóm ${activeGroup.id + 1}`;
  }
}

/**
 * Renders currently selected emojis in Reactions tab
 */
function renderSelectedEmojis(settings) {
  const container = document.getElementById('selectedEmojisContainer');
  if (!container) return;

  let currentList = getActiveEmojisList(settings);

  const countBadge = document.getElementById('selectedEmojisCountBadge');
  if (countBadge) {
    countBadge.textContent = `${currentList.length} / 20`;
    if (currentList.length >= 20) {
      countBadge.style.background = '#fde8e8';
      countBadge.style.color = '#e02424';
      countBadge.style.borderColor = '#f8b4b4';
    } else {
      countBadge.style.background = 'var(--bg-3)';
      countBadge.style.color = 'var(--text-2)';
      countBadge.style.borderColor = 'var(--border)';
    }
  }

  if (currentList.length === 0) {
    container.innerHTML = `<span style="font-size:12px; color:var(--text-3); font-style:italic;">No emojis selected. Select from below!</span>`;
    return;
  }

  // HTML5 Drag and Drop Handlers for Reordering
  let dragSrcEl = null;

  function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.name);
    this.classList.add('dragging');
    console.log('[ChatOps Ext] Emoji Drag Start:', this.dataset.name);
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  async function handleDrop(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    
    this.classList.remove('drag-over');
    
    const srcName = e.dataTransfer.getData('text/plain') || (dragSrcEl ? dragSrcEl.dataset.name : null);
    const destName = this.dataset.name;
    
    console.log('[ChatOps Ext] Emoji Drag Drop:', srcName, 'over', destName);
    
    if (srcName && destName && srcName !== destName) {
      const settings = await getSettings();
      const activeGroupId = settings.activeReactionGroupId !== undefined ? settings.activeReactionGroupId : 0;
      const groups = settings.reactionGroups || [];
      const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
      let list = activeGroup ? (activeGroup.emojis || []) : [];
      
      const srcIndex = list.indexOf(srcName);
      const destIndex = list.indexOf(destName);
      
      if (srcIndex > -1 && destIndex > -1) {
        list.splice(srcIndex, 1);
        list.splice(destIndex, 0, srcName);
        
        if (activeGroup) {
          activeGroup.emojis = list;
        }
        
        await updateSettings({ 
          reactionGroups: groups,
          spamEmojis: list
        });
        showAutoSaveFeedback();
        
        const updatedSettings = await getSettings();
        renderSelectedEmojis(updatedSettings);
      }
    }
    return false;
  }

  function handleDragEnd() {
    this.classList.remove('dragging');
    container.querySelectorAll('.selected-emoji-tag').forEach(tag => {
      tag.classList.remove('dragging');
      tag.classList.remove('drag-over');
    });
    console.log('[ChatOps Ext] Emoji Drag End');
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
      <div class="selected-emoji-tag" draggable="true" data-name="${name}" title="${language.clickToRemove || 'Click to remove'}">
        ${content}
        <span class="emoji-tag-remove">&times;</span>
      </div>
    `;
  }).join('');

  // Bind drag & drop events to the tags
  const tags = container.querySelectorAll('.selected-emoji-tag');
  tags.forEach(tag => {
    tag.addEventListener('dragstart', handleDragStart);
    tag.addEventListener('dragover', handleDragOver);
    tag.addEventListener('dragenter', handleDragEnter);
    tag.addEventListener('dragleave', handleDragLeave);
    tag.addEventListener('drop', handleDrop);
    tag.addEventListener('dragend', handleDragEnd);
  });
}

/**
 * Renders Standard Emojis Grid
 */
function renderStandardEmojiGrid(settings, filterQuery = '') {
  const grid = document.getElementById('standardEmojiGrid');
  if (!grid) return;

  let currentList = getActiveEmojisList(settings);

  // Filter standard emojis locally in memory
  const filtered = STANDARD_EMOJIS.filter(item => item.name.toLowerCase().includes(filterQuery));

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-3); font-size:12px;">No matching emojis found.</div>`;
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
      gridItems.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:#e74c3c; font-size:12px;">Cannot connect to ChatOps server or cookies not synced.</div>`;
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

  let currentList = getActiveEmojisList(settings);

  // Filter custom emojis locally in memory
  const filtered = cachedCustomEmojis.filter(item => item.name.toLowerCase().includes(filterQuery));

  if (filtered.length === 0) {
    if (customEmojiPage <= 1) {
      gridItems.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-3); font-size:12px;">No matching custom emojis found.</div>`;
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
  const activeGroupId = settings.activeReactionGroupId !== undefined ? settings.activeReactionGroupId : 0;
  const groups = settings.reactionGroups || [];
  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  
  let list = activeGroup ? (activeGroup.emojis || []) : [];

  if (list.includes(emojiName)) {
    list = list.filter(name => name !== emojiName);
  } else {
    if (list.length >= 20) {
      showErrorFeedback('Select up to 20 emojis for spam!');
      return;
    }
    list.push(emojiName);
  }

  if (activeGroup) {
    activeGroup.emojis = list;
  }

  await updateSettings({ 
    reactionGroups: groups,
    spamEmojis: list 
  });
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

  const countBadge = document.getElementById('categoriesCountBadge');
  if (countBadge) {
    countBadge.textContent = `${categories.length} / 5`;
    if (categories.length >= 5) {
      countBadge.style.background = '#fde8e8';
      countBadge.style.color = '#e02424';
      countBadge.style.borderColor = '#f8b4b4';
    } else {
      countBadge.style.background = 'var(--bg-3)';
      countBadge.style.color = 'var(--text-2)';
      countBadge.style.borderColor = 'var(--border)';
    }
  }
  listEl.innerHTML = categories.map((cat, idx) => `
    <li data-cat="${escapeHtml(cat)}" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-2); border-radius:6px; border:1px solid var(--border); margin-bottom: 8px; min-width: 0; gap: 8px;">
      <span class="cat-name" style="font-size:14.5px; font-weight:600; color:var(--text-1); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; text-align:left;">${escapeHtml(cat)}</span>
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="btn-edit-cat btn-edit-memo" data-idx="${idx}" data-cat="${escapeHtml(cat)}" title="${language.editBtn || 'Edit'}" style="background:none; border:none; padding:4px; cursor:pointer; color:var(--text-3); display:inline-flex; align-items:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="btn-delete-cat btn-delete-memo" data-cat="${escapeHtml(cat)}" title="${language.deleteBtn || 'Delete'}" style="background:none; border:none; padding:4px; cursor:pointer; color:var(--text-3); display:inline-flex; align-items:center;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="pointer-events:none;"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
        </button>
      </div>
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
  const headerColor = settings.headerColor || '#1c58d9';
  root.style.setProperty('--header-bg', headerColor);
  const headerTextColor = settings.headerTextColor || '#ffffff';
  root.style.setProperty('--header-text-color', headerTextColor);
  
  // Nav Block
  const navColor = settings.navColor || '#1153ab';
  root.style.setProperty('--nav-bg', navColor);

  // Tab Text Color
  const tabTextColor = settings.tabTextColor || '#ffffff';
  root.style.setProperty('--tab-text-color', tabTextColor);
  
  // Accent Block (Primary color for buttons, etc)
  const accentColor = settings.accentColor || '#1c58d9';
  root.style.setProperty('--accent', accentColor);
  const accentTextColor = settings.accentTextColor || '#ffffff';
  root.style.setProperty('--accent-text-color', accentTextColor);

  // App Padding
  const appPaddingVal = settings.appPadding || '12px';
  root.style.setProperty('--app-padding', appPaddingVal);
  
  // Calculate content, main navigation tabs, and inner sub-tabs density proportionally
  let contentPaddingVal = '10px';
  let tabNavPaddingVal = '6px 12px';
  let tabBtnPaddingVal = '6px 4px';
  let subTabsMarginVal = '8px 12px';
  let subTabPaddingVal = '5px 10px';
  let settingsSubtabPaddingVal = '8px 12px';
  let settingsSubtabsMarginVal = '18px';

  if (appPaddingVal === '10px') {
    contentPaddingVal = '8px';
    tabNavPaddingVal = '4px 10px';
    tabBtnPaddingVal = '4px 2px';
    subTabsMarginVal = '4px 10px';
    subTabPaddingVal = '3px 6px';
    settingsSubtabPaddingVal = '5px 8px';
    settingsSubtabsMarginVal = '12px';
  } else if (appPaddingVal === '12px') {
    contentPaddingVal = '10px';
    tabNavPaddingVal = '6px 12px';
    tabBtnPaddingVal = '6px 4px';
    subTabsMarginVal = '8px 12px';
    subTabPaddingVal = '5px 10px';
    settingsSubtabPaddingVal = '8px 12px';
    settingsSubtabsMarginVal = '18px';
  } else if (appPaddingVal === '16px') {
    contentPaddingVal = '12px';
    tabNavPaddingVal = '8px 16px';
    tabBtnPaddingVal = '8px 6px';
    subTabsMarginVal = '12px 16px';
    subTabPaddingVal = '7px 14px';
    settingsSubtabPaddingVal = '10px 16px';
    settingsSubtabsMarginVal = '24px';
  } else if (appPaddingVal === '20px') {
    contentPaddingVal = '16px';
    tabNavPaddingVal = '10px 20px';
    tabBtnPaddingVal = '10px 8px';
    subTabsMarginVal = '16px 20px';
    subTabPaddingVal = '9px 18px';
    settingsSubtabPaddingVal = '12px 20px';
    settingsSubtabsMarginVal = '30px';
  }

  root.style.setProperty('--content-padding', contentPaddingVal);
  root.style.setProperty('--tab-nav-padding', tabNavPaddingVal);
  root.style.setProperty('--tab-btn-padding', tabBtnPaddingVal);
  root.style.setProperty('--sub-tabs-margin', subTabsMarginVal);
  root.style.setProperty('--sub-tab-padding', subTabPaddingVal);
  root.style.setProperty('--settings-subtab-padding', settingsSubtabPaddingVal);
  root.style.setProperty('--settings-subtabs-margin', settingsSubtabsMarginVal);

  // Dynamic Live Preview Mockup Update
  const mockHeader = document.getElementById('mockupHeader');
  if (mockHeader) {
    mockHeader.style.background = headerColor;
    mockHeader.style.color = headerTextColor;
  }

  const mockNav = document.getElementById('mockupNav');
  if (mockNav) {
    mockNav.style.background = navColor;
    mockNav.querySelectorAll('.mock-tab-btn').forEach(btn => {
      btn.style.color = tabTextColor;
    });
  }

  const mockAccentBtn = document.getElementById('mockupAccentBtn');
  if (mockAccentBtn) {
    mockAccentBtn.style.background = accentColor;
    mockAccentBtn.style.color = accentTextColor;
  }
}

export function applyTabVisibilityToDOM(showTabs, memeEnabled) {
  // Main tabs visibility
  const tasksVisible = showTabs.tasks !== false;
  const notesVisible = showTabs.notes !== false;
  const mentionsVisible = showTabs.missed !== false;
  const reactionsVisible = showTabs.reactions !== false;
  // Tools tab visible if ANY of its sub-tabs is enabled
  const toolsVisible = (showTabs.search !== false) || (memeEnabled !== false) || reactionsVisible || mentionsVisible;
  const settingsVisible = true; // Settings is always visible
  
  // Set main tab buttons visibility
  const tasksBtn = document.querySelector('.tab-btn[data-tab="tasks"]');
  if (tasksBtn) tasksBtn.style.display = tasksVisible ? 'flex' : 'none';
  
  const notesBtn = document.querySelector('.tab-btn[data-tab="memo"]');
  if (notesBtn) notesBtn.style.display = notesVisible ? 'flex' : 'none';
  
  const mentionsBtn = document.querySelector('.tab-btn[data-tab="mentions"]');
  if (mentionsBtn) mentionsBtn.style.display = mentionsVisible ? 'flex' : 'none';
  
  const toolsBtn = document.querySelector('.tab-btn[data-tab="tools"]');
  if (toolsBtn) toolsBtn.style.display = toolsVisible ? 'flex' : 'none';
  
  const settingsBtn = document.querySelector('.tab-btn[data-tab="settings"]');
  if (settingsBtn) settingsBtn.style.display = settingsVisible ? 'flex' : 'none';

  // Toggle sub-tabs inside Tools based on individual feature switches
  const subSearchBtn = document.querySelector('#toolsSubTabs .memo-sub-tab[data-section="search"]');
  if (subSearchBtn) subSearchBtn.style.display = showTabs.search !== false ? '' : 'none';

  const subMentionsBtn = document.querySelector('#toolsSubTabs .memo-sub-tab[data-section="mentions"]');
  if (subMentionsBtn) subMentionsBtn.style.display = mentionsVisible ? '' : 'none';

  const subImagesBtn = document.querySelector('#toolsSubTabs .memo-sub-tab[data-section="images"]');
  if (subImagesBtn) subImagesBtn.style.display = memeEnabled !== false ? '' : 'none';

  const subReactionsBtn = document.querySelector('#toolsSubTabs .memo-sub-tab[data-section="reactions"]');
  if (subReactionsBtn) subReactionsBtn.style.display = reactionsVisible ? '' : 'none';

  // Sync Tools parent toggle in settings UI
  const settingShowToolsEl = document.getElementById('settingShowTools');
  if (settingShowToolsEl) {
    const toolsAnyOn = (showTabs.search !== false) || (memeEnabled !== false) || reactionsVisible || mentionsVisible;
    settingShowToolsEl.checked = toolsAnyOn;
    const toolsSubGroup = document.getElementById('toolsSubToggles');
    if (toolsSubGroup) {
      if (toolsAnyOn) toolsSubGroup.classList.add('expanded');
      else toolsSubGroup.classList.remove('expanded');
    }
  }

  // Find first active visible tab
  let firstVisibleTabId = 'tasks';
  if (tasksVisible) firstVisibleTabId = 'tasks';
  else if (notesVisible) firstVisibleTabId = 'memo';
  else if (toolsVisible) firstVisibleTabId = 'tools';
  else firstVisibleTabId = 'settings';

  // Check if current active tab is hidden, if so switch to first visible tab
  const activeBtn = document.querySelector('.tab-btn.active');
  if (activeBtn) {
    const activeTab = activeBtn.dataset.tab;
    let isCurrentTabVisible = true;
    if (activeTab === 'memo') isCurrentTabVisible = notesVisible;
    else if (activeTab === 'tools') isCurrentTabVisible = toolsVisible;
    else if (activeTab === 'tasks') isCurrentTabVisible = tasksVisible;
    else if (activeTab === 'mentions') isCurrentTabVisible = mentionsVisible;
    else if (activeTab === 'settings') isCurrentTabVisible = settingsVisible;

    if (!isCurrentTabVisible) {
      const fallbackBtn = document.querySelector(`.tab-btn[data-tab="${firstVisibleTabId}"]`);
      if (fallbackBtn) fallbackBtn.click();
    }
  }

  // Also auto-switch Tools sub-tab if the active Tools sub-tab is hidden
  const activeToolsSubBtn = document.querySelector('#toolsSubTabs .memo-sub-tab.active');
  if (activeToolsSubBtn) {
    const activeSub = activeToolsSubBtn.dataset.section;
    let isSubVisible = true;
    if (activeSub === 'search') isSubVisible = showTabs.search !== false;
    else if (activeSub === 'images') isSubVisible = memeEnabled !== false;
    else if (activeSub === 'mentions') isSubVisible = mentionsVisible;
    else if (activeSub === 'reactions') isSubVisible = reactionsVisible;

    if (!isSubVisible) {
      // Find first visible tools subtab
      const visibleSubBtn = Array.from(document.querySelectorAll('#toolsSubTabs .memo-sub-tab')).find(btn => btn.style.display !== 'none');
      if (visibleSubBtn) visibleSubBtn.click();
    }
  }
}

export async function renderSidepanelMemes() {
  const res = await chrome.storage.local.get(['custom_memes']);
  let customMemes = res.custom_memes;
  if (customMemes === undefined) {
    customMemes = DEFAULT_MEMES;
    await chrome.storage.local.set({ custom_memes: customMemes });
  }
  const container = document.getElementById('sidepanel-memes-grid');
  if (!container) return;

  // Helper functions for size calculation
  const getBase64Size = (dataURL) => {
    if (!dataURL) return 0;
    const base64Part = dataURL.split(',')[1];
    if (!base64Part) return dataURL.length;
    const padding = base64Part.endsWith('==') ? 2 : (base64Part.endsWith('=') ? 1 : 0);
    return (base64Part.length * 3 / 4) - padding;
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Calculate total size and individual sizes
  let totalBytes = 0;
  const memeSizes = customMemes.map(url => {
    const bytes = getBase64Size(url);
    totalBytes += bytes;
    return bytes;
  });

  // Update dynamic storage indicators
  const storageText = document.getElementById('sidepanel-memes-storage-text');
  const storageBar = document.getElementById('sidepanel-memes-storage-bar');
  const maxStorageBytes = 10 * 1024 * 1024; // 10MB limit

  if (storageText && storageBar) {
    const totalFormatted = formatSize(totalBytes);
    storageText.textContent = `${totalFormatted} / 10 MB`;
    const percent = Math.min((totalBytes / maxStorageBytes) * 100, 100);
    storageBar.style.width = `${percent}%`;
    
    if (percent > 85) {
      storageBar.style.background = 'var(--danger)';
    } else if (percent > 60) {
      storageBar.style.background = 'var(--warning)';
    } else {
      storageBar.style.background = 'var(--accent)';
    }
  }

  if (customMemes.length === 0) {
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.minHeight = 'auto';
    container.style.background = 'transparent';
    container.style.border = 'none';
    container.style.padding = '16px 0';
    container.style.justifyContent = 'stretch';
    container.style.alignItems = 'stretch';
    container.innerHTML = language.imageLibraryEmptyState;
    return;
  }

  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.gap = '16px';
  container.style.minHeight = '300px';
  container.style.background = 'var(--bg-2)';
  container.style.border = '1px solid var(--border)';
  container.style.padding = '12px 10px 12px 2px';
  container.style.alignItems = 'flex-start';

  let col1Html = '';
  let col2Html = '';

  customMemes.forEach((url, idx) => {
    const formattedSize = formatSize(memeSizes[idx]);
    const cellHtml = `
      <div class="chatops-custom-image-cell">
        <img src="${url}" class="chatops-custom-image-item" loading="lazy" />
        <span class="sidepanel-meme-size" style="bottom: 4px; left: 4px;">${formattedSize}</span>
        <button class="chatops-custom-image-delete" data-idx="${idx}" title="${language.deleteImage || 'Delete Image'}">&times;</button>
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

export async function runAutoCleanup() {
  const settings = await getSettings();
  const days = settings.autoCleanupDays;
  if (days === 0) return 0; // 0 means Never
  
  const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
  const memos = res[STORAGE_KEYS.MEMOS] || [];
  
  let cutoffTime;
  if (days === -1) {
    cutoffTime = Date.now() + 10000; // Immediately (with 10s system tolerance)
  } else {
    cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  }
  
  let deletedCount = 0;
  const cleanMemos = memos.filter(m => {
    if (m && m.done) {
      const completedTime = m.doneAt || m.createdAt || 0;
      if (completedTime < cutoffTime) {
        deletedCount++;
        if (m.id) chrome.alarms.clear(m.id);
        return false;
      }
    }
    return true;
  });
  
  if (deletedCount > 0) {
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: cleanMemos });
    console.log(`[ChatOps Ext] Auto-cleaned ${deletedCount} completed items (mode: ${days} days).`);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MEMO_UPDATED });
  }
  return deletedCount;
}

export async function runAutoCleanupForce() {
  // For the manual "Clean up now" button, immediately clear ALL completed items without date filtering
  const res = await chrome.storage.local.get([STORAGE_KEYS.MEMOS]);
  const memos = res[STORAGE_KEYS.MEMOS] || [];
  
  let deletedCount = 0;
  const cleanMemos = memos.filter(m => {
    if (m && m.done) {
      deletedCount++;
      if (m.id) chrome.alarms.clear(m.id);
      return false;
    }
    return true;
  });
  
  if (deletedCount > 0) {
    await chrome.storage.local.set({ [STORAGE_KEYS.MEMOS]: cleanMemos });
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MEMO_UPDATED });
  }
  return deletedCount;
}

export function updateFloatingCheckboxesSync(settings) {
  const rowTask = document.getElementById('rowFloatingQuickTask');
  const chkTask = document.getElementById('settingFloatingQuickTask');
  const showTasks = settings.showTabs.tasks !== false;
  if (rowTask && chkTask) {
    if (!showTasks) {
      chkTask.disabled = true;
      rowTask.style.opacity = '0.5';
      rowTask.style.pointerEvents = 'none';
    } else {
      chkTask.disabled = false;
      rowTask.style.opacity = '1.0';
      rowTask.style.pointerEvents = 'auto';
    }
  }

  const rowNote = document.getElementById('rowFloatingQuickNote');
  const chkNote = document.getElementById('settingFloatingQuickNote');
  const showNotes = settings.showTabs.notes !== false;
  if (rowNote && chkNote) {
    if (!showNotes) {
      chkNote.disabled = true;
      rowNote.style.opacity = '0.5';
      rowNote.style.pointerEvents = 'none';
    } else {
      chkNote.disabled = false;
      rowNote.style.opacity = '1.0';
      rowNote.style.pointerEvents = 'auto';
    }
  }

  const rowSpam = document.getElementById('rowFloatingSpamReactions');
  const chkSpam = document.getElementById('settingFloatingSpamReactions');
  const showReactions = settings.showTabs.reactions !== false;
  if (rowSpam && chkSpam) {
    if (!showReactions) {
      chkSpam.disabled = true;
      rowSpam.style.opacity = '0.5';
      rowSpam.style.pointerEvents = 'none';
    } else {
      chkSpam.disabled = false;
      rowSpam.style.opacity = '1.0';
      rowSpam.style.pointerEvents = 'auto';
    }
  }

  const rowReactAlong = document.getElementById('rowFloatingReactAlong');
  const chkReactAlong = document.getElementById('settingReactAlongEnabled');
  if (rowReactAlong && chkReactAlong) {
    if (!showReactions) {
      chkReactAlong.disabled = true;
      rowReactAlong.style.opacity = '0.5';
      rowReactAlong.style.pointerEvents = 'none';
    } else {
      chkReactAlong.disabled = false;
      rowReactAlong.style.opacity = '1.0';
      rowReactAlong.style.pointerEvents = 'auto';
    }
  }

  const rowImage = document.getElementById('rowFloatingImagePicker');
  const chkImage = document.getElementById('settingFloatingImagePicker');
  const showImages = settings.memeEnabled !== false;
  if (rowImage && chkImage) {
    if (!showImages) {
      chkImage.disabled = true;
      rowImage.style.opacity = '0.5';
      rowImage.style.pointerEvents = 'none';
    } else {
      chkImage.disabled = false;
      rowImage.style.opacity = '1.0';
      rowImage.style.pointerEvents = 'auto';
    }
  }
}

let giphyTimeout = null;
let cachedTrendingGifs = [];
let cachedTrendingApiKey = '';

function renderGifItems(data, container) {
  container.innerHTML = data.map(gif => {
    const url = gif.images.fixed_height.url;
    return `
      <div class="gif-item" data-full-url="${url}">
        <img src="${url}" alt="${gif.title}" loading="lazy">
        <div class="gif-item-overlay">
          <button class="gif-item-btn btn-send" data-url="${url}">⚡ Send</button>
          <button class="gif-item-btn btn-preview" data-url="${url}">🔍 View</button>
        </div>
      </div>
    `;
  }).join('');
}

async function fetchGiphyGifs(query = '') {
  const container = document.getElementById('giphy-gifs-grid');
  if (!container) return;

  const settings = await getSettings();
  const apiKey = settings.giphyApiKey || '';

  if (!apiKey) {
    container.innerHTML = `
      <div style="grid-column: span 2; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; min-height:200px; text-align:center; padding:20px;">
        <p style="font-size:13px; color:var(--text-2); margin:0;">${language.giphyNoApiKey}</p>
        <a href="#" class="settings-subtab-link" data-subtab="features-gif"
          style="font-size:13px; color:var(--accent); font-weight:600; text-decoration:none;">
          ${language.giphySetupLink} ↗
        </a>
      </div>
    `;
    return;
  }

  // If trending (empty query) and we have a valid cache for same key → reuse
  if (query.trim() === '' && cachedTrendingGifs.length > 0 && cachedTrendingApiKey === apiKey) {
    renderGifItems(cachedTrendingGifs, container);
    return;
  }

  container.innerHTML = '<div style="grid-column: span 2; display:flex; align-items:center; justify-content:center; min-height: 200px;"><span class="spinner"></span></div>';

  try {
    let url;
    if (query.trim() === '') {
      url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
    } else {
      url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20&offset=0&rating=g&lang=en`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(language.giphyHttpError.replace('{status}', response.status));
    }
    const result = await response.json();
    if (result.data && result.data.length > 0) {
      // Cache trending results
      if (query.trim() === '') {
        cachedTrendingGifs = result.data;
        cachedTrendingApiKey = apiKey;
      }
      renderGifItems(result.data, container);
    } else {
      container.innerHTML = `<div style="grid-column: span 2; display:flex; align-items:center; justify-content:center; color: var(--text-3); font-size:13px; min-height:200px;">${language.giphyNotFound}</div>`;
    }
  } catch (error) {
    console.error('Failed to fetch GIFs:', error);
    container.innerHTML = `
      <div style="grid-column: span 2; display:flex; flex-direction:column; align-items:center; justify-content:center; color: #ef4444; font-size:12.5px; padding: 20px; text-align:center; min-height:200px; gap:8px;">
        <span>❌ ${language.giphyLoadError}</span>
        <span style="font-size:11px; color:var(--text-3);">${error.message}</span>
      </div>
    `;
  }
}

