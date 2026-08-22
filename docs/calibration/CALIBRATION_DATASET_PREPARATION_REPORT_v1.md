# BÁO CÁO TỔNG KẾT GIAI ĐOẠN CHUẨN BỊ TẬP DỮ LIỆU KIỂM CHUẨN (CALIBRATION DATASET PREPARATION REPORT v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Báo Cáo:** `REP-CAL-PREP-v1.0.0`  
> **Source of Truth Thẩm Quyền:** Master Blueprint v16.x & `docs/SCORING_FORMULA_CONTRACT_v1.md`  
> **Trạng Thái Giai Đoạn:** 🟢 **DOCUMENTATION & INFRASTRUCTURE READY (READY FOR DATA ACQUISITION)**  
> **Ngày Lập Báo Cáo:** 21/08/2026

---

# 1. DANH MỤC CÁC TỆP ĐÃ KHỞI TẠO (FILES CREATED)

Hệ thống tài liệu và hạ tầng kiểm chuẩn hoàn chỉnh đã được thiết lập đầy đủ tại thư mục [`debate-training/docs/calibration/`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/):

1. [`docs/calibration/CALIBRATION_PROTOCOL_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/CALIBRATION_PROTOCOL_v1.md): Quy trình kiểm chuẩn điểm số v1.
2. [`docs/calibration/CALIBRATION_DATASET_SCHEMA_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/CALIBRATION_DATASET_SCHEMA_v1.md): Cấu trúc lược đồ dữ liệu 50 mẫu kiểm chuẩn v1.
3. [`docs/calibration/HUMAN_JUDGE_RUBRIC_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/HUMAN_JUDGE_RUBRIC_v1.md): Khung hướng dẫn và tiêu chí chấm điểm chuẩn WSDC cho giám khảo con người v1.
4. [`docs/calibration/JUDGE_ANNOTATION_TEMPLATE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/JUDGE_ANNOTATION_TEMPLATE_v1.md): Mẫu phiếu chấm điểm độc lập v1.
5. [`docs/calibration/CALIBRATION_CASEBOOK_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/CALIBRATION_CASEBOOK_v1.md): Sổ tay ánh xạ 25 ca kiểm chuẩn vào tập 50 bài nói v1.
6. [`docs/calibration/HUMAN_GROUND_TRUTH_PROTOCOL_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/HUMAN_GROUND_TRUTH_PROTOCOL_v1.md): Quy trình thiết lập và phân xử Human Ground Truth v1.
7. [`docs/calibration/CALIBRATION_METRICS_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/CALIBRATION_METRICS_v1.md): Đặc tả các công thức toán học đo lường sai số và độ đồng thuận v1.
8. [`docs/calibration/FORMULA_PROMOTION_GATE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/FORMULA_PROMOTION_GATE_v1.md): Quy chế cổng phê duyệt nâng cấp công thức Candidate lên Frozen v1.
9. [`docs/calibration/DATA_ACQUISITION_PLAN_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/DATA_ACQUISITION_PLAN_v1.md): Kế hoạch thu thập dữ liệu thực tế và bảo vệ quyền riêng tư theo Nghị định 13/2023/NĐ-CP v1.
10. [`docs/calibration/JUDGE_PANEL_PROTOCOL_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/JUDGE_PANEL_PROTOCOL_v1.md): Quy chế tổ chức Hội đồng 3 Giám khảo WSDC độc lập v1.
11. [`docs/calibration/CALIBRATION_DATASET_REGISTER_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/CALIBRATION_DATASET_REGISTER_v1.md): Sổ đăng ký kiểm kê 50 bài nói kiểm chuẩn v1.
12. [`docs/calibration/PRE_CALIBRATION_CHECKLIST_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/PRE_CALIBRATION_CHECKLIST_v1.md): Danh mục kiểm tra độ sẵn sàng tiền kiểm chuẩn v1.
13. [`docs/calibration/CALIBRATION_DATASET_PREPARATION_REPORT_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/CALIBRATION_DATASET_PREPARATION_REPORT_v1.md): Báo cáo tổng kết giai đoạn chuẩn bị dữ liệu kiểm chuẩn v1.

---

# 2. DANH MỤC CÁC TỆP BỊ CHỈNH SỬA (FILES MODIFIED)

* **Số lượng tệp bị chỉnh sửa:** **`0`** (Không có bất kỳ tệp tài liệu hay mã nguồn nào ngoài thư mục `docs/calibration/` bị chỉnh sửa).

---

# 3. DANH MỤC CÁC TỆP QUY CHUẨN THẨM QUYỀN ĐÃ ĐỐI SOÁT (SOURCE-OF-TRUTH INSPECTED)

1. Master Blueprint v16 (`ai-debate-co-creation-chatlog-v16.md`, Chương 16 & 17).
2. Master Handoff Spec (`15_new ChatGPT-Chỉnh sửa thông báo trường học-20260821-1401.md`).
3. [`docs/SCORING_FORMULA_CONTRACT_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/SCORING_FORMULA_CONTRACT_v1.md).
4. [`docs/SCORING_CONTRACT_FINAL_PRECALIBRATION_AUDIT.md`](file:///d:/Projects/The_Debate/debate-training/docs/SCORING_CONTRACT_FINAL_PRECALIBRATION_AUDIT.md).
5. Các tài liệu đặc tả: `00_MASTER_SPEC.md`, `02_DOMAIN_SPEC.md`, `03_DATABASE_SPEC.md`, `07_SCORING_SPEC.md`, `08_VOICE_ENGINE_SPEC.md`, `13_SYSTEM_PROMPTS.md`, `18_POST_MATCH_DIAGNOSTIC_SPEC.md`.
6. Các tệp mã nguồn backend & schema: `radarCalculator.ts`, `voiceTelemetry.ts`, `skillLevelScorers.ts`, `voiceDspService.ts`, `logicCoachParser.ts`, `debateController.ts`, `schema.prisma`, `profileAnalytics.test.ts`.

---

# 4. BÁO CÁO XÁC MINH CÁC BẤT BIẾN THẨM QUYỀN (AUTHORITY INVARIANTS)

* **`INVARIANT-SCORE-01 (No Implicit Promotion)`:** Toàn bộ 9 công thức Candidate được giữ nguyên trạng thái `CANDIDATE`, cờ `promotion_eligible: false`. Không có bất kỳ hành vi nâng cấp ngầm nào.
* **`INVARIANT-SCORE-02 (No Synthetic Ground Truth)`:** Hệ thống ghi nhận trạng thái `Human Ground Truth = NOT AVAILABLE (0/150)`. Tuyệt đối không dùng dữ liệu synthetic từ unit test làm Ground Truth.
* **`Code Freeze & Schema Integrity`:** Giữ nguyên 100% mã nguồn backend, không tạo migration, không can thiệp database runtime.

---

# 5. TỔNG HỢP HIỆN TRẠNG 8 HẠNG MỤC CỐT LÕI

| Hạng Mục (Dimension) | Hiện Trạng (Status) | Đánh Giá Chi Tiết |
| :--- | :---: | :--- |
| **1. Dataset Schema** | 🟢 **READY** | Lược đồ TypeScript/JSON hoàn chỉnh, phân lập rõ Layer 1, Human Ground Truth, và Candidate Outputs. |
| **2. Judge Protocol** | 🟢 **READY** | Quy chuẩn 3 giám khảo độc lập, chấm mù, không tiếp cận điểm AI, có quy trình xử lý bất đồng chặt chẽ. |
| **3. Privacy & Consent** | 🟢 **READY** | Tuân thủ Nghị định 13/2023/NĐ-CP, khử định danh `SPK-ANON-xxxx`, bóc tách PII và mã hóa AES-256. |
| **4. 25-Case Coverage** | 🟢 **READY** | Toàn bộ 25 kịch bản kiểm thử được định vị mục tiêu thu thập trong Casebook, phân định rõ Gate vs Target. |
| **5. Spec Gap Status** | 🟢 **PRESERVED** | Bảo toàn trọn vẹn 8 SPEC GAPs (Lookup sao, Sufficiency, Core Clash, Syllables, Windmiller penalty...). |
| **6. Implementation Drift**| 🟢 **QUARANTINED** | Cô lập an toàn 7 mục Drift (Fallacy penalty, Session aggregation, Legacy spec...) ở trạng thái `PENDING_APPROVAL`. |
| **7. Real Dataset Status** | 🔴 **NOT COLLECTED** | `0 / 50` bài phát biểu thực tế (Sẵn sàng bước vào giai đoạn thu thập dữ liệu). |
| **8. Human Judge Status** | 🔴 **NOT ONBOARDED** | `0 / 3` giám khảo WSDC chính thức ký hợp đồng. |

---

# 6. ĐIỀU KIỆN GÂY NGHẼN CHO BƯỚC FORMULA PROMOTION (BLOCKING CONDITIONS)

Để tiến hành cuộc họp xét thăng cấp công thức (**Formula Promotion Gate**), hệ thống bắt buộc phải giải tỏa 2 điều kiện nghẽn thực tế:
1. 🔴 **BLOCKER-01:** Hoàn tất thu thập đủ 50 tệp âm thanh/transcript thực tế từ học sinh Việt Nam.
2. 🔴 **BLOCKER-02:** Hoàn tất việc chấm điểm mù độc lập của 3 giám khảo WSDC (đủ 150 phiếu chấm hợp lệ).

---

# 7. HÀNH ĐỘNG TIẾP THEO ĐƯỢC PHÊ DUYỆT (AUTHORIZED NEXT ACTION)

### 🎯 AUTHORIZED NEXT ACTION: THỰC THI THU THẬP DỮ LIỆU THỰC TẾ & TUYỂN DỤNG HỘI ĐỒNG GIÁM KHẢO (EXECUTION OF REAL DATA ACQUISITION & JUDGE ONBOARDING)

Theo đúng kế hoạch [`DATA_ACQUISITION_PLAN_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/DATA_ACQUISITION_PLAN_v1.md) và [`JUDGE_PANEL_PROTOCOL_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/JUDGE_PANEL_PROTOCOL_v1.md).
