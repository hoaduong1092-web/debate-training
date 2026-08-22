# BIÊN BẢN NGHIỆM THU TIẾP NHẬN BÀI NÓI (SAMPLE ACCEPTANCE CHECKLIST v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `CHK-CAL-ACCEPT-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/CALIBRATION_DATASET_SCHEMA_v1.md`  
> **Điều Kiện Chuyển Trạng Thái:** Mẫu chỉ được chuyển từ `VALIDATING` $\longrightarrow$ `ACCEPTED` khi thỏa mãn đồng thời 6 điều kiện nghiệm thu dưới đây.

---

# BẢNG TỔNG HỢP NGHIỆM THU TIẾP NHẬN MẪU KIỂM CHUẨN

| STT | Cổng Nghiệm Thu Chuyên Môn (Acceptance Gate) | Bằng Chứng / Tài Liệu Đối Soát | Trạng Thái Rà Soát |
| :---: | :--- | :--- | :---: |
| 1 | **Đồng Thuận Pháp Lý Đạt 100% (Consent Passed)** | Phiếu `CONSENT_CHECKLIST_v1.md` đạt 8/8 mục, có mã `CNS-2026-XXXX`. | `[ ] PASS` `[ ] FAIL` |
| 2 | **Chất Lượng Âm Học Đạt 100% (Audio Passed)** | Phiếu `AUDIO_QUALITY_CHECKLIST_v1.md` đạt 9/9 mục ($\ge 16\text{kHz}$, $\text{SNR} \ge 15\text{dB}$). | `[ ] PASS` `[ ] FAIL` |
| 3 | **Độ Toàn Vẹn Bản Gỡ Băng (Transcript Passed)**| Phiếu `TRANSCRIPT_INGESTION_CHECKLIST_v1.md` đạt 7/7 mục (Word Timestamps đầy đủ). | `[ ] PASS` `[ ] FAIL` |
| 4 | **Khử Định Danh Hoàn Tất (PII Sanitized)** | Phiếu `PII_DEIDENTIFICATION_CHECKLIST_v1.md` đạt 7/7 mục, đã khử PII audio & text. | `[ ] PASS` `[ ] FAIL` |
| 5 | **Định Vị Ca Kiểm Thử (Casebook Assigned)** | Mẫu được gán mục tiêu kịch bản trong `CALIBRATION_CASEBOOK_v1.md` (TC-01 đến TC-25). | `[ ] PASS` `[ ] FAIL` |
| 6 | **Khóa Bất Biến & Ghi Sổ Kiểm Kê (Registered)** | Cập nhật mã băm SHA-256 vào `CALIBRATION_DATASET_REGISTER_v1.md`, chuyển `ACCEPTED`. | `[ ] PASS` `[ ] FAIL` |

---

# PHÁN QUYẾT TIẾP NHẬN MẪU (FINAL ACCEPTANCE DECISION)

* **Mã Bài Nói Được Nghiệm Thu:** `CAL-SPEECH-2026-______`
* **Mã Thí Sinh Ẩn Danh:** `SPK-ANON-____________`
* **Kịch Bản Kiểm Thử Được Ánh Xạ:** `[ ] TC-____`
* **Mã Băm Âm Thanh SHA-256:** `________________________________________________________________`
* **Mã Băm Transcript SHA-256:** `________________________________________________________________`

### QUYẾT ĐỊNH CỦA TRƯỞNG BAN THU THẬP DỮ LIỆU:
* `[ ] CHÍNH THỨC TIẾP NHẬN (ACCEPTED)` $\longrightarrow$ Chuyển mẫu sang phân vùng chờ phân phối cho Giám khảo.
* `[ ] TỪ CHỐI TIẾP NHẬN (REJECTED)` $\longrightarrow$ Ghi nhận lý do vào `SAMPLE_REJECTION_LOG_TEMPLATE_v1.md`.

**Trưởng Ban Thu Thập Dữ Liệu (Họ tên & Chữ ký):** `____________________________________`  
**Thời Gian Nghiệm Thu:** `____-__-__ __:__:__ (UTC+7)`
