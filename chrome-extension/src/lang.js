/**
 * English Language Strings — ChatOps Chrome Extension
 * Centralized dictionary for all UI text.
 * 
 * ──────────────────────────────────────────────────────────
 * 🛠️ LOCALIZATION RULES FOR DEVELOPERS:
 * ──────────────────────────────────────────────────────────
 * 1. NO HARDCODED TEXT: Never hardcode user-facing strings in the components or HTML.
 *    Always define a descriptive key here and use `language.yourKey` in the code.
 * 
 * 2. ADDING TEXT: When introducing a new string, add it to this file first. Make sure
 *    the key is in camelCase and grouped in its respective feature category.
 * 
 * 3. DELETING TEXT: When removing a feature or refactoring text out, search the codebase
 *    for its key. If it is no longer used anywhere, DELETE the key from this file
 *    immediately to keep the bundle clean and prevent dead weight.
 * 
 * 4. REUSE STRINGS: Check this file first to see if an identical string or helper key
 *    (e.g., `loading`, `save`, `cancel`, `error`) already exists before adding a duplicate.
 * ──────────────────────────────────────────────────────────
 */

export const language = {
  // Common
  loading: 'Loading...',
  loadingMore: 'Loading more...',
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

  // Sidepanel Search Tab
  search: 'Search',
  searchEmptyState: 'Enter keyword and press search',
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
  scanMentionsStart: 'Click "Scan Now" to scan your channels',
  scanningChannels: 'Scanning channels...',
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
  taskEmpty: 'No tasks yet.',
  taskClickHint: 'Click 📌 on a message or enter above.',
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
  taskReminderLabel: 'Remind at:',
  taskReminderHint: '⏰ Starts at selected time — snoozes every {minutes} mins until completed (<a href="#" class="settings-subtab-link" data-subtab="features-snooze" style="color: var(--accent); font-weight: 700; text-decoration: underline;">change in Settings</a>)',
  taskAddBtn: 'Add Task',
  taskEmptyError: 'Task content cannot be empty.',
  noCompletedTasks: 'No completed tasks yet.',
  changeReminderTime: 'Change reminder time',
  editTask: 'Edit Task',

  // Sidepanel Memo (Notes) Tab
  memoTasksEmpty: 'No tasks yet.',
  memoNotesEmpty: 'No notes yet.',
  memoClickHint: 'Click 📌 on a message or enter above.',
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
  imageLibrary: 'Image Library',
  noCustomImages: 'No custom images yet',
  clickToSend: 'Click to send',
  deleteImage: 'Delete image',
  yourImages: 'Your images',
  uploadImageBtn: '+ Upload image',
  noImagesHint: 'No images yet. Click "Upload image" to add!',
  maxUploadLimitError: 'You can only upload up to 10 images at once.',
  storageLimitExceeded: 'Storage limit reached (10 MB). Please delete some images before uploading.',

  // Content Script - Quick Task Popover
  quickTaskCreate: 'Create Task',
  quickTaskTitle: 'Create Task',
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
};
