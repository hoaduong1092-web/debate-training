# DANH MỤC KIỂM ĐỊNH BẢN GỠ BĂNG (TRANSCRIPT INGESTION CHECKLIST v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `CHK-CAL-TRANSCRIPT-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/CALIBRATION_DATASET_SCHEMA_v1.md`  
> **Mục Đích:** Kiểm định tính toàn vẹn, độ chính xác của dấu thời gian và chuẩn hóa bản gỡ băng trước khi nạp vào tập kiểm chuẩn.

---

# BẢNG RÀ SOÁT TIÊU CHUẨN TRANSCRIPT (TRANSCRIPT VERIFICATION CRITERIA)

| STT | Tiêu Chuẩn Văn Bản (Transcript Criterion) | Yêu Cầu Kỹ Thuật Chi Tiết | Kết Quả Rà Soát |
| :---: | :--- | :--- | :---: |
| 1 | **Khớp Hoàn Toàn Với Âm Thanh (1-to-1 Fidelity)** | Toàn bộ từ ngữ trong bài nói được gỡ băng trung thực từng từ (*Verbatim*), bao gồm cả từ đệm và câu ngập ngừng. | `[ ] PASS` `[ ] FAIL` |
| 2 | **Dấu Thời Gian Cấp Từ (Word-level Timestamps)** | Mỗi từ có trường `word`, `start_time_seconds`, `end_time_seconds` phục vụ đo lường khoảng lặng $\ge 1.2$s. | `[ ] PASS` `[ ] FAIL` |
| 3 | **Chuẩn Hóa Tiếng Việt UTF-8 (Diacritics Valid)** | Mã hóa chuẩn UTF-8, đầy đủ dấu thanh tiếng Việt (sắc, huyền, hỏi, ngã, nặng), không bị lỗi font hoặc mất dấu. | `[ ] PASS` `[ ] FAIL` |
| 4 | **Bóc Tách PII Hoàn Tất (Redaction Applied)** | Tất cả tên riêng, trường học, địa danh nhạy cảm đã được gắn nhãn `[REDACTED_PII]` đồng bộ với audio. | `[ ] PASS` `[ ] FAIL` |
| 5 | **Đếm Số Lượng Từ Xác Định (Word Count)** | Tổng số từ được đếm bằng thuật toán deterministic, không ước lượng. | `[ ] PASS` `[ ] FAIL` |
| 6 | **Cấm Tóm Tắt / Viết Lại Bằng AI (No AI Rewriting)**| Bản gỡ băng là văn bản người nói phát âm thực tế, tuyệt đối không qua module tóm tắt hay chỉnh sửa câu văn của LLM. | `[ ] PASS` `[ ] FAIL` |
| 7 | **Mã Băm Toàn Vẹn Transcript (SHA-256)** | Tạo mã băm SHA-256 niêm phong ngay sau khi hoàn tất kiểm tra. | `[ ] SEALED` |

---

# KẾT LUẬN KIỂM ĐỊNH BẢN GỠ BĂNG

* **Mã Bài Nói:** `CAL-SPEECH-2026-______`
* **Tổng Số Từ (Word Count):** `______ từ`
* **Mã Băm Tệp Transcript (SHA-256):** `________________________________________________________________`
* **Kết luận kỹ thuật:** `[ ] ĐẠT CHUẨN TRANSCRIPT (ACCEPTED)` | `[ ] TỪ CHỐI (REJECTED - CHUYỂN GỠ BĂNG LẠI)`
* **Người Kiểm Định Văn Bản:** `____________________________________`  
* **Thời Gian Kiểm Định:** `____-__-__ __:__:__ (UTC+7)`
