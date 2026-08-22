# NHẬT KÝ CHUỖI HÀNH TRÌNH DỮ LIỆU & TRUY VẾT (CHAIN OF CUSTODY LOG TEMPLATE v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Biểu Mẫu:** `LOG-CAL-CUSTODY-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/CALIBRATION_PROTOCOL_v1.md` & `docs/calibration/DATA_ACQUISITION_PLAN_v1.md`  
> **Mục Đích:** Ghi nhận chuỗi hành trình và lịch sử thao tác bất biến đối với từng tệp dữ liệu âm thanh và văn bản từ lúc thu âm đến khi niêm phong.

---

# BIỂU MẪU NHẬT KÝ CHUỖI HÀNH TRÌNH DỮ LIỆU (CHAIN OF CUSTODY AUDIT LOG)

| Mã Sự Kiện (Event ID) | Dấu Thời Gian (ISO 8601) | Mã Người Thao Tác (Operator ID) | Mã Bài Nói (Sample ID) | Hành Động Thực Hiện (Action Category) | Trạng Thái Cũ (Prev Status) | Trạng Thái Mới (New Status) | Mã Băm Tệp Dữ Liệu (SHA-256 Checksum) | Ghi Chú & Lý Do (Reason/Notes) |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| `EVT-2026-0001` | *YYYY-MM-DDTHH:MM:SSZ* | `OP-FIELD-01` | `CAL-SPEECH-001` | `INTAKE_RECORDED` | `PLANNED` | `RECEIVED` | `a3f5b8...` | Thu âm tại CLB Tranh biện Hà Nội |
| `EVT-2026-0002` | *YYYY-MM-DDTHH:MM:SSZ* | `OP-DSP-02` | `CAL-SPEECH-001` | `AUDIO_VALIDATED` | `RECEIVED` | `VALIDATING` | `a3f5b8...` | Kiểm tra SNR = 18.5dB, đạt chuẩn |
| `EVT-2026-0003` | *YYYY-MM-DDTHH:MM:SSZ* | `OP-PRIVACY-01`| `CAL-SPEECH-001` | `PII_SCRUBBED` | `VALIDATING` | `VALIDATING` | `e9c1d4...` | Làm mờ 1 tên trường học trên audio |
| `EVT-2026-0004` | *YYYY-MM-DDTHH:MM:SSZ* | `LEAD-DATA-01` | `CAL-SPEECH-001` | `SAMPLE_ACCEPTED` | `VALIDATING` | `ACCEPTED` | `e9c1d4...` | Đạt 100% 6 cổng nghiệm thu tiếp nhận |
| `EVT-2026-0005` | *YYYY-MM-DDTHH:MM:SSZ* | `SYS-BLIND-01` | `CAL-SPEECH-001` | `DISPATCH_JUDGES` | `ACCEPTED` | `ANNOTATING` | `e9c1d4...` | Phân phối chấm mù cho Judge 1, 2, 3 |
| `EVT-2026-0006` | *YYYY-MM-DDTHH:MM:SSZ* | `SYS-BLIND-01` | `CAL-SPEECH-001` | `ANNOTATION_DONE` | `ANNOTATING` | `ANNOTATED` | `f2a7b1...` | Nhận đủ 3 phiếu chấm độc lập |
| `EVT-2026-0007` | *YYYY-MM-DDTHH:MM:SSZ* | `LEAD-AUDIT-01`| `CAL-SPEECH-001` | `SAMPLE_SEALED` | `ANNOTATED` | `SEALED` | `7d8e9f...` | Khóa bất biến phục vụ kiểm chuẩn |

---

# DANH MỤC CÁC HÀNH ĐỘNG HỢP LỆ (VALID ACTION CATEGORIES)

1. `INTAKE_RECORDED`: Tiếp nhận tệp âm thanh thô và phiếu đồng thuận ban đầu.
2. `AUDIO_VALIDATED`: Đo lường tiêu chuẩn kỹ thuật âm học (Format, SNR, Clipping).
3. `TRANSCRIPT_VERIFIED`: Kiểm tra độ chính xác bản gỡ băng từng từ và dấu thời gian.
4. `PII_SCRUBBED`: Bóc tách thông tin nhận dạng cá nhân trên cả audio và text.
5. `SAMPLE_ACCEPTED`: Chính thức nghiệm thu mẫu vào kho dữ liệu kiểm chuẩn.
6. `SAMPLE_REJECTED`: Từ chối mẫu và chuyển sang nhật ký loại bỏ.
7. `DISPATCH_JUDGES`: Chuyển mẫu đến cổng chấm mù của 3 Giám khảo độc lập.
8. `ANNOTATION_DONE`: Thu nhận đủ 3 phiếu chấm độc lập và giải trình định tính.
9. `ADJUDICATION_HELD`: Tổ chức phiên phân xử trọng tài khi có bất đồng điểm số $>1.5$.
10. `SAMPLE_SEALED`: Niêm phong bất biến toàn bộ hồ sơ mẫu để nạp vào Calibration Engine.
