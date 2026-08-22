# NHẬT KÝ SỰ CỐ & NGOẠI LỆ TRONG QUÁ TRÌNH CHẤM (JUDGE EXCEPTION LOG TEMPLATE v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Biểu Mẫu:** `LOG-CAL-JUDGE-EXCEPT-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/HUMAN_GROUND_TRUTH_PROTOCOL_v1.md`  
> **Mục Đích:** Ghi nhận minh bạch mọi sự cố, trường hợp rút lui do xung đột lợi ích, hoặc bất đồng điểm số lớn trong quá trình chấm của 3 Giám khảo.

---

# BIỂU MẪU THEO DÕI SỰ CỐ & NGOẠI LỆ GIÁM KHẢO (JUDGE EXCEPTION AUDIT LOG)

| Mã Sự Cố (Exception ID) | Dấu Thời Gian (Timestamp) | Mã Giám Khảo (Judge ID) | Mã Bài Nói (Sample ID) | Phân Loại Sự Cố (Exception Category) | Mô Tả Chi Tiết Tình Huống (Situation Description) | Biện Pháp Xử Lý Của Hội Đồng (Resolution Action) | Chữ Ký Trưởng Ban Trọng Tài |
| :---: | :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| `EXC-2026-001` | *YYYY-MM-DD HH:MM* | `JUDGE-WSDC-01` | `CAL-SPEECH-014` | `[ ] COI_RECUSAL`<br>`[ ] XUNG ĐỘT LỢI ÍCH` | *Giám khảo nhận ra giọng thí sinh là học sinh trong đội tuyển do mình trực tiếp huấn luyện.* | `[ ] Chấp thuận rút lui`<br>`[ ] Chuyển giao RESERVE-JUDGE-01 chấm thay thế` | *(Ký duyệt)* |
| `EXC-2026-002` | *YYYY-MM-DD HH:MM* | `ALL_PANEL` | `CAL-SPEECH-023` | `[ ] HIGH_VARIANCE`<br>`[ ] BẤT ĐỒNG > 1.5Đ` | *Judge A cho 8.2đ nhưng Judge B cho 6.2đ trên miền Strategy (Lệch 2.0đ).* | `[ ] Tổ chức họp kín 15p`<br>`[ ] Lấy trung vị 7.1đ`<br>`[ ] Gán cờ HIGH_VARIANCE` | *(Ký duyệt)* |
| `EXC-2026-003` | *YYYY-MM-DD HH:MM* | `JUDGE-WSDC-03` | `CAL-SPEECH-038` | `[ ] AUDIO_DEFECT`<br>`[ ] TIẾNG ỒN BẤT THƯỜNG` | *Tệp âm thanh bị rè ở phút thứ 3:15, mất khoảng 4 từ lập luận.* | `[ ] Kỹ sư âm học xử lý lọc nhiễu`<br>`[ ] Cho nghe lại bản sạch` | *(Ký duyệt)* |
| `EXC-2026-004` | *YYYY-MM-DD HH:MM* | `JUDGE-WSDC-02` | `BATCH-03` | `[ ] JUDGE_DELAY`<br>`[ ] QUÁ HẠN 72H` | *Giám khảo gặp vấn đề sức khỏe cá nhân, không thể chấm đúng hạn.* | `[ ] Gia hạn thêm 24h` hoặc<br>`[ ] Kích hoạt Giám khảo dự phòng` | *(Ký duyệt)* |

---

# QUY CHUẨN XỬ LÝ SỰ CỐ BẮT BUỘC (MANDATORY RESOLUTION RULES)

1. **Quy tắc thay thế khi có COI:** Ngay khi có khai báo COI, tệp bài nói lập tức bị khóa đối với giám khảo đó và chuyển tự động sang `RESERVE-JUDGE-01`.
2. **Quy tắc bất đồng điểm số $>1.5$ điểm:** Bắt buộc kích hoạt phiên họp hội đồng phân xử do Trưởng ban Trọng tài chủ trì; biên bản thảo luận phải được lưu kèm hồ sơ mẫu.
3. **Quy tắc toàn vẹn hồ sơ:** Mọi thay đổi điểm số sau phiên phân xử phải được ghi nhận rõ lý do và ký xác nhận của cả 3 Giám khảo.
