# DANH MỤC KHỬ ĐỊNH DANH & BÓC TÁCH THÔNG TIN CÁ NHÂN (PII DE-IDENTIFICATION CHECKLIST v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `CHK-CAL-PII-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/DATA_ACQUISITION_PLAN_v1.md` & Nghị định 13/2023/NĐ-CP  
> **Mục Đích:** Đảm bảo 100% dữ liệu âm thanh và văn bản được bóc tách toàn bộ thông tin nhận dạng cá nhân trước khi nạp vào kho dữ liệu mở cho giám khảo con người.

---

# BẢNG RÀ SOÁT BÓC TÁCH THÔNG TIN NHẬN DẠNG CÁ NHÂN (PII SCRUBBING AUDIT)

| STT | Loại Thông Tin Nhận Dạng (PII Category) | Quy Chuẩn Xử Lý Kỹ Thuật Bắt Buộc | Tình Trạng Xử Lý |
| :---: | :--- | :--- | :---: |
| 1 | **Họ và Tên Người Nói (Speaker Full Name)** | • Audio: Chèn tiếng bíp (*1000Hz Tone Beep*) hoặc làm câm đoạn phát âm tên.<br>• Transcript: Thay thế bằng nhãn `[REDACTED_PII_NAME]`. | `[ ] COMPLETED` |
| 2 | **Tên Trường Học / Lớp Học / Câu Lạc Bộ** | • Audio: Chèn tiếng bíp đoạn nhắc tên trường/CLB.<br>• Transcript: Thay thế bằng nhãn `[REDACTED_PII_SCHOOL]`. | `[ ] COMPLETED` |
| 3 | **Địa Chỉ Nhà Ở / Số Điện Thoại / Email** | • Audio: Làm câm hoàn toàn.<br>• Transcript: Thay thế bằng nhãn `[REDACTED_PII_CONTACT]`. | `[ ] COMPLETED` |
| 4 | **Tên Người Thân / Bạn Bè Được Đề Cập** | • Audio: Làm mờ âm thanh.<br>• Transcript: Thay thế bằng `[REDACTED_PII_PERSON]`. | `[ ] COMPLETED` |
| 5 | **Khử Định Danh Tệp Dữ Liệu (Filename Sanitization)**| Tên tệp âm thanh và transcript KHÔNG chứa họ tên hoặc mã số sinh viên (chỉ dùng `CAL_AUDIO_2026_XXX.wav`). | `[ ] COMPLETED` |
| 6 | **Xóa Bỏ Metadata Nhúng (Audio Metadata Scrubbing)**| Bóc tách toàn bộ thẻ ID3 / RIFF INFO tags (Artist, Title, Recording Location, Device ID) khỏi tệp WAV. | `[ ] COMPLETED` |
| 7 | **Đối Soát Đồng Bộ Âm Thanh & Văn Bản** | Đoạn gắn nhãn `[REDACTED_PII]` trong transcript khớp chính xác 100% với khoảng thời gian chèn tiếng bíp trên audio. | `[ ] COMPLETED` |

---

# KÝ DUYỆT BẢO VỆ DỮ LIỆU CÁ NHÂN

* **Mã Bài Nói:** `CAL-SPEECH-2026-______`
* **Mã Thí Sinh Ẩn Danh:** `SPK-ANON-____________`
* **Số Vị Trí PII Đã Bóc Tách:** `______ vị trí`
* **Xác Nhận Của Cán Bộ Bảo Mật Dữ Liệu (DPO / Field Lead):**  
  Tôi xác nhận bài phát biểu trên đã được bóc tách 100% thông tin nhận dạng cá nhân theo đúng tiêu chuẩn Nghị định 13/2023/NĐ-CP, sẵn sàng cho việc chấm điểm mù độc lập.
* **Chữ ký Cán bộ Bảo mật:** `____________________________________`  
* **Thời Gian Ký Duyệt:** `____-__-__ __:__:__ (UTC+7)`
