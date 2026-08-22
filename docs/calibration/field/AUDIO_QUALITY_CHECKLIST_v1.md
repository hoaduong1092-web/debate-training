# DANH MỤC KIỂM ĐỊNH CHẤT LƯỢNG ÂM THANH (AUDIO QUALITY CHECKLIST v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `CHK-CAL-AUDIO-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/08_VOICE_ENGINE_SPEC.md` & `docs/calibration/CALIBRATION_DATASET_SCHEMA_v1.md`  
> **Mục Đích:** Kiểm định các tiêu chuẩn kỹ thuật âm học DSP trước khi mẫu được nạp vào tập kiểm chuẩn.

---

# BẢNG RÀ SOÁT TIÊU CHUẨN KỸ THUẬT ÂM HỌC (ACOUSTIC TELEMETRY CRITERIA)

| STT | Tiêu Chuẩn Kỹ Thuật (Technical Spec) | Yêu Cầu Tối Thiểu (Minimum Requirement) | Giá Trị Thực Đo | Đánh Giá |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **Định Dạng Tệp (Audio Format)** | Tệp PCM WAV uncompressed (hoặc FLAC/MP3 $\ge 192\text{kbps}$). | `__________` | `[ ] PASS` `[ ] FAIL` |
| 2 | **Tần Số Lấy Mẫu (Sampling Rate)** | Tối thiểu $16,000\text{Hz}$ ($16\text{kHz}$), khuyến nghị $44.1\text{kHz}$ hoặc $48\text{kHz}$. | `_____ Hz` | `[ ] PASS` `[ ] FAIL` |
| 3 | **Độ Sâu Bit (Bit Depth)** | $16\text{-bit}$ hoặc $24\text{-bit}$ PCM. | `_____ bit` | `[ ] PASS` `[ ] FAIL` |
| 4 | **Thời Lượng Bài Nói (Duration)** | Từ $60$ giây đến $480$ giây ($1.0 - 8.0$ phút). | `_____ s` | `[ ] PASS` `[ ] FAIL` |
| 5 | **Tỷ Lệ Tín Hiệu Trên Nhiễu (SNR)** | $\text{SNR} \ge 15.0\text{dB}$ (Không bị tiếng quạt, tiếng đường phố lấn át giọng nói). | `_____ dB` | `[ ] PASS` `[ ] FAIL` |
| 6 | **Kiểm Soát Vỡ Tiếng (Clipping/Distortion)** | Mức đỉnh Peak $\le -0.5\text{dBFS}$, không bị cắt đỉnh sóng âm quá $0.5\%$ thời lượng. | `_____ dBFS`| `[ ] PASS` `[ ] FAIL` |
| 7 | **Không Có Tiếng Nói Đè (Cross-talk)** | Không có người thứ hai nói đè liên tục $\ge 3$ giây trong suốt bài phát biểu. | `__________` | `[ ] PASS` `[ ] FAIL` |
| 8 | **Xác Nhận Giọng Người Thật (Non-TTS)** | Đã kiểm tra và xác nhận là giọng người thật, không phải âm thanh tổng hợp Text-to-Speech. | `__________` | `[ ] PASS` `[ ] FAIL` |
| 9 | **Mã Băm Toàn Vẹn Tệp Gốc (SHA-256)** | Tạo mã băm SHA-256 niêm phong ngay sau khi đo lường chất lượng. | `[Generated]`| `[ ] SEALED` |

---

# KẾT LUẬN KIỂM ĐỊNH ÂM THANH

* **Mã Bài Nói:** `CAL-SPEECH-2026-______`
* **Mã Băm Tệp Âm Thanh (SHA-256):** `________________________________________________________________`
* **Kết luận kỹ thuật:** `[ ] ĐẠT CHUẨN ÂM HỌC (ACCEPTED)` | `[ ] TỪ CHỐI (REJECTED - CHUYỂN LOG LỖI)`
* **Kỹ Sư Âm Học / Người Kiểm Tra:** `____________________________________`  
* **Thời Gian Kiểm Tra:** `____-__-__ __:__:__ (UTC+7)`
