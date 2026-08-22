# NHẬT KÝ TỪ CHỐI & LOẠI BỎ MẪU KHÔNG HỢP LỆ (SAMPLE REJECTION LOG TEMPLATE v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Biểu Mẫu:** `LOG-CAL-REJECT-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/field/FIELD_DATA_COLLECTION_GUIDE_v1.md`  
> **Mục Đích:** Ghi nhận minh bạch mọi trường hợp bài nói bị từ chối tiếp nhận nhằm đảm bảo tính toàn vẹn và không sai lệch thống kê của tập dữ liệu.

---

# SỔ THEO DÕI TỪ CHỐI TIẾP NHẬN MẪU (REJECTION AUDIT LOG)

| Mã Từ Chối (Rejection ID) | Thời Gian (Timestamp) | Mã Mẫu Dự Kiến (Candidate ID) | Phân Loại Nguyên Nhân Từ Chối (Rejection Category) | Mô Tả Chi Tiết Lý Do Kỹ Thuật (Detailed Technical Reason) | Biện Pháp Xử Lý (Action Taken) | Chữ Ký Người Duyệt |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| `REJ-2026-001` | *YYYY-MM-DD HH:MM* | `CAL-SPEECH-XXX` | `[ ] AUDIO_DEFECT`<br>`[ ] SNR < 15dB`<br>`[ ] CLIPPING` | *Ví dụ: Âm thanh bị tiếng quạt công nghiệp đè liên tục, SNR = 9.2dB không đạt chuẩn.* | `[ ] Hủy bỏ hoàn toàn`<br>`[ ] Thu âm lại mẫu mới` | *(Ký duyệt)* |
| `REJ-2026-002` | *YYYY-MM-DD HH:MM* | `CAL-SPEECH-XXX` | `[ ] CONSENT_DEFECT`<br>`[ ] THIẾU GIÁM HỘ` | *Ví dụ: Thí sinh 15 tuổi nhưng không có chữ ký của phụ huynh trên phiếu tiếp nhận.* | `[ ] Hủy bỏ vĩnh viễn`<br>`[ ] Bổ sung văn bản` | *(Ký duyệt)* |
| `REJ-2026-003` | *YYYY-MM-DD HH:MM* | `CAL-SPEECH-XXX` | `[ ] TRANSCRIPT_MISMATCH`<br>`[ ] LỆCH THỜI GIAN` | *Ví dụ: Transcript bị thiếu 15 giây đoạn phản biện so với audio.* | `[ ] Gỡ băng lại từ đầu` | *(Ký duyệt)* |
| `REJ-2026-004` | *YYYY-MM-DD HH:MM* | `CAL-SPEECH-XXX` | `[ ] DURATION_BOUNDS`<br>`[ ] < 60s HOẶC > 480s` | *Ví dụ: Bài nói chỉ dài 42 giây, người nói bỏ cuộc giữa chừng.* | `[ ] Loại bỏ mẫu` | *(Ký duyệt)* |
| `REJ-2026-005` | *YYYY-MM-DD HH:MM* | `CAL-SPEECH-XXX` | `[ ] TTS_SYNTHETIC`<br>`[ ] GIỌNG AI GIẢ LẬP` | *Ví dụ: Phát hiện bài nói được sinh bằng công cụ Text-to-Speech.* | `[ ] Khóa vĩnh viễn` | *(Ký duyệt)* |

---

# DANH MỤC CÁC MÃ NGUYÊN NHÂN TỪ CHỐI CHUẨN (STANDARD REJECTION CODES)

1. `ERR-AUD-01`: Tỷ lệ tín hiệu trên nhiễu quá thấp ($\text{SNR} < 15\text{dB}$).
2. `ERR-AUD-02`: Âm thanh bị cắt đỉnh vỡ tiếng nghiêm trọng ($\text{Clipping} > 0.5\%$).
3. `ERR-AUD-03`: Có người nói đè liên tục không thể bóc tách kênh phát biểu.
4. `ERR-AUD-04`: Tệp âm thanh bị lỗi định dạng, mất header WAV, hoặc không đọc được.
5. `ERR-CNS-01`: Thiếu văn bản đồng thuận pháp lý hợp lệ của thí sinh hoặc người giám hộ.
6. `ERR-TRS-01`: Bản gỡ băng không khớp verbatim 1-to-1 với âm thanh thực tế.
7. `ERR-TRS-02`: Thiếu dấu thời gian cấp từ (*Word-level timestamps*).
8. `ERR-PII-01`: Không thể bóc tách thông tin nhận dạng cá nhân do bị lồng ghép quá sâu.
9. `ERR-DUR-01`: Thời lượng bài phát biểu nằm ngoài giới hạn cho phép ($<60$s hoặc $>480$s).
10. `ERR-SYN-01`: Phát hiện bài nói giả lập bằng AI / công cụ tổng hợp giọng nói.
