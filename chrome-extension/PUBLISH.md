# Hướng dẫn nộp ChatOps Helper lên Chrome Web Store

Dưới đây là các thông tin bạn cần chuẩn bị để điền vào trang quản trị [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).

## 1. Thông tin cơ bản (Store Listing)

- **Tên Extension:** ChatOps Helper
- **Tóm tắt (Summary):** Truy cập nhanh ChatOps: tìm kiếm, gửi tin nhắn, theo dõi mention và xin nghỉ — ngay từ Side Panel trình duyệt.
- **Mô tả chi tiết (Description):**
  ```text
  ChatOps Helper là công cụ hỗ trợ toàn diện cho người dùng ChatOps (Mattermost), giúp tối ưu hóa quy trình làm việc ngay trong trình duyệt.

  Các tính năng chính:
  - Side Panel Tiện Lợi: Mở bảng điều khiển bên phải mà không làm gián đoạn công việc ở tab hiện tại.
  - Chat Theo Luồng (Threaded Chat): Trải nghiệm chat chuyên nghiệp với tính năng gom nhóm tin nhắn, trả lời (reply) theo luồng y hệt ứng dụng gốc.
  - Tìm Kiếm Thông Minh: Tìm nhanh tin nhắn, người dùng hoặc channel trên toàn hệ thống ChatOps.
  - Kiểm Tra Mention: Tự động quét và thông báo các mention bạn lỡ bỏ qua trong 7 ngày gần nhất.
  - Quản Lý Nghỉ Phép: Tra cứu nhanh lịch sử xin đi muộn, về sớm hoặc xin nghỉ của đồng nghiệp.
  - Kho Memes Vui Nhộn: Chèn nhanh các meme hài hước vào cuộc hội thoại chỉ với một cú click.

  Tiện ích được thiết kế để bảo mật, tự động đồng bộ tài khoản từ trang ChatOps hiện tại, giúp bạn bắt đầu làm việc ngay lập tức mà không cần cấu hình phức tạp.
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

- **storage:** Dùng để lưu trữ cấu hình cá nhân như Workspace mặc định và các tùy chỉnh giao diện của người dùng.
- **cookies:** Dùng để đọc `MMAUTHTOKEN` và `MMCSRF` từ trang `chat.runsystem.vn`. Việc này giúp người dùng tự động đăng nhập vào Extension mà không cần nhập lại mật khẩu, đảm bảo trải nghiệm liền mạch.
- **sidePanel:** Cung cấp không gian hiển thị chính cho các tính năng của extension, giúp người dùng vừa làm việc vừa chat/tra cứu được.
- **alarms:** Dùng để chạy tác vụ kiểm tra mention bị bỏ lỡ định kỳ (mỗi 5-10 phút) ngay cả khi không mở Extension.
- **activeTab / host_permissions:** Cần thiết để tương tác với trang ChatOps, nhúng nút mở nhanh và thực hiện các yêu cầu API v4 tới server ChatOps.

## 4. Dữ liệu người dùng (User Data Privacy)

- **Single Purpose:** "Cung cấp công cụ hỗ trợ tương tác và quản lý công việc trên nền tảng ChatOps."
- **Data Usage:** Tuyên bố rằng extension KHÔNG thu thập dữ liệu người dùng ra bên ngoài server của công ty. Mọi thông tin chỉ được truyền giữa trình duyệt của người dùng và server ChatOps (`chat.runsystem.vn`).

## 5. Các bước đóng gói để nộp

1. Nén toàn bộ các file trong thư mục `chrome-extension` thành một file `.zip`.
2. **Lưu ý:** Không nén thư mục mẹ, hãy chọn tất cả các file/thư mục bên trong (`manifest.json`, `icons/`, `sidepanel/`, `src/`, `content/`, ...) rồi nén lại.
3. Tải file `.zip` này lên mục **Package** trong Developer Console.
