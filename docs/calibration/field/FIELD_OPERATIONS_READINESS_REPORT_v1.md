# BÁO CÁO NGHIỆM THU ĐỘ SẴN SÀNG CỦA BỘ CÔNG CỤ HIỆN TRƯỜNG (FIELD OPERATIONS READINESS REPORT v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `REP-CAL-FIELD-OPS-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/SCORING_FORMULA_CONTRACT_v1.md` & `docs/calibration/DATA_ACQUISITION_PLAN_v1.md`  
> **Giai Đoạn:** Post-Documentation / Field Operations Kit Deployment  
> **Ngày Lập Báo Cáo:** 21/08/2026  
> **Trạng Thái Thẩm Quyền:** 🟢 **OPERATIONAL FIELD INFRASTRUCTURE READY**

---

# 1. DANH MỤC CÁC TỆP ĐÃ KHỞI TẠO TRONG GÓI HIỆN TRƯỜNG (FILES CREATED)

Gói công cụ tác nghiệp hiện trường và quản trị hội đồng giám khảo đã được khởi tạo hoàn chỉnh tại thư mục [`docs/calibration/field/`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/):

### A. Gói Thu Thập Dữ Liệu Hiện Trường (Field Acquisition Package):
1. [`docs/calibration/field/FIELD_DATA_COLLECTION_GUIDE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/FIELD_DATA_COLLECTION_GUIDE_v1.md): Sổ tay hướng dẫn điều phối viên hiện trường 6 bước.
2. [`docs/calibration/field/PARTICIPANT_INTAKE_FORM_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/PARTICIPANT_INTAKE_FORM_v1.md): Phiếu tiếp nhận thí sinh và thông tin đồng thuận pháp lý.
3. [`docs/calibration/field/CONSENT_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/CONSENT_CHECKLIST_v1.md): Danh mục kiểm tra đồng thuận theo Nghị định 13/2023/NĐ-CP.
4. [`docs/calibration/field/AUDIO_QUALITY_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/AUDIO_QUALITY_CHECKLIST_v1.md): Danh mục kiểm định chất lượng âm học DSP ($\text{SNR} \ge 15\text{dB}$, $16\text{kHz}$).
5. [`docs/calibration/field/TRANSCRIPT_INGESTION_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/TRANSCRIPT_INGESTION_CHECKLIST_v1.md): Danh mục kiểm định bản gỡ băng và dấu thời gian cấp từ.
6. [`docs/calibration/field/PII_DEIDENTIFICATION_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/PII_DEIDENTIFICATION_CHECKLIST_v1.md): Danh mục bóc tách thông tin nhận dạng cá nhân audio/text.
7. [`docs/calibration/field/SAMPLE_ACCEPTANCE_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/SAMPLE_ACCEPTANCE_CHECKLIST_v1.md): Biên bản nghiệm thu tiếp nhận mẫu chính thức (`ACCEPTED`).
8. [`docs/calibration/field/SAMPLE_REJECTION_LOG_TEMPLATE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/SAMPLE_REJECTION_LOG_TEMPLATE_v1.md): Mẫu nhật ký từ chối và loại bỏ mẫu không đạt chuẩn.
9. [`docs/calibration/field/CHAIN_OF_CUSTODY_LOG_TEMPLATE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/CHAIN_OF_CUSTODY_LOG_TEMPLATE_v1.md): Mẫu nhật ký chuỗi hành trình và lịch sử thao tác dữ liệu.
10. [`docs/calibration/field/FIELD_OPERATOR_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/FIELD_OPERATOR_CHECKLIST_v1.md): Danh mục kiểm tra từng phiên thu âm của điều phối viên.

### B. Gói Quản Trị Hội Đồng Giám Khảo (Judge Operations Package):
11. [`docs/calibration/field/judges/JUDGE_ONBOARDING_GUIDE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/judges/JUDGE_ONBOARDING_GUIDE_v1.md): Sổ tay hướng dẫn onboarding dành cho Giám khảo WSDC.
12. [`docs/calibration/field/judges/JUDGE_INDEPENDENCE_DECLARATION_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/judges/JUDGE_INDEPENDENCE_DECLARATION_v1.md): Bản cam kết chấm điểm độc lập và công bằng vùng miền.
13. [`docs/calibration/field/judges/CONFLICT_OF_INTEREST_FORM_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/judges/CONFLICT_OF_INTEREST_FORM_v1.md): Biểu mẫu khai báo xung đột lợi ích và cam kết rút lui.
14. [`docs/calibration/field/judges/JUDGE_TRAINING_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/judges/JUDGE_TRAINING_CHECKLIST_v1.md): Danh mục tập huấn và chuẩn hóa giám khảo trên rubric WSDC.
15. [`docs/calibration/field/judges/BLIND_SCORING_GUIDE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/judges/BLIND_SCORING_GUIDE_v1.md): Hướng dẫn kỹ thuật chấm điểm mù và nguyên tắc nghe 2 lần.
16. [`docs/calibration/field/judges/ANNOTATION_SUBMISSION_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/judges/ANNOTATION_SUBMISSION_CHECKLIST_v1.md): Danh mục tự rà soát trước khi nộp phiếu chấm từng đợt.
17. [`docs/calibration/field/judges/JUDGE_EXCEPTION_LOG_TEMPLATE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/judges/JUDGE_EXCEPTION_LOG_TEMPLATE_v1.md): Biểu mẫu theo dõi sự cố, rút lui COI và bất đồng điểm số lớn.

### C. Công Cụ Kiểm Tra Hợp Lệ Dữ Liệu Tự Động (Validation Tooling):
18. [`docs/calibration/field/tools/dataset_intake_validator.ts`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/field/tools/dataset_intake_validator.ts): Công cụ kiểm tra tính toàn vẹn và hợp lệ cấu trúc của bản ghi dữ liệu trước khi nạp.

---

# 2. BÁO CÁO KIỂM SOÁT THAY ĐỔI MÃ NGUỒN & SCHEMA

* **Số lượng tệp mã nguồn backend/frontend bị chỉnh sửa:** `0`
* **Số lượng tệp Prisma schema bị chỉnh sửa:** `0`
* **Số lượng database migration được tạo:** `0`
* **Số lượng Candidate Formulas bị thăng cấp trái phép:** `0`
* **Số lượng dữ liệu synthetic / giả lập được tạo ra:** `0`

---

# 3. HIỆN TRẠNG QUẢN TRỊ DỮ LIỆU & NHÂN SỰ THỰC TẾ

```text
============================================================
FIELD OPERATIONS STATUS DASHBOARD
============================================================
• REAL SPEECH SAMPLES:          0 / 50   (Chờ thu thập hiện trường)
• HUMAN WSDC JUDGES:            0 / 3    (Chờ ký hợp đồng tuyển dụng)
• INDEPENDENT ANNOTATIONS:      0 / 150  (Chờ phiên chấm của Giám khảo con người)

• VALIDATION TOOL STATUS:       🟢 READY
• FIELD ACQUISITION PACKAGE:    🟢 READY
• JUDGE OPERATIONS PACKAGE:     🟢 READY
• BLIND JUDGING MECHANISM:      🟢 READY
• AUDIT TRAIL INFRASTRUCTURE:   🟢 READY

• AUTHORITY FIREWALL:           🟢 PASS (Tuân thủ tuyệt đối)
• CALIBRATION STATUS:           🟡 INFRASTRUCTURE READY / EXECUTION BLOCKED
                                  (Khóa thi hành cho đến khi có dữ liệu thật)
============================================================
```

---

# 4. HÀNH ĐỘNG TIẾP THEO ĐƯỢC PHÊ DUYỆT (AUTHORIZED NEXT ACTION)

### 🎯 NEXT AUTHORIZED ACTION: THỰC THI THU THẬP DỮ LIỆU HIỆN TRƯỜNG & KÝ KẾT HỘI ĐỒNG GIÁM KHẢO CON NGƯỜI (PHYSICAL COLLECTION OF REAL DATA AND HUMAN JUDGE ONBOARDING)

> **Cảnh báo bất biến:**  
> Điều phối viên và người vận hành phải trực tiếp tiếp cận học sinh, câu lạc bộ tranh biện để thu thập $50$ bài phát biểu thật và ký hợp đồng với $3$ Giám khảo WSDC con người theo đúng các biểu mẫu và quy trình đã ban hành trong bộ công cụ hiện trường này.
