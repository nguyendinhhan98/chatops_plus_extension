/**
 * Bilingual Language Strings — ChatOps Chrome Extension
 * Centralized dictionary for English and Vietnamese UI text.
 */

// Initialize an empty language object that will be mutated in-place
export const language = {};

// English Dictionary
const en = {
  // Common
  loading: 'Loading...',
  loadingMore: 'Loading more...',
  loadMoreBtn: 'Load More',
  searching: 'Searching...',
  errorLoading: 'Error loading data',
  noResults: 'No results found',
  noResultsFriendly: 'No matching results found. Please check your workspace or search filters.',
  viewMessage: 'View Message',
  openInChatOps: 'Open in ChatOps',
  unknown: 'Unknown',
  channel: 'channel',
  in: 'in',
  copied: 'Copied!',
  cancel: 'Cancel',
  save: 'Save',
  expandCollapseBtn: 'Expand/Collapse',
  modalSearchTitle: 'Search Messages',
  modalAddTaskTitle: 'Add New Task',
  modalAddNoteTitle: 'Add New Note',
  modalScannerFiltersTitle: 'Scanner Filters',

  // Sidepanel Search Tab
  search: 'Search',
  searchEmptyState: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">How to use?</h4><p class="card-desc">Click the floating search button (🔍) in the bottom-right to customize filters and search messages!</p></div></div>',
  searchChannelPlaceholder: 'Search channel...',
  searchPerformanceNotice: 'Select specific channels to optimize scanning performance.',
  searchCriteriaRequired: 'Please enter at least 1 search criteria',
  searchHelpTooltip: 'Search messages by keyword, sender, channel, and date range.',
  searchKeywordHelper: 'Keyword should be 2 or more characters.',
  searchIncludeDM: 'Include Direct Messages',
  resultsFor: 'Results for',
  today: 'Today',
  last7Days: 'Last 7 Days',
  last30Days: 'Last 30 Days',
  clearResults: 'Clear Results',

  // Sidepanel Mentions Tab
  scanMentions: 'Scan Now',
  scanMentionsStart: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">How to use?</h4><p class="card-desc">Click the floating button (🔔) at the bottom to configure filters and scan. It scans for posts where you were mentioned but haven\'t reacted or replied to yet.</p></div></div>',
  scanningChannels: 'Scanning channels...',
  scanTimeNotice: 'This process may take some time. You can explore other tabs/features and come back later to see the results.',
  noMissedMentions: 'No missed mentions in the last {hours}h! 🎉',
  mentionsFound: 'Detected {count} pending mentions in {channels} channels',
  notConnected: 'Not connected. Please check <a href="#" class="settings-subtab-link" data-subtab="features-toggle" style="color: var(--accent); font-weight: 700; text-decoration: underline;">Settings</a>.',

  // Sidepanel Leave Tab
  leaveEmptyState: 'Enter information and press Search',
  selectChannelRequired: 'Please select at least 1 channel (e.g. CHECK.OFF.LATER)',
  userNotFound: 'User not found with email: {email}',
  invalidDate: 'Invalid date format',
  noLeaveRequests: 'No leave requests found',
  foundMessages: 'Found {count} messages',

  // Sidepanel Tasks Tab
  taskTabLabel: 'Tasks',
  taskEmpty: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">How to use?</h4><p class="card-desc">Click the floating button <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 15px; height: 15px; border-radius: 50%; font-size: 10px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> in the bottom-right to add a task, or hover over any message in ChatOps and click the 🎯 button to pin it as a task!</p></div></div>',
  taskClickHint: '📌 Pin messages in ChatOps or click the floating <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 14px; height: 14px; border-radius: 50%; font-size: 9px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> button in the bottom-right.',
  taskPending: 'Pending',
  taskCompleted: 'Completed',
  taskClearAll: 'Clear All',
  taskPlaceholder: 'Enter task name...',
  taskMarkIncomplete: 'Mark as incomplete',
  taskMarkDone: 'Mark as completed',
  taskNoContent: '(No content)',
  taskOverdue: 'Overdue',
  taskDelete: 'Delete',
  taskViewOriginal: 'View original message',
  taskReminderLabel: 'Remind:',
  taskReminderHint: '⏰ Starts at selected time — snoozes every {minutes} mins until completed (<a href="#" class="settings-subtab-link" data-subtab="features-snooze" style="color: var(--accent); font-weight: 700; text-decoration: underline;">change in Settings</a>)',
  taskAddBtn: 'Add Task',
  taskEmptyError: 'Task content cannot be empty.',
  noCompletedTasks: 'No completed tasks yet.',
  changeReminderTime: 'Change reminder time',
  editTask: 'Edit Task',

  // Sidepanel Memo (Notes) Tab
  memoTasksEmpty: 'No tasks yet.',
  memoNotesEmpty: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">How to use?</h4><p class="card-desc">Click the floating button <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 15px; height: 15px; border-radius: 50%; font-size: 10px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> in the bottom-right to add a note, or hover over any message in ChatOps and click the 📝 button to pin it as a note!</p></div></div>',
  memoClickHint: '📝 Pin notes in ChatOps or click the floating <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 14px; height: 14px; border-radius: 50%; font-size: 9px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> button in the bottom-right.',
  memoPending: 'Pending',
  memoCompleted: 'Completed',
  memoClearAll: 'Clear All',
  memoTaskPlaceholder: 'Enter task name...',
  memoNotePlaceholder: 'Enter note... (Shift+Enter to save)',
  memoMarkIncomplete: 'Mark as incomplete',
  memoMarkDone: 'Mark as completed',
  memoNoContent: '(No content)',
  memoEmptyNote: 'Empty note',
  memoOverdue: 'Overdue',
  memoDelete: 'Delete',
  memoViewOriginal: 'View original message',
  memoCopyNote: 'Copy content',
  memoEmptyNoteError: 'Note content cannot be empty.',
  editNote: 'Edit Note',
  deletePostTooltip: 'Delete Message (ChatOps)',
  confirmDeletePost: '⚠️ Are you sure you want to delete this message?',

  // Workspace Selector
  noWorkspaces: 'No workspaces found',

  // Content Script - Reminder Banner
  reminderTaskTitle: 'Pending Task',
  reminderTitle: 'ChatOps Reminder',
  reminderDoneBtn: '✅ Done — Stop reminding',
  reminderTaskCompleted: '✅ Completed!',
  
  // Content Script - Floating Button
  floatingBtnTitle: 'Open ChatOps++',
  floatingBtnHide: 'Hide this button',
  extensionUpdated: 'ChatOps++ has been updated! Please reload the page (F5) to continue.',

  // Content Script - Image Picker
  imageLibrary: 'Images',
  noCustomImages: 'No custom images yet',
  clickToSend: 'Click to send',
  deleteImage: 'Delete image',
  yourImages: 'Your images',
  uploadImageBtn: '+ Upload image',
  noImagesHint: 'No images yet. Click "Upload image" to add!',
  maxUploadLimitError: 'You can only upload up to 10 images at once.',
  uploadOnlyImages: 'Please select only image files.',
  storageLimitExceeded: 'Storage limit reached (10 MB). Please delete some images before uploading.',
  imageLibraryEmptyState: '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 200px; padding: 24px 0; text-align: center; color: var(--text-3); font-size: 13px; font-weight: 500; grid-column: 1 / -1;"><p style="margin: 0; line-height: 1.5; max-width: 240px;">No custom images yet. Upload some images using the button above to start!</p></div>',

  // Content Script - Quick Task Popover
  quickTaskCreate: 'Quick Task',
  quickTaskTitle: 'Quick Task',
  quickTaskNotePlaceholder: 'Add note (optional)...',
  quickTaskRemindAt: 'Remind at:',
  quickTaskHint: '⏰ Starts at selected time — snoozes every {minutes} mins until completed (<a href="#" class="settings-subtab-link" data-subtab="features-snooze" style="color: var(--accent); font-weight: 700; text-decoration: underline;">change in Settings</a>)',
  quickTaskSave: 'Save',
  quickTaskCancel: 'Cancel',
  quickTaskSaveSuccess: 'Task saved',
  quickNoteTitle: 'Quick Note',
  quickNoteCreate: 'Quick Note',
  quickNoteSaveSuccess: 'Note saved',
  reminderTaskDefault: 'You have a pending task.',
  directMessage: 'Direct Message',
  includeDirectMessage: 'Include Direct Messages',
  categoryLabel: 'Category:',
  orLabel: 'OR',
  quickTaskRemindAfter: 'Remind after:',
  msgPreviewImage: '[Image] Please view directly on ChatOps',
  msgPreviewNoText: '[No text content]',

  // Content Script - Reaction spam/retraction
  spamReactionsTitle: 'Spam Reactions',
  spamSuccess: 'Spam reactions added successfully! 🔥',
  spamErrorPrefix: 'Spam reactions error: ',
  undoSpamTitle: 'Undo Spam Reactions',
  undoSpamSuccess: 'Spam reactions removed successfully! ↩️',
  undoSpamErrorPrefix: 'Undo reactions error: ',

  // Categories
  categoryAll: 'All Categories',
  categoryGeneral: 'General',
  categoryWork: 'Work',
  categoryPersonal: 'Personal',
  categoryIdeas: 'Ideas',
  categorySelect: 'Select category...',

  // Settings Tab & Sync
  backupToCloud: 'Backup to Cloud',
  backingUp: 'Backing up...',
  restoring: 'Restoring...',
  restoreFromCloud: 'Restore from Cloud',
  cleaningUp: 'Cleaning up...',
  cleanUpNow: 'Clean up now',
  confirmRestore: '⚠️ Are you sure you want to restore data from Cloud?\nAll current notes and tasks on this machine will be completely OVERWRITTEN by data from your Google account.',
  confirmCleanup: '🧹 Are you sure you want to clean up completed notes & tasks older than your set duration now?',
  testBannerSuccess: '🟢 Test banner sent successfully!\nPlease switch to the active ChatOps tab to verify the top banner notification.',
  testSystemSuccess: '🟢 System (OS) notification sent successfully!\nIf you do not see the banner, please verify if Do Not Disturb (DND)/Focus mode is enabled, or if notifications are blocked in your system Notification Center.',
  testBothSuccess: '🟢 Both notification types sent successfully!\n1. In-page banner sent to active ChatOps tab.\n2. System notification sent to your OS.',
  testErrorPrefix: '🔴 Background notification error: ',
  testBgWorkerError: '🔴 Cannot connect to Background Service Worker. Please reload the extension at chrome://extensions.',
  testInPageBannerMsg: '🔔 This is a test notification from ChatOps++!',
  testSystemTitle: '🎯 ChatOps++ Test Notification',
  testSystemMsg: 'OS push notification system is working perfectly!',
  backupSuccess: '🎉 Successfully backed up data to your Google account!',
  backupFailed: '❌ Backup failed. Please try again.',
  restoreSuccess: '🎉 Successfully restored data from your Google account!',
  restoreFailed: '❌ Restore failed. Please try again.',
  cleanupSuccess: '🎉 Cleanup completed successfully! Removed {count} old items from local storage.',
  cleanupFailed: '❌ Cleanup failed. Please try again.',
  autoSaved: 'Auto-saved',
  lastSyncText: '☁️ Last sync: <strong style="color:var(--success); font-weight:700;">{time}</strong>',
  neverSyncedText: '⏳ Never backed up or restored on this device.',
  storageUsageText: '💻 Local: <strong style="color:var(--accent);">{local}</strong> | ☁️ Cloud: <strong style="color:var(--success);">{sync}</strong> / 100KB',

  // HTML Static Texts
  workspaceLabel: 'WORKSPACE:',
  supportVibecodingTitle: '☕ Support Development!',
  supportVibecodingDesc: 'If this extension has been helpful to you, consider buying the developer a coffee to support future projects 🚀',
  memoNotesLabel: 'Notes',
  missedTabLabel: 'Missed',
  reactionsTabLabel: 'Images',
  settingsTabLabel: 'Settings',
  searchTermsPlaceholder: 'Search keyword... (Enter to search)',
  searchUserPlaceholder: 'Search user...',
  searchAfterPlaceholder: 'After date',
  searchBeforePlaceholder: 'Before date',
  searchNewBtn: 'New Search',
  syncTooltip: 'Click to backup or restore data via Google account',
  syncText: 'Sync',
  langToggleTooltip: 'Switch to Vietnamese 🇻🇳',
  titleOptional: 'Title (optional)',
  chooseDatePlaceholder: 'Choose...',
  taskTextareaPlaceholder: 'Add new task... (Shift + Enter to save)',
  remindInPreset: 'Remind in...',
  noteTextareaPlaceholder: 'Write a note... (Shift + Enter to save)',
  categoryLabelPrefix: '📁 Category:',
  customizeCategories: '⚙️ Customize Categories',
  memoAddBtn: '📝 Add Note',
  last24Hours: 'Last 24 hours',
  last48Hours: 'Last 48 hours',
  last72Hours: 'Last 72 hours',
  last14Days: 'Last 14 Days',
  mentionDirect: 'Direct mention (@you)',
  mentionHere: 'Group mention (@here)',
  mentionChannel: 'Channel mention (@channel / @all)',
  mentionDMs: 'Direct Messages (DM / GM)',
  imageLibraryTab: 'My Library',
  reactionSpammerTab: 'Reactions',
  imageLibraryDesc: 'Click the image icon 🖼️ in the chatbox toolbar to open the picker.',
  usedStorageSpace: 'Used Storage Space',
  howToUseTitle: 'How to use?',
  reactionSpammerDesc: 'Hover over any message on ChatOps, then click the <strong>Fire button (🔥)</strong> in the hover actions menu to instantly spam your selected emojis, or click the <strong>Return button (↩️)</strong> to retract them!',
  selectedEmojisTitle: 'Selected Emojis',
  selectedEmojisDesc: 'Click on an emoji below to remove it from your quick-spam list.',
  addEmojisTitle: 'Add Emojis',
  addEmojisDesc: 'Click on an emoji below to add it to your quick-spam list.',
  emojiTabStandard: 'STANDARD',
  emojiTabCustom: 'WORKSPACE',
  searchEmojiPlaceholder: 'Search emoji by name (e.g. fire, heart)...',
  loadingMoreEmojis: 'Loading more emojis...',
  settingsOverviewTab: 'OVERVIEW',
  settingsFeaturesTab: 'FEATURES',
  settingsThemeTab: 'THEME',
  settingsCategoriesTab: 'CATEGORIES',
  settingsSyncTab: 'SYNC DATA',
  settingsOverviewWelcome: 'Welcome to <strong style="color: var(--accent); font-weight: 700;">ChatOps++</strong>! Your productivity toolkit:',
  overviewSearchDesc: '<strong>Search Messages:</strong> Instant chat history query.',
  overviewTasksDesc: '<strong>Tasks:</strong> Smart task manager with snooze alerts.',
  overviewNotesDesc: '<strong>Notes:</strong> Category-based quick note-taking with instant click-to-copy individual lines.',
  overviewMissedDesc: '<strong>Missed Mentions:</strong> Track missed channel messages.',
  overviewSpamDesc: '<strong>Spam Reactions:</strong> Express multiple emojis instantly and retract them easily.',
  overviewImageDesc: '<strong>Images:</strong> Upload and quick-send your favorite personal images.',
  overviewQuickDeleteDesc: '<strong>Quick Delete:</strong> Instantly fade out and delete your own chat messages.',
  overviewPrivacyTitle: 'Privacy & Security Commitment',
  overviewPrivacyDesc: '<strong>ChatOps++</strong> does not collect, store, or transmit your personal data. All data is stored 100% locally in your browser (Local Storage) under your full control.',
  overviewSupportTitle: 'Support & Feedback',
  overviewSupportDesc: 'For any questions, suggestions, or bug reports, please contact <a href="https://chat.runsystem.vn/runsystem/messages/@hannd-runsystem.net" class="support-chatops-link" style="color: #3498db; font-weight: 700; text-decoration: underline;">hannd@runsystem.net</a> via ChatOps.',
  featureSettingsTitle: 'Feature Settings',
  featuresToggleTab: '⚙️ Toggles',
  featuresSnoozeTab: '⏳ Snooze',
  featuresAlertsTab: '🔔 Alerts',
  featuresToggleTitle: 'Enable/Disable Features',
  featuresToggleDesc: 'Select which modules you want to display in the sidepanel.',
  menuTabsTitle: 'Sidepanel Menu Tabs',
  menuTabsDesc: 'Select which tabs you want to show in the sidepanel navigation. Hiding a tab will also disable its corresponding floating buttons outside ChatOps.',
  floatingButtonsTitle: 'Quick Actions on ChatOps',
  floatingButtonsPerfHint: 'Disabling these floating buttons outside the sidepanel helps reduce CPU usage and page rendering lag on ChatOps.',
  floatingQuickTask: 'Create Task Button (🎯)',
  floatingQuickNote: 'Create Note Button (📝)',
  floatingSpamReactions: 'Spam Reactions Hover Buttons (🔥/↩️)',
  floatingImagePicker: 'Send Image Button (🖼️)',
  additionalSettingsTitle: 'Additional Options',
  snoozeTitle: 'Default Snooze Time',
  snoozeDesc: 'Default snooze duration (minutes) for new task reminders.',
  minutesLabel: 'minutes',
  alertsTitle: 'Alert Delivery Type',
  alertsDesc: 'Select how you want to be notified when a task reminder is triggered.',
  alertsOptionBoth: '🔔 Both',
  alertsOptionSystem: '🖥️ OS System Notification only',
  alertsOptionInPage: '💬 In-page Banner only',
  testNotificationBtn: '🔔 Test Notification',
  alertsHelpTitle: 'ℹ️ HOW TO ENABLE SYSTEM NOTIFICATIONS',
  alertsHelpDesc: `
    <div>
      🍏 <strong>macOS:</strong> Go to <em>System Settings</em> → <em>Notifications</em> → <strong>Google
        Chrome</strong> → Enable <strong>Allow Notifications</strong> and select <strong>Banners</strong>
      or <strong>Alerts</strong>.
    </div>
    <div>
      🪟 <strong>Windows:</strong> Go to <em>Settings</em> → <em>System</em> → <em>Notifications</em> →
        Ensure general alerts are ON and allow <strong>Google Chrome</strong>.
    </div>
    <div>
      🐧 <strong>Ubuntu (Linux):</strong> Go to <em>Settings</em> → <em>Notifications</em> →
        <strong>Google Chrome</strong> → Ensure notifications are enabled.
    </div>
    <div
      style="border-top: 1px dashed var(--border); margin-top: 6px; padding-top: 8px; font-style: italic; color: var(--accent); font-weight: 500;">
      💡 Tip: If notifications do not appear after enabling, restart Google Chrome completely (Cmd+Q on
      macOS, or close all windows) for the OS to apply permissions.
    </div>
  `,
  themeSettingsTitle: 'Theme Settings',
  themeHeaderTitle: 'Header Component',
  themeNavTitle: 'Navigation Bar (Tabs)',
  themeAccentTitle: 'Accent Buttons & Highlights',
  themePaddingTitle: 'Layout Spacing (Padding)',
  themePaddingDesc: 'Fine-tune the density and spacing of lists, cards, and panels across the extension.',
  paddingCompact: 'Compact (10px)',
  paddingDefault: 'Default (12px)',
  paddingComfortable: 'Comfortable (16px)',
  paddingSpacious: 'Spacious (20px)',
  categoriesTitle: 'Note Categories',
  newCategoryPlaceholder: 'Enter new category... (Enter to save)',
  addBtn: 'Add',
  dataManagementTitle: 'Data Management',
  syncCloudTab: '☁️ Cloud Sync',
  syncCleanupTab: '🧹 Cleanup & Space',
  cloudSyncTitle: 'Cloud Sync (Google Account)',
  cloudSyncDesc: 'Backup or restore your tasks and notes to the cloud via your Google account to sync data across computers.',
  backupToCloudBtn: 'Backup to Cloud',
  restoreFromCloudBtn: 'Restore from Cloud',
  noBackupsFound: 'No backups found on this computer.',
  whySyncTitle: 'Why use manual sync?',
  whySyncDesc: 'To ensure maximum privacy and instant speed, all data is stored offline by default. Manual sync lets you decide exactly when to backup or transfer your data.',
  cleanupTitle: 'Cleanup & Storage Optimization',
  cleanupDesc: 'Automatically delete completed tasks or notes after a certain period of time to keep your data synchronized quickly.',
  storageUsedLabel: 'Storage Used:',
  autoCleanupLabel: 'Auto Cleanup Period:',
  autoCleanupSublabel: 'Only applies to completed tasks and notes.',
  cleanupNever: 'Never',
  cleanupOnOpen: 'Upon opening Extension',
  cleanup1Day: 'After 1 day',
  cleanup7Days: 'After 7 days',
  cleanup30Days: 'After 30 days',
  cleanup90Days: 'After 90 days',
  cleanupNowBtn: 'Cleanup Now',
  confirmDeleteTask: '⚠️ Are you sure you want to delete this task?',
  confirmDeleteNote: '⚠️ Are you sure you want to delete this note?',
  settingQuickDelete: 'Delete Messages',
  settingSoundNotification: 'Play sound for notifications',
  settingsSaved: 'Saved automatically',
  customColorLabel: 'Custom...',
  exportNotesBtn: 'Export',
  importNotesBtn: 'Import',
  exportNotesBtnTitle: 'Export notes to Markdown (.md) file',
  importNotesBtnTitle: 'Import notes from Markdown (.md), TXT or JSON file',
  importSuccess: '🎉 Successfully imported {count} notes!',
  importFailed: '❌ Import failed. Please check the file content.',
  categoryNormal: 'Normal',
  categoryChecklist: 'Checklist',
  addChecklineBtn: '+ Add item',
  checklistPlaceholder: 'checklist {num}...',
  checklistMinError: 'Please enter at least one checklist item.',
  taskRemindDailyLabel: 'Repeat daily at selected time',
  repeatDailyBadgeText: 'Daily',
};

// Vietnamese Dictionary
const vi = {
  // Common
  loading: 'Đang tải...',
  loadingMore: 'Đang tải thêm...',
  loadMoreBtn: 'Tải thêm',
  searching: 'Đang tìm kiếm...',
  errorLoading: 'Lỗi khi tải dữ liệu',
  noResults: 'Không tìm thấy kết quả',
  noResultsFriendly: 'Không tìm thấy kết quả phù hợp. Vui lòng kiểm tra không gian làm việc hoặc bộ lọc tìm kiếm.',
  viewMessage: 'Xem tin nhắn',
  openInChatOps: 'Mở trong ChatOps',
  unknown: 'Không xác định',
  channel: 'kênh',
  in: 'trong',
  copied: 'Đã sao chép!',
  cancel: 'Hủy',
  save: 'Lưu',
  expandCollapseBtn: 'Mở rộng/Thu gọn',
  modalSearchTitle: 'Tìm kiếm tin nhắn',
  modalAddTaskTitle: 'Thêm công việc mới',
  modalAddNoteTitle: 'Thêm ghi chú mới',
  modalScannerFiltersTitle: 'Bộ lọc quét tin nhắn',

  // Sidepanel Search Tab
  search: 'Tìm kiếm',
  searchEmptyState: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">Hướng dẫn sử dụng</h4><p class="card-desc">Nhấp vào nút tìm kiếm (🔍) ở góc dưới cùng bên phải để tùy chỉnh bộ lọc và tìm kiếm tin nhắn!</p></div></div>',
  searchChannelPlaceholder: 'Tìm kiếm kênh...',
  searchPerformanceNotice: 'Chọn kênh cụ thể để tối ưu hiệu suất quét.',
  searchCriteriaRequired: 'Vui lòng nhập ít nhất 1 tiêu chí tìm kiếm',
  searchHelpTooltip: 'Tìm kiếm tin nhắn theo từ khóa, người gửi, kênh và khoảng thời gian.',
  searchKeywordHelper: 'Từ khóa phải có từ 2 ký tự trở lên.',
  searchIncludeDM: 'Bao gồm Tin nhắn Trực tiếp (DM)',
  resultsFor: 'Kết quả cho',
  today: 'Hôm nay',
  last7Days: '7 ngày qua',
  last30Days: '30 ngày qua',
  clearResults: 'Xóa kết quả',

  // Sidepanel Mentions Tab
  scanMentions: 'Quét ngay',
  scanMentionsStart: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">Hướng dẫn sử dụng</h4><p class="card-desc">Nhấp vào nút (🔔) ở phía dưới để cấu hình bộ lọc và quét. Hệ thống sẽ quét các bài viết bạn được nhắc đến nhưng chưa phản hồi hoặc phản ứng.</p></div></div>',
  scanningChannels: 'Đang quét các kênh...',
  scanTimeNotice: 'Quá trình này có thể mất nhiều thời gian. Bạn có thể khám phá các tính năng khác rồi quay lại xem kết quả sau.',
  noMissedMentions: 'Không có nhắc nhở bị bỏ lỡ trong {hours}h qua! 🎉',
  mentionsFound: 'Phát hiện {count} nhắc nhở đang chờ xử lý trong {channels} kênh',
  notConnected: 'Chưa kết nối. Vui lòng kiểm tra <a href="#" class="settings-subtab-link" data-subtab="features-toggle" style="color: var(--accent); font-weight: 700; text-decoration: underline;">Cài đặt</a>.',

  // Sidepanel Leave Tab
  leaveEmptyState: 'Nhập thông tin và nhấn Tìm kiếm',
  selectChannelRequired: 'Vui lòng chọn ít nhất 1 kênh (ví dụ: CHECK.OFF.LATER)',
  userNotFound: 'Không tìm thấy người dùng với email: {email}',
  invalidDate: 'Định dạng ngày không hợp lệ',
  noLeaveRequests: 'Không tìm thấy yêu cầu nghỉ phép nào',
  foundMessages: 'Tìm thấy {count} tin nhắn',

  // Sidepanel Tasks Tab
  taskTabLabel: 'Công việc',
  taskEmpty: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">Hướng dẫn sử dụng</h4><p class="card-desc">Nhấp vào nút <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 15px; height: 15px; border-radius: 50%; font-size: 10px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> ở góc dưới cùng bên phải để thêm công việc, hoặc di chuột qua bất kỳ tin nhắn nào trong ChatOps và nhấp vào biểu tượng 🎯 để ghim thành công việc!</p></div></div>',
  taskClickHint: '📌 Ghim tin nhắn trong ChatOps hoặc nhấp vào nút <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 14px; height: 14px; border-radius: 50%; font-size: 9px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> ở góc dưới cùng bên phải.',
  taskPending: 'Chờ xử lý',
  taskCompleted: 'Đã hoàn thành',
  taskClearAll: 'Xóa tất cả',
  taskPlaceholder: 'Nhập tên công việc...',
  taskMarkIncomplete: 'Đánh dấu chưa hoàn thành',
  taskMarkDone: 'Đánh dấu đã hoàn thành',
  taskNoContent: '(Không có nội dung)',
  taskOverdue: 'Quá hạn',
  taskDelete: 'Xóa',
  taskViewOriginal: 'Xem tin nhắn gốc',
  taskReminderLabel: 'Nhắc:',
  taskReminderHint: '⏰ Bắt đầu lúc thời gian đã chọn — nhắc lại mỗi {minutes} phút cho đến khi hoàn thành (<a href="#" class="settings-subtab-link" data-subtab="features-snooze" style="color: var(--accent); font-weight: 700; text-decoration: underline;">thay đổi trong Cài đặt</a>)',
  taskAddBtn: 'Thêm công việc',
  taskEmptyError: 'Nội dung công việc không được để trống.',
  noCompletedTasks: 'Chưa có công việc hoàn thành nào.',
  changeReminderTime: 'Thay đổi thời gian nhắc nhở',
  editTask: 'Sửa công việc',

  // Sidepanel Memo (Notes) Tab
  memoTasksEmpty: 'Chưa có công việc nào.',
  memoNotesEmpty: '<div class="sp-how-to-use-card"><div class="card-icon">💡</div><div><h4 class="card-title">Hướng dẫn sử dụng</h4><p class="card-desc">Nhấp vào nút <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 15px; height: 15px; border-radius: 50%; font-size: 10px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> ở góc dưới cùng bên phải để thêm ghi chú, hoặc di chuột qua bất kỳ tin nhắn nào trong ChatOps và nhấp vào biểu tượng 📝 để ghim thành ghi chú!</p></div></div>',
  memoClickHint: '📝 Ghim ghi chú trong ChatOps hoặc nhấp vào nút <span style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; width: 14px; height: 14px; border-radius: 50%; font-size: 9px; font-weight: bold; line-height: 1; margin: 0 2px; vertical-align: middle; position: relative; top: -1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">+</span> ở góc dưới cùng bên phải.',
  memoPending: 'Chờ xử lý',
  memoCompleted: 'Đã hoàn thành',
  memoClearAll: 'Xóa tất cả',
  memoTaskPlaceholder: 'Nhập tên công việc...',
  memoNotePlaceholder: 'Nhập ghi chú... (Shift+Enter để lưu)',
  memoMarkIncomplete: 'Đánh dấu chưa hoàn thành',
  memoMarkDone: 'Đánh dấu đã hoàn thành',
  memoNoContent: '(Không có nội dung)',
  memoEmptyNote: 'Ghi chú trống',
  memoOverdue: 'Quá hạn',
  memoDelete: 'Xóa',
  memoViewOriginal: 'Xem tin nhắn gốc',
  memoCopyNote: 'Sao chép nội dung',
  memoEmptyNoteError: 'Nội dung ghi chú không được để trống.',
  editNote: 'Sửa ghi chú',
  deletePostTooltip: 'Xóa tin nhắn (ChatOps)',
  confirmDeletePost: '⚠️ Bạn có chắc chắn muốn xóa tin nhắn này không?',

  // Workspace Selector
  noWorkspaces: 'Không tìm thấy không gian làm việc nào',

  // Content Script - Reminder Banner
  reminderTaskTitle: 'Công việc chưa hoàn thành',
  reminderTitle: 'Nhắc nhở ChatOps',
  reminderDoneBtn: '✅ Đã xong — Dừng nhắc nhở',
  reminderTaskCompleted: '✅ Đã hoàn thành!',
  
  // Content Script - Floating Button
  floatingBtnTitle: 'Mở ChatOps++',
  floatingBtnHide: 'Ẩn nút này',
  extensionUpdated: 'ChatOps++ đã được cập nhật! Vui lòng tải lại trang (F5) để tiếp tục.',

  // Content Script - Image Picker
  imageLibrary: 'Hình ảnh',
  noCustomImages: 'Chưa có ảnh tải lên',
  clickToSend: 'Nhấp để gửi',
  deleteImage: 'Xóa ảnh',
  yourImages: 'Ảnh của bạn',
  uploadImageBtn: '+ Tải ảnh lên',
  noImagesHint: 'Chưa có ảnh nào. Nhấp "Tải ảnh lên" để thêm!',
  maxUploadLimitError: 'Bạn chỉ có thể tải lên tối đa 10 ảnh cùng lúc.',
  uploadOnlyImages: 'Vui lòng chỉ chọn các tệp hình ảnh.',
  storageLimitExceeded: 'Đạt giới hạn dung lượng lưu trữ (10 MB). Vui lòng xóa bớt ảnh trước khi tải lên.',
  imageLibraryEmptyState: '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 200px; padding: 24px 0; text-align: center; color: var(--text-3); font-size: 13px; font-weight: 500; grid-column: 1 / -1;"><p style="margin: 0; line-height: 1.5; max-width: 240px;">Chưa có ảnh tải lên. Nhấp vào nút tải ảnh phía trên để bắt đầu!</p></div>',

  // Content Script - Quick Task Popover
  quickTaskCreate: 'Tạo nhanh công việc',
  quickTaskTitle: 'Tạo nhanh công việc',
  quickTaskNotePlaceholder: 'Thêm ghi chú (tùy chọn)...',
  quickTaskRemindAt: 'Nhắc nhở lúc:',
  quickTaskHint: '⏰ Bắt đầu lúc thời gian đã chọn — nhắc lại mỗi {minutes} phút cho đến khi hoàn thành (<a href="#" class="settings-subtab-link" data-subtab="features-snooze" style="color: var(--accent); font-weight: 700; text-decoration: underline;">thay đổi trong Cài đặt</a>)',
  quickTaskSave: 'Lưu',
  quickTaskCancel: 'Hủy',
  quickTaskSaveSuccess: 'Đã lưu công việc',
  quickNoteTitle: 'Tạo nhanh ghi chú',
  quickNoteCreate: 'Tạo nhanh ghi chú',
  quickNoteSaveSuccess: 'Đã lưu ghi chú',
  reminderTaskDefault: 'Bạn có một công việc đang chờ xử lý.',
  directMessage: 'Tin nhắn Trực tiếp',
  includeDirectMessage: 'Bao gồm Tin nhắn Trực tiếp',
  categoryLabel: 'Danh mục:',
  orLabel: 'HOẶC',
  quickTaskRemindAfter: 'Nhắc nhở sau:',
  msgPreviewImage: '[Hình ảnh] Vui lòng xem trực tiếp trên ChatOps',
  msgPreviewNoText: '[Không có nội dung văn bản]',

  // Content Script - Reaction spam/retraction
  spamReactionsTitle: 'Spam cảm xúc',
  spamSuccess: 'Thêm spam cảm xúc thành công! 🔥',
  spamErrorPrefix: 'Lỗi spam cảm xúc: ',
  undoSpamTitle: 'Hoàn tác spam cảm xúc',
  undoSpamSuccess: 'Xóa spam cảm xúc thành công! ↩️',
  undoSpamErrorPrefix: 'Lỗi hoàn tác cảm xúc: ',

  // Categories
  categoryAll: 'Tất cả danh mục',
  categoryGeneral: 'Chung',
  categoryWork: 'Công việc',
  categoryPersonal: 'Cá nhân',
  categoryIdeas: 'Ý tưởng',
  categorySelect: 'Chọn danh mục...',

  // Settings Tab & Sync
  backupToCloud: 'Sao lưu lên Đám mây',
  backingUp: 'Đang sao lưu...',
  restoring: 'Đang khôi phục...',
  restoreFromCloud: 'Khôi phục từ Đám mây',
  cleaningUp: 'Đang dọn dẹp...',
  cleanUpNow: 'Dọn dẹp ngay',
  confirmRestore: '⚠️ Bạn có chắc chắn muốn khôi phục dữ liệu từ Đám mây?\nToàn bộ ghi chú và công việc hiện tại trên máy này sẽ bị GHI ĐÈ hoàn toàn bởi dữ liệu từ tài khoản Google của bạn.',
  confirmCleanup: '🧹 Bạn có chắc chắn muốn dọn dẹp các ghi chú & công việc đã hoàn thành cũ hơn thời gian đã đặt?',
  testBannerSuccess: '🟢 Đã gửi thông báo biểu ngữ thử nghiệm thành công!\nVui lòng chuyển sang tab ChatOps đang hoạt động để kiểm tra.',
  testSystemSuccess: '🟢 Đã gửi thông báo hệ thống (OS) thử nghiệm thành công!\nNếu không thấy thông báo, vui lòng kiểm tra xem chế độ Không làm phiền (DND) có đang bật hoặc ứng dụng có bị chặn thông báo trong Cài đặt hệ thống không.',
  testBothSuccess: '🟢 Đã gửi cả hai loại thông báo thử nghiệm thành công!\n1. Biểu ngữ trong trang được gửi đến tab ChatOps hoạt động.\n2. Thông báo hệ thống được gửi đến hệ điều hành.',
  testErrorPrefix: '🔴 Lỗi thông báo chạy ngầm: ',
  testBgWorkerError: '🔴 Không thể kết nối với Background Service Worker. Vui lòng tải lại tiện ích mở rộng tại chrome://extensions.',
  testInPageBannerMsg: '🔔 Đây là thông báo thử nghiệm từ ChatOps++!',
  testSystemTitle: '🎯 Thông báo thử nghiệm ChatOps++',
  testSystemMsg: 'Hệ thống thông báo đẩy trên hệ điều hành đang hoạt động hoàn hảo!',
  backupSuccess: '🎉 Đã sao lưu dữ liệu lên tài khoản Google của bạn thành công!',
  backupFailed: '❌ Sao lưu thất bại. Vui lòng thử lại.',
  restoreSuccess: '🎉 Đã khôi phục dữ liệu từ tài khoản Google của bạn thành công!',
  restoreFailed: '❌ Khôi phục thất bại. Vui lòng thử lại.',
  cleanupSuccess: '🎉 Dọn dẹp hoàn tất thành công! Đã xóa {count} mục cũ khỏi bộ nhớ cục bộ.',
  cleanupFailed: '❌ Dọn dẹp thất bại. Vui lòng thử lại.',
  autoSaved: 'Đã tự động lưu',
  lastSyncText: '☁️ Đồng bộ gần nhất: <strong style="color:var(--success); font-weight:700;">{time}</strong>',
  neverSyncedText: '⏳ Chưa từng sao lưu hoặc khôi phục trên thiết bị này.',
  storageUsageText: '💻 Máy cục bộ: <strong style="color:var(--accent);">{local}</strong> | ☁️ Đám mây: <strong style="color:var(--success);">{sync}</strong> / 100KB',

  // HTML Static Texts
  workspaceLabel: 'KHÔNG GIAN:',
  supportVibecodingTitle: '☕ Hỗ trợ phát triển!',
  supportVibecodingDesc: 'Nếu tiện ích này hữu ích với bạn, hãy mời nhà phát triển một tách cà phê để tiếp thêm động lực cho những dự án mới nhé 🚀',
  memoNotesLabel: 'Ghi chú',
  missedTabLabel: 'Bỏ lỡ',
  reactionsTabLabel: 'Hình ảnh',
  settingsTabLabel: 'Cài đặt',
  searchTermsPlaceholder: 'Từ khóa tìm kiếm... (Ấn Enter để tìm)',
  searchUserPlaceholder: 'Tìm kiếm người dùng...',
  searchAfterPlaceholder: 'Sau ngày',
  searchBeforePlaceholder: 'Trước ngày',
  searchNewBtn: 'Tìm kiếm mới',
  syncTooltip: 'Nhấp để sao lưu hoặc khôi phục dữ liệu qua tài khoản Google',
  syncText: 'Đồng bộ',
  langToggleTooltip: 'Chuyển sang Tiếng Anh 🇺🇸',
  titleOptional: 'Tiêu đề (tùy chọn)',
  chooseDatePlaceholder: 'Chọn...',
  taskTextareaPlaceholder: 'Thêm công việc mới... (Shift + Enter để lưu)',
  remindInPreset: 'Nhắc sau...',
  noteTextareaPlaceholder: 'Viết ghi chú... (Shift + Enter để lưu)',
  categoryLabelPrefix: '📁 Danh mục:',
  customizeCategories: '⚙️ Tùy chỉnh danh mục',
  memoAddBtn: '📝 Thêm ghi chú',
  last24Hours: '24 giờ qua',
  last48Hours: '48 giờ qua',
  last72Hours: '72 giờ qua',
  last14Days: '14 ngày qua',
  mentionDirect: 'Nhắc tên trực tiếp (@bạn)',
  mentionHere: 'Nhắc tên nhóm (@here)',
  mentionChannel: 'Nhắc tên kênh (@channel / @all)',
  mentionDMs: 'Tin nhắn trực tiếp (DM / GM)',
  imageLibraryTab: 'Ảnh của tôi',
  reactionSpammerTab: 'Cảm xúc',
  imageLibraryDesc: 'Nhấp vào biểu tượng ảnh (🖼️) trong thanh công cụ chatbox để mở thư viện.',
  usedStorageSpace: 'Dung lượng đã sử dụng',
  howToUseTitle: 'Hướng dẫn sử dụng',
  reactionSpammerDesc: 'Di chuột qua bất kỳ tin nhắn nào trên ChatOps, sau đó nhấp vào <strong>nút Ngọn lửa (🔥)</strong> trong thanh công cụ để spam ngay lập tức các biểu tượng cảm xúc đã chọn, hoặc nhấp vào <strong>nút Hoàn tác (↩️)</strong> để thu hồi!',
  selectedEmojisTitle: 'Cảm xúc đã chọn',
  selectedEmojisDesc: 'Nhấp vào một biểu tượng cảm xúc bên dưới để xóa khỏi danh sách spam nhanh.',
  addEmojisTitle: 'Thêm cảm xúc',
  addEmojisDesc: 'Nhấp vào một biểu tượng cảm xúc bên dưới để thêm vào danh sách spam nhanh.',
  emojiTabStandard: 'TIÊU CHUẨN',
  emojiTabCustom: 'WORKSPACE',
  searchEmojiPlaceholder: 'Tìm kiếm emoji theo tên (ví dụ: fire, heart)...',
  loadingMoreEmojis: 'Đang tải thêm emoji...',
  settingsOverviewTab: 'TỔNG QUAN',
  settingsFeaturesTab: 'TÍNH NĂNG',
  settingsThemeTab: 'GIAO DIỆN',
  settingsCategoriesTab: 'DANH MỤC',
  settingsSyncTab: 'ĐỒNG BỘ DỮ LIỆU',
  settingsOverviewWelcome: 'Chào mừng bạn đến với <strong style="color: var(--accent); font-weight: 700;">ChatOps++</strong>! Bộ công cụ tăng năng suất của bạn:',
  overviewSearchDesc: '<strong>Tìm kiếm tin nhắn:</strong> Truy vấn lịch sử trò chuyện tức thì.',
  overviewTasksDesc: '<strong>Công việc:</strong> Quản lý công việc thông minh với thông báo nhắc lại.',
  overviewNotesDesc: '<strong>Ghi chú:</strong> Ghi chú nhanh theo phân loại danh mục và hỗ trợ click để sao chép nhanh từng dòng.',
  overviewMissedDesc: '<strong>Nhắc nhở bỏ lỡ:</strong> Theo dõi các tin nhắn kênh bị bỏ qua.',
  overviewSpamDesc: '<strong>Spam cảm xúc:</strong> Bày tỏ nhiều cảm xúc cùng lúc tức thì và thu hồi dễ dàng.',
  overviewImageDesc: '<strong>Hình ảnh:</strong> Tải lên và gửi nhanh các hình ảnh cá nhân yêu thích của bạn.',
  overviewQuickDeleteDesc: '<strong>Xóa nhanh tin nhắn:</strong> Xóa ngay lập tức các tin nhắn của chính bạn trên khung chat.',
  overviewPrivacyTitle: 'Cam kết Bảo mật & Riêng tư',
  overviewPrivacyDesc: '<strong>ChatOps++</strong> không thu thập, lưu trữ hoặc truyền tải dữ liệu cá nhân của bạn. Tất cả dữ liệu được lưu trữ 100% cục bộ trong trình duyệt của bạn (Local Storage) dưới toàn quyền kiểm soát của bạn.',
  overviewSupportTitle: 'Hỗ trợ & Góp ý',
  overviewSupportDesc: 'Đối với bất kỳ câu hỏi, đề xuất hoặc báo cáo lỗi nào, vui lòng liên hệ <a href="https://chat.runsystem.vn/runsystem/messages/@hannd-runsystem.net" class="support-chatops-link" style="color: #3498db; font-weight: 700; text-decoration: underline;">hannd@runsystem.net</a> qua ChatOps.',
  featureSettingsTitle: 'Cấu hình Tính năng',
  featuresToggleTab: '⚙️ Tính năng',
  featuresSnoozeTab: '⏳ Nhắc lại',
  featuresAlertsTab: '🔔 Cảnh báo',
  featuresToggleTitle: 'Bật/Tắt Tính năng',
  featuresToggleDesc: 'Chọn mô-đun nào bạn muốn hiển thị trên thanh bên.',
  menuTabsTitle: 'Hiển thị Tab trong Menu',
  menuTabsDesc: 'Chọn các tab bạn muốn hiển thị trên thanh bên Sidepanel. Ẩn tab sẽ tự động tắt các nút nổi tương ứng ngoài trang ChatOps.',
  floatingButtonsTitle: 'Nút tương tác nhanh trên ChatOps',
  floatingButtonsPerfHint: 'Tắt các nút nổi tương tác ngoài ChatOps sẽ giúp giảm tải CPU, tối ưu hiệu năng và tránh giật lag khi kênh chat có lượng tin nhắn lớn.',
  floatingQuickTask: 'Nút Tạo công việc (🎯)',
  floatingQuickNote: 'Nút Tạo ghi chú (📝)',
  floatingSpamReactions: 'Các nút Cảm xúc trên tin nhắn (🔥/↩️)',
  floatingImagePicker: 'Nút Gửi ảnh trong khung chat (🖼️)',
  additionalSettingsTitle: 'Tùy chọn bổ sung',
  snoozeTitle: 'Thời gian nhắc lại mặc định',
  snoozeDesc: 'Thời gian nhắc lại mặc định (phút) cho các nhắc nhở công việc mới.',
  minutesLabel: 'phút',
  alertsTitle: 'Phương thức nhận cảnh báo',
  alertsDesc: 'Chọn cách bạn muốn được thông báo khi nhắc nhở công việc được kích hoạt.',
  alertsOptionBoth: '🔔 Cả hai',
  alertsOptionSystem: '🖥️ Chỉ thông báo hệ thống (OS)',
  alertsOptionInPage: '💬 Chỉ biểu ngữ trong trang',
  testNotificationBtn: '🔔 Thử thông báo',
  alertsHelpTitle: 'ℹ️ CÁCH BẬT THÔNG BÁO HỆ THỐNG',
  alertsHelpDesc: `
    <div>
      🍏 <strong>macOS:</strong> Vào <em>Cài đặt Hệ thống</em> → <em>Thông báo</em> → <strong>Google
        Chrome</strong> → Bật <strong>Cho phép Thông báo</strong> và chọn dạng <strong>Biểu ngữ</strong>
      hoặc <strong>Cảnh báo</strong>.
    </div>
    <div>
      🪟 <strong>Windows:</strong> Vào <em>Cài đặt</em> → <em>Hệ thống</em> → <em>Thông báo</em> →
        Đảm bảo thông báo chung đang BẬT và cho phép <strong>Google Chrome</strong>.
    </div>
    <div>
      🐧 <strong>Ubuntu (Linux):</strong> Vào <em>Cài đặt</em> → <em>Thông báo</em> →
        <strong>Google Chrome</strong> → Đảm bảo thông báo đã được bật.
    </div>
    <div
      style="border-top: 1px dashed var(--border); margin-top: 6px; padding-top: 8px; font-style: italic; color: var(--accent); font-weight: 500;">
      💡 Mẹo: Nếu thông báo không xuất hiện sau khi bật, vui lòng khởi động lại Google Chrome hoàn toàn (Cmd+Q trên
      macOS hoặc đóng tất cả cửa sổ) để hệ điều hành áp dụng quyền.
    </div>
  `,
  themeSettingsTitle: 'Cài đặt Giao diện',
  themeHeaderTitle: 'Thành phần Header',
  themeNavTitle: 'Thanh điều hướng (Tab)',
  themeAccentTitle: 'Nút bật & Điểm nhấn',
  themePaddingTitle: 'Khoảng cách giao diện (Padding)',
  themePaddingDesc: 'Tinh chỉnh mật độ và khoảng cách của danh sách, thẻ và bảng trên toàn bộ tiện ích mở rộng.',
  paddingCompact: 'Nhỏ gọn (10px)',
  paddingDefault: 'Mặc định (12px)',
  paddingComfortable: 'Thoải mái (16px)',
  paddingSpacious: 'Rộng rãi (20px)',
  categoriesTitle: 'Danh mục ghi chú',
  newCategoryPlaceholder: 'Nhập danh mục mới... (Ấn Enter để lưu)',
  addBtn: 'Thêm',
  dataManagementTitle: 'Quản lý Dữ liệu',
  syncCloudTab: '☁️ Đồng bộ Đám mây',
  syncCleanupTab: 'Dọn dẹp & Lưu trữ',
  cloudSyncTitle: 'Đồng bộ Đám mây (Tài khoản Google)',
  cloudSyncDesc: 'Sao lưu hoặc khôi phục công việc và ghi chú của bạn lên đám mây thông qua tài khoản Google để đồng bộ dữ liệu giữa các máy tính.',
  backupToCloudBtn: 'Sao lưu lên Đám mây',
  restoreFromCloudBtn: 'Khôi phục từ Đám mây',
  noBackupsFound: 'Không tìm thấy bản sao lưu nào trên máy tính này.',
  whySyncTitle: 'Tại sao nên đồng bộ thủ công?',
  whySyncDesc: 'Để đảm bảo tính riêng tư tối đa và tốc độ tức thì, tất cả dữ liệu được lưu trữ ngoại tuyến theo mặc định. Đồng bộ thủ công cho phép bạn quyết định chính xác khi nào cần sao lưu hoặc chuyển dữ liệu.',
  cleanupTitle: 'Dọn dẹp & Tối ưu hóa Lưu trữ',
  cleanupDesc: 'Tự động xóa các công việc hoặc ghi chú đã hoàn thành sau một khoảng thời gian nhất định để giữ cho dữ liệu của bạn gọn gàng, đồng bộ nhanh.',
  storageUsedLabel: 'Dung lượng đã dùng:',
  autoCleanupLabel: 'Chu kỳ dọn dẹp tự động:',
  autoCleanupSublabel: 'Chỉ áp dụng cho công việc và ghi chú đã hoàn thành.',
  cleanupNever: 'Không bao giờ',
  cleanupOnOpen: 'Khi mở Tiện ích',
  cleanup1Day: 'Sau 1 ngày',
  cleanup7Days: 'Sau 7 ngày',
  cleanup30Days: 'Sau 30 ngày',
  cleanup90Days: 'Sau 90 days',
  cleanupNowBtn: 'Dọn dẹp ngay',
  confirmDeleteTask: '⚠️ Bạn có chắc chắn muốn xóa công việc này không?',
  confirmDeleteNote: '⚠️ Bạn có chắc chắn muốn xóa ghi chú này không?',
  settingQuickDelete: 'Xóa tin nhắn',
  settingSoundNotification: 'Phát âm thanh khi có thông báo',
  settingsSaved: 'Đã lưu tự động',
  customColorLabel: 'Tùy chọn...',
  exportNotesBtn: 'Xuất ghi chú',
  importNotesBtn: 'Nhập ghi chú',
  exportNotesBtnTitle: 'Xuất ghi chú ra tệp Markdown (.md)',
  importNotesBtnTitle: 'Nhập ghi chú từ tệp Markdown (.md), TXT hoặc JSON',
  importSuccess: '🎉 Đã nhập thành công {count} ghi chú!',
  importFailed: '❌ Nhập thất bại. Vui lòng kiểm tra lại nội dung file.',
  categoryNormal: 'Thường',
  categoryChecklist: 'Checklist',
  addChecklineBtn: '+ Thêm dòng',
  checklistPlaceholder: 'checklist {num}...',
  checklistMinError: 'Vui lòng nhập ít nhất một dòng checklist.',
  taskRemindDailyLabel: 'Nhắc nhở hằng ngày vào giờ đã chọn',
  repeatDailyBadgeText: 'Hằng ngày',
};

// Swaps the active language dictionary key-value pairs in-place
export function setLanguage(langCode) {
  const dict = langCode === 'vi' ? vi : en;
  
  // Clean all existing keys in case of dictionary hot-swapping
  for (const key in language) {
    delete language[key];
  }
  
  // Assign all keys in-place
  Object.assign(language, dict);
}

// Function to dynamically retrieve active locale code
export function getActiveLanguageCode() {
  return language.loading === 'Đang tải...' ? 'vi' : 'en';
}

// Initialize with a default locale synchronously
setLanguage('vi');

// Asynchronously load language from chrome.storage.local
export async function loadLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['app_lang'], (res) => {
      const savedLang = res.app_lang || 'vi';
      setLanguage(savedLang);
      resolve(savedLang);
    });
  });
}

// Scans container and translates all data-i18n attributes
export function applyI18n(container = document) {
  // Translate textContent
  container.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (language[key] !== undefined) {
      el.textContent = language[key];
    }
  });

  // Translate innerHTML (for rich static blocks)
  container.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (language[key] !== undefined) {
      el.innerHTML = language[key];
    }
  });

  // Translate placeholder
  container.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (language[key] !== undefined) {
      el.setAttribute('placeholder', language[key]);
      const childInput = el.querySelector('input');
      if (childInput) {
        childInput.placeholder = language[key];
      }
    }
  });

  // Translate title
  container.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (language[key] !== undefined) {
      el.setAttribute('title', language[key]);
    }
  });
}
