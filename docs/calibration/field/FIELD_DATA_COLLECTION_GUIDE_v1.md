# SỔ TAY HƯỚNG DẪN THU THẬP DỮ LIỆU THỰC TẾ (FIELD DATA COLLECTION GUIDE v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `GUI-CAL-FIELD-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/DATA_ACQUISITION_PLAN_v1.md` & `docs/calibration/CALIBRATION_PROTOCOL_v1.md`  
> **Phạm Vi Áp Dụng:** Dành cho Điều phối viên hiện trường (Field Operators) thu thập $N = 50$ bài nói thực tế  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. QUY TRÌNH THU THẬP DỮ LIỆU HIỆN TRƯỜNG 6 BƯỚC

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: TIẾP CẬN THÍ SINH & GIẢI THÍCH MỤC ĐÍCH NGHIÊN CỨU                 │
│         Giải thích rõ mục đích nghiên cứu sư phạm, không thương mại hóa.   │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 2: KÝ VĂN BẢN ĐỒNG THUẬN (Consent Verification)                      │
│         Ký PARTICIPANT_INTAKE_FORM & CONSENT_CHECKLIST (Người giám hộ nếu  │
│         thí sinh < 18 tuổi).                                               │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 3: THIẾT LẬP THIẾT BỊ & THU ÂM TIÊU CHUẨN                            │
│         Micro thu âm định hướng, khoảng cách 15-20cm, PCM WAV >= 16kHz.    │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 4: THỰC THI BÀI PHÁT BIỂU & GHI NHẬN METADATA                        │
│         Ghi nhận thời lượng, kiến nghị, phe (Aff/Neg), vị trí người nói.   │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 5: KHỬ ĐỊNH DANH & BÓC TÁCH PII (De-identification)                   │
│         Gán mã SPK-ANON-xxxx, làm mờ tên riêng/trường học trên audio & text.│
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 6: TẠO MÃ BĂM SHA-256 & BÀN GIAO KHO LƯU TRỮ                         │
│         Niêm phong tệp âm thanh và transcript, cập nhật Register.          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. QUY TRÌNH CHUYỂN TRẠNG THÁI MẪU (SAMPLE LIFECYCLE STATE MACHINE)

Mỗi mẫu bài phát biểu chỉ được phép chuyển trạng thái theo đúng quy trình tuần tự:

```text
  [PLANNED] (Lên kế hoạch ca kiểm thử trong Casebook)
      │
      ▼ (Sau khi thu âm tệp thực tế)
  [RECEIVED] (Tiếp nhận tệp thô tại hiện trường)
      │
      ▼ (Chạy bộ kiểm tra Audio/Transcript/Consent)
  [VALIDATING]
     ├──► [REJECTED] (Lỗi chất lượng âm thanh hoặc thiếu văn bản đồng thuận)
     │         └──► Ghi vào SAMPLE_REJECTION_LOG_TEMPLATE_v1.md
     │
     └──► [ACCEPTED] (Đạt 100% tiêu chí tiếp nhận)
               │
               ▼ (Chuyển giao cho 3 Giám khảo chấm mù độc lập)
          [ANNOTATING]
               │
               ▼ (Đủ 3 phiếu chấm hợp lệ + phân xử nếu có bất đồng)
          [ANNOTATED]
               │
               ▼ (Khóa bất biến phục vụ phân tích Model-vs-Human)
          [SEALED]
```

---

# 3. NGUYÊN TẮC BẤT KHẢ XÂM PHẠM CHO ĐIỀU PHỐI VIÊN HIỆN TRƯỜNG

1. **Cấm Giả Mạo Thí Sinh / Dữ Liệu:** Tuyệt đối không tự thu âm bài nói giả lập, không sử dụng công cụ AI (TTS/LLM) để tạo mẫu.
2. **Bảo Vệ Quyền Riêng Tư (Nghị định 13/2023/NĐ-CP):** Không lưu trữ thông tin nhận dạng cá nhân (họ tên, trường lớp, số điện thoại) trên các thư mục mở.
3. **Tính Toàn Vẹn Của Dữ Liệu Gốc:** Tệp âm thanh sau khi thu âm không được qua xử lý lọc giọng nhân tạo làm biến dạng đặc trưng cao độ ($F_0$) và tốc độ phát âm tự nhiên của học sinh.
