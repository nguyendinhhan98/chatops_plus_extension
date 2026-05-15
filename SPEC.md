Hãy thực hiện sửa lại UI/UX như theo tôi mô tả.

Lưu ý:

* UI hiện tại đã rất đẹp rồi, ưu tiên tập trung cải thiện UX, spacing, hierarchy, readability và flow sử dụng.
* Hạn chế thay đổi layout tổng thể hoặc redesign quá mạnh.
* Ưu tiên cảm giác gọn gàng, dễ scan dữ liệu và tối ưu không gian hiển thị kết quả.
* Cần reusable component, tránh duplicated code giữa các tab/filter.

---

WORKSPACE: {SELECT}

Tabs:

* Tìm kiếm
* Ghi chú
* Mentions
* Xin Nghỉ
* Settings

---

TAB: TÌM KIẾM

Yêu cầu UX tổng thể:

* Tối ưu không gian hiển thị kết quả tìm kiếm.
* Form filter cần gọn, dễ hiểu, responsive tốt.
* Khi người dùng thao tác nhiều filter vẫn không bị rối mắt.
* Các field/filter nên có visual grouping hợp lý.
* Kết quả tìm kiếm cần dễ đọc, scan nhanh và có hierarchy rõ ràng.

---

1. Collapse Search Panel

Hiện tại phần search/filter chiếm khá nhiều diện tích.

Yêu cầu:

* Thêm icon collapse/expand (ví dụ icon mũi tên).
* Khi collapse:

  * chỉ giữ lại:

    * input keyword
    * button search nhỏ gọn
  * các filter khác được ẩn đi.
* Mục tiêu:

  * giúp người dùng xem được nhiều kết quả hơn.
  * vẫn có thể search nhanh mà không cần mở full filter.
* Transition nên mượt và tự nhiên.

---

2. Header / Help UX

"Tìm kiếm tin nhắn"

Yêu cầu:

* thêm icon dấu ? hoặc tooltip help.
* hover vào sẽ giải thích ngắn gọn chức năng tab này.
  Ví dụ:
  "Tìm kiếm tin nhắn theo từ khóa, người gửi, channel và khoảng thời gian."

---

3. Keyword Search UX

Field:
"Từ khóa tìm kiếm..."

Yêu cầu:

* bổ sung helper text hoặc placeholder hướng dẫn search đúng cách.
* vì hiện tại có cảm giác search keyword quá ngắn không ra kết quả.
  Ví dụ:
* "Từ khóa nên từ 2-3 ký tự trở lên"
* hoặc:
  "Ví dụ: 'anh' sẽ chính xác hơn 'a'"

Nếu backend/search engine có limitation:

* hiển thị rõ cho user biết.

---

4. From User (Remote Search)

Field:
from: username

Hiện tại:

* hoạt động OK.

Yêu cầu:

* refactor thành common reusable remote-search component.
* tránh duplicated logic/code giữa các tab khác.
* component cần hỗ trợ:

  * debounce
  * loading state
  * empty state
  * keyboard navigation
  * reusable API interface

---

5. Channel Search UX

Field:
in: channel-name

Vấn đề hiện tại:

* đang ưu tiên hiển thị Direct Message.
* gây khó chịu khi người dùng chỉ muốn search channel thật.

Yêu cầu:

* mặc định chỉ hiển thị Channel.
* thêm checkbox/toggle:

  * Show Direct Message
  * hoặc:
    Include DM
* khi bật mới hiển thị DM.

Ngoài ra:

* không cần hiển thị quá nhiều icon trong dropdown item.
* ưu tiên clean, scan nhanh.
* hierarchy text rõ ràng là đủ.

---

6. Date Range UX

Fields:

* mm/dd/yy (from)
* mm/dd/yy (to)

Hiện tại:

* chức năng OK.

Yêu cầu:

* đặt From + To cùng một hàng để tiết kiệm không gian.
* cải thiện UI picker hiện đại hơn:

  * spacing đẹp hơn
  * calendar dễ nhìn hơn
  * highlight range rõ hơn
* ưu tiên UX chọn nhanh.

Có thể cân nhắc:

* Today
* Last 7 days
* Last 30 days
  preset shortcuts nếu phù hợp UX hiện tại.

---

7. Search Button

Button:
"Tìm kiếm"

Hiện tại:

* OK rồi.

Chỉ cần:

* đảm bảo responsive tốt.
* loading state rõ ràng khi search.
* tránh spam click.

---

8. Search Result UX

Vùng hiển thị kết quả:

Yêu cầu:

* tối ưu readability và scanability.
* hierarchy rõ:

  * username
  * channel
  * timestamp
  * message content
* highlight keyword hợp lý.
* spacing thoáng hơn một chút.
* nếu message dài:

  * truncate hợp lý
  * expand khi cần.

Ngoài ra:

* nên hiển thị context tốt hơn:

  * message thuộc channel nào
  * thời gian
  * ai gửi
* ưu tiên đọc nhanh nhiều kết quả liên tục.

Empty state:

* nếu không có kết quả:

  * hiển thị friendly message.
  * gợi ý user:

    * kiểm tra keyword
    * kiểm tra workspace hiện tại
    * kiểm tra filter/channel/date range

Ví dụ:
"Không tìm thấy kết quả phù hợp. Hãy thử kiểm tra lại workspace hoặc bộ lọc tìm kiếm."

---

Technical / UX Notes

* Ưu tiên reusable component.
* Hạn chế duplicated code.
* Ưu tiên performance khi search/filter realtime.
* Responsive tốt cho desktop trước, mobile sau.
* Không redesign lại toàn bộ UI hiện tại.
* Chỉ refine UX để cảm giác chuyên nghiệp, gọn gàng và dễ dùng hơn.
