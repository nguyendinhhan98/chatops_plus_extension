/**
 * Vietnamese Language Strings — ChatOps Chrome Extension
 * Centralized dictionary for all UI text.
 */

export const language = {
  // Common
  loading: 'Đang tải...',
  loadingMore: 'Đang tải thêm...',
  searching: 'Đang tìm kiếm...',
  errorLoading: 'Lỗi khi tải dữ liệu',
  noResults: 'Không tìm thấy kết quả nào',
  noResultsFriendly: 'Không tìm thấy kết quả phù hợp. Hãy thử kiểm tra lại workspace hoặc bộ lọc tìm kiếm.',
  viewMessage: 'Xem tin nhắn',
  openInChatOps: 'Mở trong ChatOps',
  unknown: 'Không xác định',
  channel: 'kênh',
  in: 'trong',
  copied: 'Đã sao chép!',

  // Sidepanel Search Tab
  search: 'Tìm kiếm',
  searchEmptyState: 'Nhập từ khóa và nhấn tìm kiếm',
  searchCriteriaRequired: 'Vui lòng nhập ít nhất 1 tiêu chí tìm kiếm',
  searchHelpTooltip: 'Tìm kiếm tin nhắn theo từ khóa, người gửi, channel và khoảng thời gian.',
  searchKeywordHelper: 'Từ khóa nên từ 2 ký tự trở lên.',
  searchIncludeDM: 'Bao gồm Direct Message',
  resultsFor: 'Kết quả cho',
  today: 'Hôm nay',
  last7Days: '7 ngày qua',
  last30Days: '30 ngày qua',

  // Sidepanel Mentions Tab
  scanMentions: 'Kiểm tra ngay',
  scanMentionsStart: 'Nhấn "Kiểm tra ngay" để quét các kênh của bạn',
  scanningChannels: 'Đang quét các kênh...',
  noMissedMentions: 'Không có nhắc đến bị bỏ lỡ trong {hours}h qua! 🎉',
  mentionsFound: 'Phát hiện {count} nhắc đến chưa xử lý trong {channels} kênh',
  notConnected: 'Chưa kết nối. Vui lòng kiểm tra Cài đặt.',

  // Sidepanel Leave Tab
  leaveEmptyState: 'Nhập thông tin và nhấn Tìm kiếm',
  selectChannelRequired: 'Vui lòng chọn ít nhất 1 channel (ví dụ: CHECK.OFF.LATER)',
  userNotFound: 'Không tìm thấy user với email: {email}',
  invalidDate: 'Định dạng ngày không hợp lệ',
  noLeaveRequests: 'Không tìm thấy đơn xin nghỉ nào',
  foundMessages: 'Tìm thấy {count} tin nhắn',

  // Sidepanel Tasks Tab
  taskTabLabel: 'Việc cần làm',
  taskEmpty: 'Chưa có việc cần làm nào.',
  taskClickHint: 'Nhấn 📌 trên tin nhắn hoặc nhập ở trên.',
  taskPending: 'Đang thực hiện',
  taskCompleted: 'Đã hoàn thành',
  taskClearAll: 'Xóa tất cả',
  taskPlaceholder: 'Nhập tên việc cần làm...',
  taskMarkIncomplete: 'Đánh dấu chưa xong',
  taskMarkDone: 'Đánh dấu đã xong',
  taskNoContent: '(Không có nội dung)',
  taskOverdue: 'Quá hạn',
  taskDelete: 'Xóa',
  taskViewOriginal: 'Xem tin nhắn gốc',
  taskReminderLabel: 'Nhắc lúc:',
  taskReminderHint: 'Hệ thống sẽ nhắc lại mỗi {minutes} phút cho đến khi hoàn thành (có thể thay đổi ở phần Cài đặt)',
  taskAddBtn: 'Thêm việc',

  // Sidepanel Memo (Notes) Tab
  memoTasksEmpty: 'Chưa có việc cần làm nào.',
  memoNotesEmpty: 'Chưa có ghi chú nào.',
  memoClickHint: 'Nhấn 📌 trên tin nhắn hoặc nhập ở trên.',
  memoPending: 'Đang thực hiện',
  memoCompleted: 'Đã hoàn thành',
  memoClearAll: 'Xóa tất cả',
  memoTaskPlaceholder: 'Nhập tên việc cần làm...',
  memoNotePlaceholder: 'Nội dung ghi chú... (Enter để lưu)',
  memoMarkIncomplete: 'Đánh dấu chưa xong',
  memoMarkDone: 'Đánh dấu đã xong',
  memoNoContent: '(Không có nội dung)',
  memoEmptyNote: 'Ghi chú trống',
  memoOverdue: 'Quá hạn',
  memoDelete: 'Xóa',
  memoViewOriginal: 'Xem tin nhắn gốc',
  memoCopyNote: 'Sao chép nội dung',

  // Workspace Selector
  noWorkspaces: 'Không tìm thấy Workspace nào',

  // Content Script - Reminder Banner
  reminderTaskTitle: 'Việc cần làm chưa xong',
  reminderTitle: 'ChatOps Nhắc nhở',
  reminderDoneBtn: '✅ Xong — Dừng nhắc',
  reminderTaskCompleted: '✅ Đã hoàn thành!',
  
  // Content Script - Floating Button
  floatingBtnTitle: 'Mở ChatOps Helper',
  floatingBtnHide: 'Ẩn nút này',
  extensionUpdated: 'ChatOps Helper đã được cập nhật! Vui lòng tải lại trang (F5) để tiếp tục.',

  // Content Script - Meme Picker
  memeLibrary: '😂 Thư viện Meme',
  memeLoading: 'Đang tải...',
  memeError: 'Lỗi tải meme.',

  // Content Script - Quick Task Popover
  quickTaskCreate: 'Tạo việc cần làm',
  quickTaskTitle: 'Tạo việc cần làm',
  quickTaskNotePlaceholder: 'Thêm ghi chú (tùy chọn)...',
  quickTaskRemindAt: 'Nhắc lúc:',
  quickTaskHint: 'Hệ thống sẽ nhắc lại mỗi {minutes} phút cho đến khi hoàn thành (có thể thay đổi ở phần Cài đặt)',
  quickTaskSave: 'Lưu',
  quickTaskCancel: 'Hủy',
  save: 'Lưu',
  cancel: 'Hủy',
  quickTaskSaveSuccess: 'Đã lưu việc cần làm',
  quickNoteTitle: 'Thêm ghi chú nhanh',
  quickNoteCreate: 'Thêm ghi chú nhanh',
  quickNoteSaveSuccess: 'Đã lưu ghi chú',
  reminderTaskDefault: 'Bạn có một việc cần làm chưa hoàn thành.',
  directMessage: 'Tin nhắn trực tiếp',
  includeDirectMessage: 'Bao gồm Direct Message',

  // Categories
  categoryAll: 'Tất cả danh mục',
  categoryGeneral: 'Chung',
  categoryWork: 'Công việc',
  categoryPersonal: 'Cá nhân',
  categoryIdeas: 'Ý tưởng',
  categorySelect: 'Chọn danh mục...',
};
