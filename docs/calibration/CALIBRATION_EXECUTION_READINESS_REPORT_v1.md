# BÁO CÁO ĐỘ SẴN SÀNG THI HÀNH THU THẬP DỮ LIỆU & TUYỂN DỤNG GIÁM KHẢO (CALIBRATION EXECUTION READINESS REPORT v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `REP-CAL-EXEC-READINESS-v1.0.0`  
> **Source of Truth Thẩm Quyền:**  
> 1. Master Blueprint v16.x (`ai-debate-co-creation-chatlog-v16.md`)  
> 2. `docs/SCORING_FORMULA_CONTRACT_v1.md`  
> 3. `docs/SCORING_CONTRACT_FINAL_PRECALIBRATION_AUDIT.md`  
> 4. Toàn bộ 13 tài liệu tại thư mục `docs/calibration/*`  
> **Giai Đoạn Dự Án:** Post-Documentation / Pre-Calibration Execution  
> **Ngày Lập Báo Cáo:** 21/08/2026  
> **Trạng Thái Thẩm Quyền:** 🟢 **READY FOR FIELD ACQUISITION & ONBOARDING**

---

# 1. XÁC MINH TOÀN VẸN QUY CHUẨN THẨM QUYỀN (PHASE A: PROTOCOL VERIFICATION)

Ban Giám định đã tiến hành đối soát toàn diện 16 tài liệu thẩm quyền bắt buộc:
* **Kết quả đối soát chéo:** Không phát hiện bất kỳ xung đột thẩm quyền (*Governance Conflict*) nào giữa Master Blueprint v16, Hợp đồng Scoring Contract v1 và 13 tài liệu trong bộ `docs/calibration/*`.
* **Tính đồng nhất của Tường lửa Thẩm quyền:**
  * Bất biến `INVARIANT-SCORE-01 (No Implicit Promotion)`: Tuân thủ 100%. Toàn bộ 9 công thức Candidate giữ nguyên trạng thái `CANDIDATE`, cờ `promotion_eligible: false`.
  * Bất biến `INVARIANT-SCORE-02 (No Synthetic Ground Truth)`: Tuân thủ 100%. Xác lập rõ ràng không sử dụng kết quả Unit Test, dữ liệu AI tự tạo hay mock data làm Ground Truth.
* **Bảo vệ Tính Toàn Vẹn Mã Nguồn:** Không có bất kỳ dòng code backend, frontend, unit test hay Prisma schema nào bị chỉnh sửa. Toàn bộ 7 mục Implementation Drift được cô lập an toàn ở trạng thái `PENDING_APPROVAL` (`Allowed to Fix Now = NO`).

---

# 2. GÓI HẠ TẦNG THU THẬP DỮ LIỆU THỰC TẾ (PHASE B & C: ACQUISITION PACKAGE)

Gói công cụ và quy chuẩn thu thập mẫu thực tế đã được đóng gói hoàn chỉnh:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. QUY ƯỚC ĐỊNH DANH MẪU (Sample ID Convention):                            │
│    • Định dạng mã bài nói:    CAL-SPEECH-2026-001 -> CAL-SPEECH-2026-050    │
│    • Định dạng mã thí sinh:   SPK-ANON-XXXX (Khử định danh hoàn toàn)       │
│    • Định dạng mã tệp âm thanh: CAL_AUDIO_2026_XXX.wav                       │
│    • Định dạng mã transcript: CAL_TRANSCRIPT_2026_XXX.json                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. TIÊU CHUẨN KỸ THUẬT ÂM THANH & BẢN GỠ BĂNG (Audio & Transcript Specs):   │
│    • Âm thanh: PCM WAV >= 16kHz, mono/stereo, SNR >= 15dB.                  │
│    • Transcript: Gắn nhãn Word-level Timestamps, kiểm tra dấu Tiếng Việt.   │
│    • Mã băm toàn vẹn: SHA-256 niêm phong ngay sau khi thu nạp (Read-Only).  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. DANH MỤC THỦ TỤC PHÁP LÝ & ĐỒNG THUẬN (Legal & Privacy Checklists):      │
│    • Văn bản đồng thuận tham gia nghiên cứu (Informed Consent Form).        │
│    • Quy trình bóc tách thông tin định danh cá nhân (PII Scrubbing).        │
│    • Sổ theo dõi quyền sở hữu và chuỗi hành trình dữ liệu (Chain of Custody)│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. MA TRẬN ĐỘ PHỦ 25 CA KIỂM CHUẨN (PHASE D: 25-CASE COVERAGE STATUS)

Đã đối soát Sổ tay `CALIBRATION_CASEBOOK_v1.md` với danh mục 50 bài nói thực tế:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ • TỔNG SỐ KỊCH BẢN KIỂM CHUẨN:     25 Kịch bản (TC-01 -> TC-25)             │
│ • SỐ LƯỢNG MẪU PHÂN BỔ MỤC TIÊU:   50 Bài nói (Mỗi kịch bản tối thiểu 2 mẫu)│
│ • ĐỘ PHỦ VỀ MẶT THIẾT KẾ (Design): 🟢 100% HOÀN TẤT                         │
│ • ĐỘ PHỦ THỰC TẾ HIỆN TẠI (Actual): 🔴 INCOMPLETE (Pending Real Acquisition) │
├─────────────────────────────────────────────────────────────────────────────┤
│ Phân định rõ ràng:                                                          │
│ - 10 Ca Cổng Quy Chuẩn (TC-01, 05, 08, 11, 12, 14, 18, 21, 22, 25):         │
│   ➔ Xác định theo luật Frozen của Blueprint v16 (DETERMINISTIC).            │
│ - 15 Ca Hiệu Chuẩn Ứng Viên (TC-02, 03, 04, 06, 07, 09, 10, 13, 15, 16,    │
│   17, 19, 20, 23, 24):                                                      │
│   ➔ Dải điểm chỉ là CALIBRATION TARGET, cấm coi là Oracle chấp thuận cứng.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. GÓI QUY CHUẨN ONBOARDING HỘI ĐỒNG GIÁM KHẢO (PHASE E & F: JUDGE ONBOARDING)

Hạ tầng và tài liệu bàn giao cho 3 Giám khảo WSDC con người đã sẵn sàng:
1. **Quy ước mã giám khảo:** `JUDGE-WSDC-01`, `JUDGE-WSDC-02`, `JUDGE-WSDC-03` (và `RESERVE-JUDGE-01`).
2. **Bộ tài liệu bàn giao:**
   * Khung tiêu chí WSDC 3 miền: [`HUMAN_JUDGE_RUBRIC_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/HUMAN_JUDGE_RUBRIC_v1.md).
   * Phiếu chấm điểm và giải trình: [`JUDGE_ANNOTATION_TEMPLATE_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/JUDGE_ANNOTATION_TEMPLATE_v1.md).
   * Quy chế chấm mù và giải quyết bất đồng: [`HUMAN_GROUND_TRUTH_PROTOCOL_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/calibration/HUMAN_GROUND_TRUTH_PROTOCOL_v1.md).
   * Cam kết không thiên vị giọng vùng miền (*Accent Fairness Commitment*).
   * Cam kết không xung đột lợi ích (*Conflict of Interest Declaration*).
3. **Cơ chế chấm mù tuyệt đối:** Giám khảo bị chặn hoàn toàn quyền truy cập điểm AI, telemetry âm học, và không nhìn thấy điểm của giám khảo khác trong quá trình chấm cá nhân.

---

# 5. BẢO VỆ DỮ LIỆU, QUYỀN RIÊNG TƯ & AN TOÀN PHÁP LÝ (PHASE G & H: PRIVACY & INTEGRITY)

* **Tuân thủ pháp luật:** Đáp ứng toàn diện quy định của Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
* **Xử lý PII:** $100\%$ tên người nói, tên trường học, số điện thoại hoặc địa danh nhạy cảm được làm mờ trên tệp âm thanh và thay thế bằng `[REDACTED_PII]` trong transcript trước khi chuyển cho giám khảo.
* **Kiểm tra tính toàn vẹn:** Hệ thống từ chối nạp mẫu nếu: (1) Tệp âm thanh bị lỗi đọc, (2) Mã băm SHA-256 bị trùng lặp, (3) Thiếu văn bản đồng thuận hợp lệ.

---

# 6. HIỆN TRẠNG SỔ ĐĂNG KÝ KIỂM KÊ (PHASE I: DATASET REGISTER STATUS)

Sổ đăng ký kiểm kê phản ánh trung thực và khách quan hiện trạng vật lý hiện tại:

```text
============================================================
CALIBRATION DATASET REGISTER ACTUAL STATE (CALIBRATION-WSDC-v1.0.0)
============================================================
• REAL SPEECH SAMPLES COLLECTED:    0 / 50   (0.0%)  [🔴 PENDING ACQUISITION]
• HUMAN JUDGES ONBOARDED:           0 / 3    (0.0%)  [🔴 PENDING CONTRACTS]
• INDEPENDENT HUMAN ANNOTATIONS:    0 / 150  (0.0%)  [🔴 NOT STARTED]
• HUMAN GROUND TRUTH STATUS:        NOT AVAILABLE    [🔴 NOT ESTABLISHED]
• FORMULA PROMOTION GATE:           BLOCKED          [🔴 PREREQUISITES PENDING]
• PRODUCTION CODE REMEDIATION:      FORBIDDEN        [🚫 STRICTLY PROHIBITED]
============================================================
```

---

# 7. NGHIỆM THU DANH MỤC TIỀN KIỂM CHUẨN (PHASE J: PRE-CALIBRATION GATE)

Bảng nghiệm thu 12 điều kiện kỹ thuật và 2 điều kiện vật lý:

| Nhóm Điều Kiện Tiên Quyết | Số Hạng Mục | Kết Quả Đánh Giá | Nhận Định Trạng Thái |
| :--- | :---: | :---: | :--- |
| **1. Hạ tầng Tài liệu, Hợp đồng & Pháp lý** | 12 / 12 | 🟢 **100% PASS** | Hợp đồng, Lược đồ, Rubric, Template, Casebook, Protocol, Privacy Plan đều sẵn sàng. |
| **2. Dữ liệu Thực tế & Nhân sự Giám khảo** | 0 / 2 | 🔴 **BLOCKED** | Chưa thu thập 50 bài nói thực tế và chưa ký hợp đồng 3 Giám khảo WSDC con người. |
| **➔ KẾT LUẬN CỔNG TIỀN KIỂM CHUẨN:** | — | 🟡 **BLOCKED FOR EXECUTION** | **SẴN SÀNG THỰC THI THU THẬP — CHƯA THỂ CHẠY KIỂM CHUẨN THỰC NGHIỆM** |

---

# 8. DANH MỤC VẤN ĐỀ GÂY NGHẼN (BLOCKING ISSUES)

Chỉ có 2 điều kiện nghẽn vật lý duy nhất ngăn cản việc chạy kiểm chuẩn:
1. 🔴 **BLOCKER-01 (Physical Samples Missing):** Cần thu thập đủ 50 bài phát biểu thực tế của học sinh Việt Nam theo đúng phân tầng vùng miền và trình độ.
2. 🔴 **BLOCKER-02 (Judge Onboarding Pending):** Cần ký hợp đồng và bàn giao bộ tài liệu chấm mù cho 3 Giám khảo WSDC con người.

---

# 9. HÀNH ĐỘNG TIẾP THEO ĐƯỢC CẤP PHÉP CHÍNH THỨC (AUTHORIZED NEXT ACTION)

### 🎯 NEXT AUTHORIZED ACTION: TRIỂN KHAI THU THẬP MẪU BÀI NÓI THỰC TẾ & KÝ KẾT HỘI ĐỒNG GIÁM KHẢO (DEPLOY FIELD DATA ACQUISITION & ISSUE JUDGE CONTRACTS)

> **Ràng buộc an toàn tuyệt đối:**  
> * Tuyệt đối **KHÔNG SỬA MÃ NGUỒN (NO CODE REMEDIATION)**.  
> * Tuyệt đối **KHÔNG TẠO DỮ LIỆU GIẢ (NO SYNTHETIC DATA GENERATION)**.  
> * Tuyệt đối **KHÔNG NÂNG CẤP CÔNG THỨC (NO FORMULA PROMOTION)** cho đến khi có đủ 150 phiếu chấm thực tế từ 3 Giám khảo con người và có văn bản phê duyệt của Product Owner.
