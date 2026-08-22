# QUY CHẾ HỘI ĐỒNG GIÁM KHẢO KIỂM CHUẨN (JUDGE PANEL PROTOCOL v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-PANEL-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/HUMAN_JUDGE_RUBRIC_v1.md` & `docs/calibration/HUMAN_GROUND_TRUTH_PROTOCOL_v1.md`  
> **Trạng Thái Hiện Tại:** 🔴 **PANEL RECRUITMENT PENDING (CHƯA THIẾT LẬP THỰC TẾ — BLOCKED)**  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. CƠ CẤU HỘI ĐỒNG 3 GIÁM KHẢO ĐỘC LẬP (PANEL COMPOSITION)

Hội đồng Giám khảo Kiểm chuẩn bao gồm 3 Trọng tài Tranh biện chính thức và 1 Giám khảo Dự phòng:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. GIÁM KHẢO A (JUDGE-WSDC-01) — Chuyên gia Lập luận & Logic               │
│    • Tiêu chuẩn: Tối thiểu 3 năm kinh nghiệm làm Trọng tài WSDC/BP quốc gia;│
│                  có chứng chỉ công nhận bởi Liên đoàn Tranh biện Việt Nam   │
│                  hoặc các tổ chức tranh biện quốc tế uy tín.                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. GIÁM KHẢO B (JUDGE-WSDC-02) — Chuyên gia Chiến thuật Đấu trường          │
│    • Tiêu chuẩn: Huấn luyện viên (Debate Coach) đã từng dẫn dắt đội tuyển thi│
│                  đấu các giải WSDC khu vực; am hiểu sâu sắc về Core Clash   │
│                  và Impact Weighing.                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. GIÁM KHẢO C (JUDGE-WSDC-03) — Chuyên gia Ngôn ngữ học & Phong cách      │
│    • Tiêu chuẩn: Chuyên gia ngữ âm học / Giảng viên truyền thông; có năng   │
│                  lực thẩm định độ lưu loát, ngắt nghỉ và ngữ điệu mà không  │
│                  có định kiến phương ngữ vùng miền.                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. GIÁM KHẢO DỰ PHÒNG (RESERVE-JUDGE-01) — Trọng tài WSDC Dự phòng          │
│    • Sẵn sàng tiếp quản nếu một trong 3 giám khảo chính gặp sự cố bất khả   │
│                  kháng hoặc rút lui giữa chừng.                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. BỐN NGUYÊN TẮC HOẠT ĐỘNG BẮT BUỘC (MANDATORY OPERATING RULES)

1. **Nguyên Tắc Độc Lập Tuyệt Đối (Strict Independence):**
   * Ba giám khảo chấm điểm hoàn toàn độc lập, không nhìn thấy phiếu chấm của nhau và không được liên lạc thảo luận trong giai đoạn chấm cá nhân.
2. **Nguyên Tắc Chấm Mù AI (Blind to AI Telemetry & Formulas):**
   * Giám khảo không được tiếp cận bất kỳ thông tin nào về điểm số dự kiến, kết quả DSP hay phân tích của AI Coach.
3. **Nguyên Tắc Sử Dụng Chung Khung Tiêu Chí (Unified Rubric Adherence):**
   * Tất cả giám khảo bắt buộc phải tuân thủ nghiêm ngặt khung tiêu chuẩn [`HUMAN_JUDGE_RUBRIC_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/HUMAN_JUDGE_RUBRIC_v1.md) và ghi nhận lý giải sư phạm định tính vào [`JUDGE_ANNOTATION_TEMPLATE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/JUDGE_ANNOTATION_TEMPLATE_v1.md).
4. **Nguyên Tắc Không Điều Chỉnh Điểm Để Khớp AI (No AI Alignment Bias):**
   * Tuyệt đối không được định hướng giám khảo thay đổi điểm số để làm "đẹp" kết quả so sánh với Candidate Formula.

---

# 3. HIỆN TRẠNG QUẢN TRỊ HỘI ĐỒNG (CURRENT GOVERNANCE STATUS)

> ### 🔴 TÌNH TRẠNG HIỆN TẠI: PANEL NOT YET ESTABLISHED (CHƯA THIẾT LẬP)
> * **Số lượng giám khảo thực tế đã ký hợp đồng:** `0 / 3`
> * **Số lượng bài chấm thực tế đã thực hiện:** `0 / 150`
> * **Tình trạng tiến trình:** **`BLOCKED PENDING RECRUITMENT & ONBOARDING`**
> * **Cảnh báo:** Tuyệt đối cấm tạo danh tính giả lập hoặc tự gán nhãn giám khảo con người cho AI Agent.
