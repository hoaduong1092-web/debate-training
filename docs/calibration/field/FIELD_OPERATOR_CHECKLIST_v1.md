# DANH MỤC KIỂM TRA DÀNH CHO ĐIỀU PHỐI VIÊN HIỆN TRƯỜNG (FIELD OPERATOR CHECKLIST v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `CHK-CAL-OPERATOR-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/field/FIELD_DATA_COLLECTION_GUIDE_v1.md`  
> **Áp Dụng:** Sử dụng trực tiếp tại các buổi thu âm thực tế (CLB, giải đấu, phòng thu).

---

# BẢNG RÀ SOÁT TỪNG PHIÊN THU ÂM HIỆN TRƯỜNG

### GIAI ĐOẠN 1: CHUẨN BỊ TRƯỚC PHIÊN THU ÂM (PRE-SESSION SETUP)
- [ ] **1.1. Kiểm tra thiết bị thu âm:** Pin đầy, thẻ nhớ trống tối thiểu 16GB, micro định hướng hoạt động tốt.
- [ ] **1.2. Thiết lập thông số máy ghi âm:** PCM WAV, $44.1\text{kHz}$ hoặc $48\text{kHz}$, $24\text{-bit}$, gain mức vừa phải.
- [ ] **1.3. Khảo sát không gian thu âm:** Đảm bảo phòng kín, không có tiếng ồn máy lạnh rung rè hoặc tiếng xe cộ lấn át.
- [ ] **1.4. Chuẩn bị tài liệu giấy:** Mang đủ biểu mẫu `PARTICIPANT_INTAKE_FORM_v1.md` và bút ký.
- [ ] **1.5. Danh mục kiến nghị:** Chuẩn bị sẵn danh sách các đề tài tranh biện WSDC được phê duyệt.

### GIAI ĐOẠN 2: TRONG KHI THỰC HIỆN THU ÂM (DURING SESSION)
- [ ] **2.1. Kiểm tra pháp lý trước:** Thí sinh (và phụ huynh nếu $<18$ tuổi) đã ký phiếu tiếp nhận và đồng thuận.
- [ ] **2.2. Khoảng cách micro:** Giữ khoảng cách micro ổn định $15 - 20\text{cm}$ từ miệng người nói, có đầu bọc lọc gió (*Pop filter*).
- [ ] **2.3. Bấm giờ độc lập:** Theo dõi thời lượng phát biểu thực tế (đảm bảo đạt từ $60$s đến $480$s).
- [ ] **2.4. Không can thiệp ngắt lời:** Để thí sinh phát biểu hoàn toàn tự nhiên, không nhắc bài, không chỉnh sửa câu văn.

### GIAI ĐOẠN 3: SAU KHI KẾT THÚC THU ÂM (POST-SESSION INGESTION)
- [ ] **3.1. Sao lưu tệp tức thì:** Sao chép tệp WAV gốc vào 2 ổ cứng lưu trữ an toàn riêng biệt.
- [ ] **3.2. Đổi tên tệp chuẩn:** Đổi tên tệp thành `CAL_AUDIO_2026_XXX.wav` (xóa toàn bộ tên thí sinh trên tên tệp).
- [ ] **3.3. Bóc tách PII ban đầu:** Nghe lại để đánh dấu các mốc thời gian thí sinh phát âm tên trường/tên riêng.
- [ ] **3.4. Ghi nhận nhật ký:** Điền mã sự kiện vào `CHAIN_OF_CUSTODY_LOG_TEMPLATE_v1.md`.
- [ ] **3.5. Cất giữ phiếu đồng thuận:** Nạp phiếu giấy vào cặp hồ sơ niêm phong chuyển về Kho Ngoại Tuyến.

---

**Xác nhận hoàn thành phiên thu âm:**  
* **Mã Điều Phối Viên (Operator ID):** `OP-FIELD-________`  
* **Số Mẫu Thu Thập Được Trong Phiên:** `______ mẫu`  
* **Chữ ký Điều phối viên:** `____________________________________`  
* **Ngày:** ____ / ____ / 2026
