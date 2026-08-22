# KẾ HOẠCH THU THẬP DỮ LIỆU THỰC TẾ (REAL DATA ACQUISITION PLAN v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-ACQUISITION-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/CALIBRATION_PROTOCOL_v1.md` & Nghị định 13/2023/NĐ-CP  
> **Trạng Thái Quản Trị:** 🟢 **DATA ACQUISITION PLAN — APPROVED**  
> **Mục Tiêu:** Thu thập $N = 50$ bài phát biểu tranh biện thực tế từ học sinh Việt Nam đảm bảo tính pháp lý, đạo đức và kỹ thuật  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. NGUỒN THU THẬP MẪU BÀI NÓI (SOURCES OF SPEECH DATA)

Tập mẫu $N = 50$ bài phát biểu thực tế được thu thập thông qua 3 kênh chính thức:
1. **Kênh 1: Các Câu lạc bộ Tranh biện Đối tác (Partner Debate Clubs):** Thu thập từ các buổi thi đấu tập dượt nội bộ của các CLB tranh biện trường THPT/Đại học tại Hà Nội, Đà Nẵng, Nghệ An, và TP.HCM.
2. **Kênh 2: Giải Đấu Tranh Biện Học Sinh Mở Rộng (Public Debating Tournaments):** Khai thác các bài thi đấu công khai có sự cho phép của Ban Tổ Chức giải đấu chuẩn WSDC/BP.
3. **Kênh 3: Phiên Thu Âm Mẫu Có Kiểm Soát (Controlled Calibration Sessions):** Mời 20 thí sinh ở các trình độ khác nhau tham gia phát biểu theo các kiến nghị chuẩn trong phòng thu tiêu chuẩn.

---

# 2. BẢO MẬT, QUYỀN RIÊNG TƯ & ĐỒNG THUẬN PHÁP LÝ (DATA PRIVACY & CONSENT)

### 2.1. Văn Bản Đồng Thuận Tham Gia Nghiên Cứu (Informed Consent Form):
* $100\%$ thí sinh tham gia (và người giám hộ hợp pháp đối với học sinh dưới 18 tuổi) bắt buộc phải ký văn bản đồng thuận trước khi bài nói được đưa vào tập kiểm chuẩn.
* Thí sinh được thông báo rõ: Dữ liệu âm thanh và văn bản chỉ phục vụ mục đích nghiên cứu kiểm chuẩn thuật toán AI và nâng cao chất lượng giáo dục, không sử dụng cho mục đích thương mại ngoài dự án.

### 2.2. Quy Trình Khử Định Danh & Bóc Tách PII (Pseudonymization & PII Scrubbing):
* **Khử định danh mã người nói:** Tên thật được thay thế bằng mã ngẫu nhiên dạng `SPK-ANON-XXXX`.
* **Bóc tách PII trong âm thanh và văn bản:** Mọi thông tin cá nhân vô tình được nhắc tới trong bài phát biểu (tên người, tên trường học, số điện thoại, địa chỉ nhà) sẽ được làm mờ âm thanh (*Audio Beep*) và thay thế bằng nhãn `[REDACTED_PII]` trong transcript.

---

# 3. QUY TRÌNH LƯU TRỮ, TRUY CẬP VÀ TOÀN VẸN DỮ LIỆU (STORAGE & ACCESS CONTROL)

| Hạng Mục Quản Trị | Quy Định Kỹ Thuật & Pháp Lý Chi Tiết |
| :--- | :--- |
| **Bản Quyền Dữ Liệu Âm Thanh** | Thuộc quyền nghiên cứu và sử dụng phi thương mại của Dự án AI Debate Master theo thỏa thuận đồng thuận. |
| **Bản Quyền Transcript** | Dự án sở hữu toàn quyền đối với bản gỡ băng chuẩn hóa có gắn nhãn thời gian. |
| **Lưu Trữ & Mã Hóa** | Lưu trữ trên phân vùng đám mây an toàn, mã hóa dữ liệu ở trạng thái nghỉ (*AES-256 at rest*) và trạng thái truyền tải (*TLS 1.3 in transit*). |
| **Mã Băm Toàn Vẹn** | Mỗi tệp âm thanh và transcript được niêm phong bằng mã băm SHA-256 ngay sau khi bóc tách PII. |
| **Phân Quyền Truy Cập (Access Control)** | • Kỹ sư Hệ thống: Quy tắc đọc/ghi telemetry và transcript ẩn danh.<br>• Giám khảo Con người: Chỉ có quyền nghe và đọc transcript ẩn danh qua cổng Web Portal chấm mù.<br>• Quản trị viên: Quyền đối soát mã băm toàn vẹn. |
| **Thời Hạn Lưu Trữ (Retention Policy)** | Dữ liệu kiểm chuẩn được lưu trữ trong thời hạn 3 năm phục vụ nghiên cứu và kiểm toán hệ thống. |
| **Quyền Yêu Cầu Xóa Dữ Liệu (Right to be Forgotten)** | Thí sinh có quyền gửi yêu cầu rút lui và xóa dữ liệu cá nhân. Hệ thống sẽ loại bỏ mẫu khỏi các đợt kiểm chuẩn tương lai trong vòng 14 ngày làm việc. |
| **Nhật Ký Truy Vết (Immutable Audit Trail)** | Mọi thao tác truy cập tệp âm thanh đều được ghi log bất biến lưu trữ tối thiểu 36 tháng. |
