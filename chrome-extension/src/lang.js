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
  viewMessage: 'Xem tin nhắn',
  openInChatOps: 'Mở trong ChatOps',
  unknown: 'Không xác định',
  channel: 'kênh',
  in: 'trong',

  // Sidepanel Search Tab
  searchEmptyState: 'Nhập từ khóa và nhấn tìm kiếm',
  searchCriteriaRequired: 'Vui lòng nhập ít nhất 1 tiêu chí tìm kiếm',
  resultsFor: 'Kết quả cho',

  // Sidepanel Mentions Tab
  scanMentions: 'Quét Mention',
  scanMentionsStart: 'Nhấn "Quét Mention" để bắt đầu',
  scanningChannels: 'Đang quét các channel...',
  noMissedMentions: 'Không có mention bị bỏ lỡ trong {hours}h qua! 🎉',
  mentionsFound: 'Phát hiện {count} mention chưa xử lý trong {channels} channel',
  notConnected: 'Chưa kết nối. Vui lòng kiểm tra Cài đặt.',

  // Sidepanel Leave Tab
  leaveEmptyState: 'Nhập thông tin và nhấn Tìm kiếm',
  selectChannelRequired: 'Vui lòng chọn ít nhất 1 channel (ví dụ: CHECK.OFF.LATER)',
  userNotFound: 'Không tìm thấy user với email: {email}',
  invalidDate: 'Định dạng ngày không hợp lệ',
  noLeaveRequests: 'Không tìm thấy đơn xin nghỉ nào',
  foundMessages: 'Tìm thấy {count} tin nhắn',

  // Sidepanel Memo Tab
  memoTasksEmpty: 'Chưa có Task nào.',
  memoNotesEmpty: 'Chưa có Note nào.',
  memoClickHint: 'Nhấn 📌 trên tin nhắn hoặc nhập ở trên.',
  memoPending: 'Chưa xong',
  memoCompleted: 'Đã xong',
  memoClearAll: 'Xóa tất cả',
  memoTaskPlaceholder: 'Tên task... (Enter để lưu)',
  memoNotePlaceholder: 'Nội dung note... (Enter để lưu)',
  memoMarkIncomplete: 'Đánh dấu chưa xong',
  memoMarkDone: 'Đánh dấu đã xong',
  memoNoContent: '(Không có nội dung)',
  memoEmptyNote: 'Note trống',
  memoOverdue: 'Quá hạn',
  memoDelete: 'Xóa',
  memoViewOriginal: 'Xem tin nhắn gốc',

  // Workspace Selector
  noWorkspaces: 'Không tìm thấy Workspace nào',

  // Content Script - Reminder Banner
  reminderTaskTitle: 'Task chưa xong',
  reminderTitle: 'ChatOps Nhắc nhở',
  reminderDoneBtn: '✅ Xong — Dừng nhắc',
  reminderTaskCompleted: '✅ Task đã hoàn thành!',
  
  // Content Script - Floating Button
  floatingBtnTitle: 'Mở ChatOps Helper',
  floatingBtnHide: 'Ẩn nút này',
  extensionUpdated: 'ChatOps Helper đã được cập nhật! Vui lòng tải lại trang (F5) để tiếp tục.',

  // Content Script - Meme Picker
  memeLibrary: '😂 Thư viện Meme',
  memeLoading: 'Đang tải...',
  memeError: 'Lỗi tải meme.',

  // Content Script - Quick Task Popover
  quickTaskCreate: 'Tạo Task nhanh',
  quickTaskNotePlaceholder: 'Thêm ghi chú (tùy chọn)...',
  quickTaskRemindAt: 'Nhắc lúc:',
  quickTaskHint: 'Sẽ nhắc mỗi 5 phút cho đến khi hoàn thành',
  quickTaskSave: 'Lưu Task',
  quickTaskCancel: 'Hủy',
  quickTaskSaveSuccess: 'Đã lưu Task thành công',
  reminderTaskDefault: 'Bạn có một task chưa hoàn thành.',
  directMessage: 'Tin nhắn trực tiếp',
};
