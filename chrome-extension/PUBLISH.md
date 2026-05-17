# Hướng dẫn nộp ChatOps++ lên Chrome Web Store

Dưới đây là các thông tin bạn cần chuẩn bị để điền vào trang quản trị [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).

## 1. Thông tin cơ bản (Store Listing)

- **Tên Extension:** ChatOps++
- **Tóm tắt (Summary):** Truy cập nhanh ChatOps (Mattermost) từ Side Panel: Tìm kiếm thông minh, nhắc nhở công việc, quản lý task, note và kho meme vui nhộn.
- **Mô tả chi tiết (Description):**
  ```text
  ChatOps++ là tiện ích mở rộng tối ưu hóa hiệu suất toàn diện cho người dùng ChatOps (Mattermost) trực tiếp từ Side Panel trình duyệt.

  🌟 CÁC TÍNH NĂNG NỔI BẬT:

  ⚡ Tìm Kiếm Thông Minh
  • Tìm kiếm tin nhắn, tài liệu và liên kết trên toàn bộ các kênh theo từ khóa cực nhanh.
  • Bộ lọc nâng cao (người gửi, kênh chat, thời gian) và giao diện kết quả Thu gọn/Mở rộng tối ưu không gian hiển thị.

  📅 Quản Lý Tác Vụ & Nhắc Nhở (Tasks)
  • Tạo nhanh việc cần làm thủ công hoặc trực tiếp từ tin nhắn ChatOps (lưu kèm liên kết gốc).
  • Hẹn giờ nhắc nhở nhanh bằng 1-click (+15 phút, +30 phút, +1 giờ...).
  • Chế độ báo lại thông minh (Snooze) lặp lại liên tục cho đến khi hoàn thành công việc.

  📝 Ghi Chú Cá Nhân (Notes)
  • Lưu trữ ý tưởng, snippet code và các thông tin quan trọng một cách nhanh gọn.
  • Hỗ trợ tạo, chỉnh sửa danh mục và phân loại ghi chú trực quan ngay trên Side Panel.

  🔔 Kiểm Tra Mention Bỏ Lỡ
  • Quét sâu và tổng hợp toàn bộ các @mentions chưa đọc hoặc chưa xử lý từ các kênh và tin nhắn riêng (DM).
  • Xem nhanh tin nhắn gốc chỉ với một cú click chuột.

  😂 Tiện Ích Meme & Emoji
  • Upload meme cá nhân trực tiếp từ thiết bị, tự động nén dung lượng và lưu trữ cục bộ để gửi nhanh trong khung chat.
  • Cấu hình danh sách tối đa 20 emoji/reaction yêu thích (bao gồm cả emoji tùy chỉnh của Workspace).
  • Hỗ trợ spam reaction hàng loạt bằng phím tắt siêu tốc.

  🔒 Bảo Mật & Tiện Lợi
  • Tự động đồng bộ phiên đăng nhập từ tab ChatOps hiện tại mà không cần cấu hình phức tạp.
  • Toàn bộ dữ liệu cá nhân được lưu trữ cục bộ (Local Storage) trên trình duyệt, cam kết bảo mật 100% quyền riêng tư của bạn.

  🛠️ HƯỚNG DẪN SỬ DỤNG NHANH:
  1. Thêm ChatOps++ vào Chrome và ghim (Pin) tiện ích lên thanh công cụ.
  2. Click biểu tượng ChatOps++ để mở Side Panel ở cạnh phải màn hình.
  3. Chọn Workspace ChatOps/Mattermost của bạn tại menu thả xuống ở đầu tiện ích và bắt đầu trải nghiệm!
  ```
- **Thể loại (Category):** Productivity (Năng suất)
- **Ngôn ngữ chính:** Vietnamese

## 2. Tài sản hình ảnh (Graphics Assets)

- **Icons:** (Đã có sẵn trong thư mục `icons/`)
  - `icon128.png`
  - `icon48.png`
  - `icon16.png`
- **Ảnh chụp màn hình (Screenshots):** Cần ít nhất 1 ảnh (Kích thước 1280x800 hoặc 640x400).
  > [!TIP]
  > Bạn nên chụp ảnh Side Panel lúc đang hiển thị danh sách chat hoặc phần kết quả check mention.
- **Ảnh quảng bá (Promotional Tile):** 
  - Ảnh nhỏ (Small tile): 440x280 (Bắt buộc).

## 3. Quyền hạn & Bảo mật (Privacy & Permissions)

Khi Google hỏi về lý do sử dụng các quyền (Permissions Justification), bạn hãy điền như sau:

- **storage:** Dùng để lưu trữ cục bộ cấu hình cá nhân, các tùy chỉnh giao diện, danh sách việc cần làm (Tasks), ghi chú cá nhân (Notes) và dữ liệu hình ảnh meme tự tải lên của người dùng.
- **cookies:** Dùng để đọc an toàn token đăng nhập `MMAUTHTOKEN` và `MMCSRF` từ trang `chat.runsystem.vn`. Việc này giúp tự động hóa quá trình xác thực và đăng nhập liền mạch (SSO) vào Extension mà không yêu cầu nhập mật khẩu.
- **sidePanel:** Cung cấp không gian hiển thị giao diện chính ở thanh cạnh phải màn hình, hỗ trợ người dùng thao tác đa nhiệm mượt mà song song với việc lướt web.
- **alarms:** Chạy định kỳ các tác vụ nền như kiểm tra/đổ chuông nhắc nhở công việc (Tasks) và tự động cập nhật số lượng mentions bị bỏ lỡ lên biểu tượng Extension.
- **activeTab / host_permissions:** Cho phép tích hợp các nút thao tác nhanh (như biểu tượng chèn meme/emoji và phím tắt tạo task nhanh) vào giao diện trang ChatOps gốc, cũng như thực hiện các cuộc gọi API an toàn đến máy chủ ChatOps.
- **notifications:** Dùng để hiển thị thông báo đẩy trên hệ điều hành (OS Notifications) nhắc nhở việc cần làm đúng thời gian người dùng thiết lập, ngay cả khi không mở bảng điều khiển Side Panel.

## 4. Dữ liệu người dùng (User Data Privacy)

- **Single Purpose:** "Cung cấp công cụ hỗ trợ tương tác và quản lý công việc trên nền tảng ChatOps."
- **Data Usage:** Tuyên bố rằng extension KHÔNG thu thập dữ liệu người dùng ra bên ngoài server của công ty. Mọi thông tin chỉ được truyền giữa trình duyệt của người dùng và server ChatOps (`chat.runsystem.vn`).

## 5. Các bước đóng gói để nộp

1. Nén toàn bộ các file trong thư mục `chrome-extension` thành một file `.zip`.
2. **Lưu ý:** Không nén thư mục mẹ, hãy chọn tất cả các file/thư mục bên trong (`manifest.json`, `icons/`, `sidepanel/`, `src/`, `content/`, ...) rồi nén lại.
3. Tải file `.zip` này lên mục **Package** trong Developer Console.
