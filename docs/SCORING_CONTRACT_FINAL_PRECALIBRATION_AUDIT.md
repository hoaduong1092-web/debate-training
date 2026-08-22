# BÁO CÁO GIÁM ĐỊNH ĐÓNG HỢP ĐỒNG & ĐÁNH GIÁ ĐỘ SẴN SÀNG KIỂM CHUẨN (FINAL SCORING CONTRACT CLOSURE & CALIBRATION READINESS AUDIT)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Tài Liệu Được Giám Định:** [`debate-training/docs/SCORING_FORMULA_CONTRACT_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/SCORING_FORMULA_CONTRACT_v1.md)  
> **Source of Truth Tối Cao:** Master Blueprint v16.x (`ai-debate-co-creation-chatlog-v16.md`) & Master Handoff Spec (`15_new ChatGPT-Chỉnh sửa thông báo trường học-20260821-1401.md`)  
> **Cơ Quan Giám Định:** Ban Giám Định Độc Lập Kiến Trúc Hệ Thống & Chuẩn Hóa Tranh Biện Quốc Tế  
> **Ngày Lập Báo Cáo:** 21/08/2026  
> **Trạng Thái Thẩm Quyền:** 🟢 **FINAL PRE-CALIBRATION AUDIT = PASS**

---

# 1. PHÁN QUYẾT ĐIỀU HÀNH (EXECUTIVE VERDICT)

### 🟢 CONTRACT READY WITH CONDITIONS
**(HỢP ĐỒNG ĐÃ ĐẠT CHUẨN THẨM QUYỀN VÀ SẴN SÀNG BƯỚC VÀO GIAI ĐOẠN CHUẨN BỊ DỮ LIỆU THỰC TẾ)**

### Tóm Tắt Phán Quyết:
1. **Authority Firewall (Tường Lửa Thẩm Quyền):** `SCORING_FORMULA_CONTRACT_v1.md` đã tuân thủ tuyệt đối trật tự phân cấp thẩm quyền của Master Blueprint v16. Không có bất kỳ công thức `CANDIDATE`, `CONFIRMED PRINCIPLE`, hay `SPEC GAP` nào bị tự động nâng cấp (*Implicit Promotion*) thành `FROZEN`.
2. **Ground Truth Boundary:** Xác lập bất biến cấm đồng nhất kết quả Unit Test với tính chuẩn xác sư phạm (*Pedagogical Validity*) hoặc sự đồng thuận của trọng tài WSDC (*Human Judge Agreement*).
3. **Drift Isolation:** 7 điểm sai lệch mã nguồn (*Implementation Drift*) đã được cô lập hoàn toàn vào sổ đăng ký và đóng băng trạng thái chờ duyệt (*PENDING_APPROVAL*), không bị sửa đổi tùy tiện.
4. **Authorized Next Step:** Bước đi tiếp theo hợp lệ duy nhất được cấp phép là **`CALIBRATION DATASET PREPARATION` (Chuẩn Bị Tập Mẫu Kiểm Chuẩn Thực Tế)**, tuyệt đối **KHÔNG PHẢI LÀ SỬA MÃ NGUỒN (CODE REMEDIATION)**.

---

# 2. XÁC MINH TƯỜNG LỬA THẨM QUYỀN (AUTHORITY FIREWALL VERIFICATION)

| Bất Biến / Quy Tắc Quản Trị | Trạng Thái Kiểm Tra | Bằng Chứng Đối Soát Thực Tế (Evidence) | Kết Luận Tuân Thủ |
| :--- | :---: | :--- | :---: |
| **INVARIANT-SCORE-01 (No Implicit Promotion)** | 🟢 PASS | Mục 2 & Mục 6 của Contract v1 đã dán nhãn `formula_status: CANDIDATE` và `promotion_eligible: false` cho toàn bộ 9 mục công thức vi mô. | **TUÂN THỦ TUYỆT ĐỐI** |
| **INVARIANT-SCORE-02 (No Synthetic Ground Truth)** | 🟢 PASS | Mục 2 & Mục 10 tuyên bố rõ tệp `profileAnalytics.test.ts` ($25/25$ PASS) chỉ chứng minh *Implementation Arithmetic Correctness*. | **TUÂN THỦ TUYỆT ĐỐI** |
| **Phân Lập 4 Tầng Kiến Trúc (4-Layer Scoring)** | 🟢 PASS | Mục 3 phân tách rõ ràng: Layer 1 (Raw Measurements), Layer 2 (Normalized Features), Layer 3 (Domain Formulas), Layer 4 (Session Aggregation). | **TUÂN THỦ TUYỆT ĐỐI** |
| **Cô Lập Implementation Drift** | 🟢 PASS | Mục 12 ghi nhận 7 điểm Drift mã nguồn với trạng thái `PENDING_APPROVAL` và khóa cứng `Allowed to Fix Now = NO`. | **TUÂN THỦ TUYỆT ĐỐI** |
| **Đăng Ký Toàn Diện SPEC GAPs** | 🟢 PASS | Mục 5 và Mục 6 của Contract ghi nhận đầy đủ 7 SPEC GAP toán học, không tự ý điền công thức giả định. | **TUÂN THỦ TUYỆT ĐỐI** |
| **Bảo Vệ Tính Toàn Vẹn Mã Nguồn & Schema** | 🟢 PASS | Toàn bộ các tệp TypeScript và Prisma schema được giữ nguyên 100%, không phát sinh commit sửa code trái phép. | **TUÂN THỦ TUYỆT ĐỐI** |

---

# 3. MA TRẬN THẨM QUYỀN TOÀN BỘ CÔNG THỨC (FORMULA AUTHORITY MATRIX)

| Thành Phần Chấm Điểm | Biểu Thức Toán Học / Quy Chuẩn | Nguồn Thẩm Quyền | Authority Status | Promotion Eligible? | Calibration Required? | Human Validation? | Implementation Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Session Aggregation** | $\text{Score}_{\text{Total}} = 0.40C + 0.20S + 0.40V$ | Blueprint v16 (§17.1) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🔴 DRIFT (debateController) |
| **Content Raw Score** | $C_{\text{raw}} = 0.30L + 0.20E + 0.15\text{CRE} + 0.25R + 0.10A$ | Blueprint v16 (§17.2) | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 TBD |
| **Evidence Model** | $\text{EvidenceContrib} = \text{Presence} \times E_{\text{quality}}$ | Blueprint v16 (§17.2) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🔴 DRIFT (radarCalculator) |
| **Evidence Relevance Gate**| $\text{Relevance} = 0 \implies \text{EvidenceContrib} = 0$ | Blueprint v16 (§17.2) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🔴 DRIFT (radarCalculator) |
| **Evidence Quality 3D** | $E_{\text{quality}} = 0.40E_{\text{src}} + 0.35E_{\text{rel}} + 0.25E_{\text{suf}}$ | Master Handoff (§9) | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 TBD |
| **Evidence Star Lookup** | $1★ \to 5★ \implies E_{\text{src}} \in [0, 100]$ | Blueprint v16 (§17.2) | 🔷 CONFIRMED | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 DRIFT (avgStars*20) |
| **Fallacy Penalty Rule** | $\text{FallacyPenalty} = 1.5 \times N_{\text{fallacy}}$ | Blueprint v16 (§17.2) | 🟢 FROZEN | 🟢 YES | 🟢 YES | 🟢 MISSING | 🔴 DRIFT (radarCalculator) |
| **Logic Hard Cap** | Tiền đề mâu thuẫn $\implies \text{Logic} \le 3.0 / 10.0$ | Blueprint v16 (§17.5) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🔴 MISSING IN CODE |
| **Content Derived Cap** | $\text{Content} \le 4.0 / 10.0$ (Suy luận cũ) | Không có trong văn bản | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 MISSING IN CODE |
| **Strategy Formula ($S$)** | $S = 0.30I + 0.25E + 0.20R + 0.10P + 0.15T$ | Blueprint v16 (§17.3) | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 TBD |
| **Core Clash Hard Cap** | Bỏ qua Core Clash $\implies \text{Strategy} \le 3.0$ | Blueprint v16 (§17.5) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🔴 MISSING IN CODE |
| **Reflex Formula ($R$)** | $R = 0.45\text{Recog} + 0.35\text{Resp} + 0.20\text{Adapt}$ | Blueprint v16 (§17.3) | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 TBD |
| **Reflex Zero Latency** | Cấm trừ điểm độ trễ mili-giây | Blueprint v16 (§17.3) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **Style Formula** | $\text{Style} = 0.30C + 0.20P + 0.15\text{Pr} + 0.15F + 0.20E$ | Blueprint v16 (§17.4) | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 TBD |
| **Prosody Formula** | $\text{Prosody} = 0.40\text{PitchVar} + 0.30\text{Emphasis} + 0.30\text{Pause}$ | Blueprint v16 (§17.4) | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 TBD |
| **Pause Measurement** | Đo khoảng lặng giữa 2 từ $\ge 1.2$s | Voice Spec 08 (§2) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **Pause Benchmark** | Vùng tối ưu chuẩn: $10\% \le \text{PauseRatio} \le 25\%$ | Master Handoff (§24) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **Pause Scoring Curve** | Trừ $2$ điểm cho mỗi $1\%$ lệch chuẩn | `voiceTelemetry.ts` | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🟢 COMPLIANT IN CODE |
| **WPM Zone Boundaries** | $<100$ (Slow), $120-150$ (Optimal), $>170$ (Fast) | Voice Spec 08 (§2) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **WPM-to-Pace Curve** | Hàm piecewise chuyển đổi WPM sang điểm | Master Handoff (§25) | 🔵 CANDIDATE | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 DRIFT |
| **Windmiller Trigger** | $(\text{WPM} > 170) \land (\text{PauseRatio} < 10\%)$ | Blueprint v16 (§17.5) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🔴 MISSING IN CODE |
| **Windmiller Penalty** | Hàm toán học trừ điểm dồn ép nuốt chữ | Blueprint v16 (§17.5) | 🔴 SPEC GAP | 🔴 FALSE | 🟢 YES | 🟢 MISSING | 🔴 MISSING IN CODE |
| **Accent Fairness Rule** | Giọng vùng miền là Protected Feature (Zero penalty)| Blueprint v16 (§17.4) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **Zero Waste LLM Rule** | Cấm dùng LLM cho telemetry xác định | Spec 00, Spec 05 | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **POI Safety Gate** | Micro $\le 15$s; Khóa phút đầu & cuối (WSDC) | Spec 00, Blueprint v16 | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **Non-Identity Profile** | Cấm gán nhãn phẩm chất bản chất con người | Blueprint v16 (§16.1) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **SCALE-01 Computation** | Thang tính toán nội bộ $[0, 100]$ Double Precision | Kiến trúc hệ thống | 🔵 CANDIDATE | 🔴 FALSE | ❌ NO | ❌ NOT_REQ | 🔴 DRIFT |
| **SCALE-02 Persistence** | Thang hiển thị UI và lưu DB $[0.0, 10.0]$ | Spec 13, Spec 18 | 🔷 CONFIRMED | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🟢 COMPLIANT |
| **Formula Versioning** | Bắt buộc lưu `formula_version` với derived score | Master Handoff (§45) | 🟢 FROZEN | 🟢 YES | ❌ NO | ❌ NOT_REQ | 🔴 MISSING IN SCHEMA |

---

# 4. SỔ ĐĂNG KÝ CÔNG THỨC ỨNG VIÊN (CANDIDATE FORMULA REGISTRY VERIFICATION)

Tất cả 9 công thức đề xuất đã được đăng ký chuẩn hóa với cấu trúc metadata nghiêm ngặt:

1. **`CONTENT_RAW_V1_CANDIDATE`**: $C_{\text{raw}} = 0.30L + 0.20E + 0.15\text{CRE} + 0.25R + 0.10A$ (`formula_status: CANDIDATE`, `promotion_eligible: false`).
2. **`EVIDENCE_QUALITY_3D_V1_CANDIDATE`**: $E_{\text{quality}} = 0.40E_{\text{src}} + 0.35E_{\text{rel}} + 0.25E_{\text{suf}}$ (`formula_status: CANDIDATE`, `promotion_eligible: false`).
3. **`STRATEGY_V1_CANDIDATE`**: $S = 0.30I + 0.25E + 0.20R + 0.10P + 0.15T$ (`formula_status: CANDIDATE`, `promotion_eligible: false`).
4. **`REFLEX_V1_CANDIDATE`**: $R = 0.45\text{ChallengeRec} + 0.35\text{ResponseQual} + 0.20\text{Adapt}$ (`formula_status: CANDIDATE`, `promotion_eligible: false`).
5. **`STYLE_V1_CANDIDATE`**: $\text{Style} = 0.30C + 0.20P + 0.15\text{Pr} + 0.15F + 0.20E$ (`formula_status: CANDIDATE`, `promotion_eligible: false`).
6. **`PROSODY_V1_CANDIDATE`**: $\text{Prosody} = 0.40\text{PitchVar} + 0.30\text{Emphasis} + 0.30\text{Pause}$ (`formula_status: CANDIDATE`, `promotion_eligible: false`).
7. **`WPM_PACE_CURVE_V1_CANDIDATE`**: Đường cong Piecewise chuyển đổi WPM sang Pace Score (`formula_status: CANDIDATE`, `promotion_eligible: false`).
8. **`PAUSE_STABILITY_CURVE_V1_CANDIDATE`**: Đường cong trừ 2 điểm/1% lệch chuẩn ngắt nghỉ (`formula_status: CANDIDATE`, `promotion_eligible: false`).
9. **`FILLER_SEVERITY_V1_CANDIDATE`**: Phân tầng mức độ nghiêm trọng từ đệm $F_1, F_2, F_3$ (`formula_status: CANDIDATE`, `promotion_eligible: false`).

---

# 5. SỔ ĐĂNG KÝ QUY CHUẨN ĐÃ KHÓA (FROZEN RULE REGISTRY)

1. **`FROZEN-RULE-01`**: $\text{Score}_{\text{Total}} = 0.40 \times \text{Content} + 0.20 \times \text{Strategy} + 0.40 \times \text{Style}$ (Blueprint v16 §17.1).
2. **`FROZEN-RULE-02`**: $\text{EvidenceContribution} = \text{EvidencePresence} \times \text{EvidenceQuality}$ (Blueprint v16 §17.2).
3. **`FROZEN-RULE-03`**: $\text{Relevance} = 0 \implies \text{EvidenceContribution} = 0$ (Blueprint v16 §17.2).
4. **`FROZEN-RULE-04`**: $\text{FallacyPenalty} = 1.5 \times N_{\text{fallacy}}$ (Blueprint v16 §17.2).
5. **`FROZEN-RULE-05`**: $\text{Direct Contradiction} \implies \text{Logic Sub-score} \le 3.0 / 10.0$ (Blueprint v16 §17.5 TC-CAL-01).
6. **`FROZEN-RULE-06`**: $\text{Missing Core Clash} \implies \text{Strategy Score} \le 3.0 / 10.0$ (Blueprint v16 §17.5 TC-CAL-03).
7. **`FROZEN-RULE-07`**: $\text{Windmiller Trigger} \iff (\text{WPM} > 170) \land (\text{PauseRatio} < 10\%)$ (Blueprint v16 §17.5 TC-CAL-04).
8. **`FROZEN-RULE-08`**: Accent Fairness Policy — Giọng vùng miền là Protected Feature, cấm trừ điểm âm học địa phương (Blueprint v16 §17.4).
9. **`FROZEN-RULE-09`**: Zero Waste LLM Rule — Cấm dùng token LLM cho telemetry xác định (Spec 00 §3, Spec 05 §3).
10. **`FROZEN-RULE-10`**: POI Safety Gate — Micro $\le 15$s, khóa an toàn phút đầu và phút cuối (Spec 00 §2, Blueprint v16 Chương 2).
11. **`FROZEN-RULE-11`**: Non-Identity Learning Profile — Cấm gán nhãn phẩm chất cố định (Blueprint v16 §16.1).
12. **`FROZEN-RULE-12`**: Formula Versioning — Bắt buộc gắn `formula_version` với derived score (Master Handoff §45).

---

# 6. XÁC MINH SỔ THEO DÕI SAI LỆCH MÃ NGUỒN (IMPLEMENTATION DRIFT VERIFICATION)

Toàn bộ 7 mục Drift đã được xác minh đối soát và giữ nguyên trạng thái đóng băng:

* **`DRIFT-01` (Fallacy Penalty in `radarCalculator.ts`):** Code tính $\min(15, \text{unique} \times 2)$ $\implies$ Sai lệch so với Normative Rule $1.5 \times N_{\text{fallacy}}$. Trạng thái: `PENDING_APPROVAL` (Allowed to Fix Now = NO).
* **`DRIFT-02` (Session Aggregation in `debateController.ts`):** Code lấy trung bình `coachFeedback.score` và nhân giả lập `*0.98, *1.02, *0.95` $\implies$ Sai lệch so với $40/20/40$. Trạng thái: `PENDING_APPROVAL` (Allowed to Fix Now = NO).
* **`DRIFT-03` (Legacy Spec in `07_SCORING_SPEC.md`):** Tài liệu lưu thang điểm 100 cũ $\implies$ Deprecated Specification. Trạng thái: `PENDING_APPROVAL` (Allowed to Fix Now = NO).
* **`DRIFT-04` (Missing `formula_version` in `schema.prisma`):** Bảng `debate_sessions` thiếu cột định danh phiên bản công thức $\implies$ Implementation Gap. Trạng thái: `PENDING_APPROVAL` (Allowed to Fix Now = NO).
* **`DRIFT-05` (Evidence Quality in `radarCalculator.ts`):** Code tính $E_{\text{quality}} = \text{avgStars} \times 20$ $\implies$ Bỏ qua Relevance và Sufficiency. Trạng thái: `PENDING_APPROVAL` (Allowed to Fix Now = NO).
* **`DRIFT-06` (Context-aware Filler Filter in `voiceDspService.ts`):** Code dùng Regex thô không xét cấu trúc ngữ pháp câu $\implies$ Implementation Gap. Trạng thái: `PENDING_APPROVAL` (Allowed to Fix Now = NO).
* **`DRIFT-07` (Transcript Structure in `debateController.ts`):** Nhồi chuỗi JSON `__voice__` và `__coach__` vào mảng ngụy biện $\implies$ Data Storage Anti-pattern. Trạng thái: `PENDING_APPROVAL` (Allowed to Fix Now = NO).

---

# 7. XÁC MINH SỔ ĐĂNG KÝ LỖ HỔNG ĐẶC TẢ (SPEC GAP VERIFICATION)

* **`GAP-01` (Evidence Star Numerical Lookup Table):** Thiếu bảng tra số học chuyển đổi từ 1★–5★ sang điểm số liên tục $E_{\text{src}} \in [0, 100]$.
* **`GAP-02` (Evidence Sufficiency NLP Algorithm):** Thiếu thuật toán xác định độ bao quát chứng minh của dẫn chứng đối với phạm vi luận điểm.
* **`GAP-03` (Core Clash Detection Mechanism):** Thiếu phương pháp trích xuất tự động điểm nút tranh biện chính để kích hoạt Hard Cap $\text{Strategy} \le 3.0$.
* **`GAP-04` (Opponent Engagement Semantic Distance):** Thiếu công thức định lượng độ phủ ngữ nghĩa và so sánh tác động (*Impact Weighing*).
* **`GAP-05` (Vietnamese Syllable Tokenizer for DSP):** Thiếu bộ tách âm tiết tiếng Việt để tính Speech Rate (SR) và Articulation Rate (AR).
* **`GAP-06` (Windmiller Mathematical Penalty Function):** Thiếu phương trình trừ điểm định lượng cụ thể khi chạm điều kiện $\text{WPM} > 170 \land \text{Pause} < 10\%$.
* **`GAP-07` (Prosody Pitch Variation Extractor):** Thiếu module DSP trích xuất đường bao cao độ F0 để tính biến số PitchVariation.
* **`GAP-08` (Time Management Distribution Variance):** Thiếu phương trình đo lường độ lệch chuẩn thời lượng phát biểu giữa các luận điểm.

---

# 8. KIỂM TOÁN MA TRẬN 25 CA KIỂM CHUẨN (25-CASE MATRIX AUDIT)

Bản kiểm toán phân định chính xác giữa **Quy Chuẩn Xác Định (Deterministic Output)** và **Mục Tiêu Hiệu Chuẩn (Calibration Target Range)**:

| Case ID | Miền Đánh Giá | Kịch Bản Kiểm Thử | Scenario Auth | Formula Auth | Output Type | Deterministic? | Cần Giám Khảo Con Người? | Nguy Cơ Synthetic Ground Truth? |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **TC-01** | Content | Không có dẫn chứng ($E=0$) | 🟢 AUTHORIZED | 🟢 FROZEN | $E_{\text{contrib}} = 0$ | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-02** | Content | Dẫn chứng 1★ nguồn yếu | 🔷 DERIVED | 🔵 CANDIDATE | Target $[6.0, 6.5]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-03** | Content | Dẫn chứng 3★ chuẩn mực | 🔷 DERIVED | 🔵 CANDIDATE | Target $[7.5, 8.2]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-04** | Content | Dẫn chứng 5★ xuất sắc | 🔷 DERIVED | 🔵 CANDIDATE | Target $[9.0, 9.8]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-05** | Content | 5★ nhưng Lạc đề (Irrelevant)| 🟢 AUTHORIZED | 🟢 FROZEN | $E_{\text{contrib}} = 0$ | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-06** | Content | Dẫn chứng chưa đủ mạnh | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[6.8, 7.4]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-07** | Content | C-R-E Hoàn chỉnh | 🟢 AUTHORIZED | 🔷 CONFIRMED | Target $[9.5, 10.0]$| 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-08** | Content | Chỉ có Luận điểm (Claim only)| 🟢 AUTHORIZED | 🔷 CONFIRMED | Content $\le 3.0$ | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-09** | Content | Claim + Reason, thiếu Evidence| 🔷 DERIVED | 🔵 CANDIDATE | Target $[6.5, 7.2]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-10** | Content | Dẫn chứng không có lập luận | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[3.5, 4.5]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-11** | Content | Mắc 2 lỗi ngụy biện | 🟢 AUTHORIZED | 🟢 FROZEN (Rule)| Trừ đúng $3.0$đ | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-12** | Content | Mâu thuẫn trực tiếp | 🟢 AUTHORIZED | 🟢 FROZEN | $\text{Logic} \le 3.0$ | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-13** | Strategy| Bám sát Core Clash xuất sắc | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[8.8, 9.5]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-14** | Strategy| Nói nhiều ý phụ, né Core Clash| 🟢 AUTHORIZED | 🟢 FROZEN | $\text{Strategy} \le 3.0$ | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-15** | Strategy| Phản biện trực diện đối thủ | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[8.5, 9.2]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-16** | Strategy| Đọc văn mẫu (Scripted) | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[3.5, 4.5]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-17** | Strategy| Phản xạ thích ứng linh hoạt | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[8.5, 9.2]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-18** | Strategy| Xử lý POI $\le 15$s sắc bén | 🟢 AUTHORIZED | 🟢 FROZEN | POI Gate Passed | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-19** | Strategy| Phân bổ thời lượng chuẩn | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[8.5, 9.5]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-20** | Strategy| Cháy giáo án / Phân bổ kém | 🔵 PROPOSED | 🔵 CANDIDATE | Target $[4.0, 5.0]$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-21** | Style | Tốc độ quá chậm ($<100$ WPM)| 🟢 AUTHORIZED | 🟢 FROZEN | Slow Zone Passed | 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-22** | Style | Tốc độ tối ưu ($135$ WPM) | 🟢 AUTHORIZED | 🟢 FROZEN | Optimal Zone Passed| 🟢 CÓ | ❌ NO | ❌ KHÔNG |
| **TC-23** | Style | Máy xay gió (Windmiller) | 🟢 AUTHORIZED | 🟢 FROZEN Trig | Trigger Activated | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-24** | Style | Lạm dụng từ đệm ($>4$/phút) | 🔵 PROPOSED | 🔵 CANDIDATE | Target Class $F_3$ | 🔴 KHÔNG | 🟢 YES | ⚠️ Phải dùng làm Target, cấm làm Oracle |
| **TC-25** | Style | Giọng Nghệ An chuẩn phát âm| 🟢 AUTHORIZED | 🟢 FROZEN Pol | $\text{Style} \ge 8.5$ | 🟢 CÓ | ❌ NO | ❌ KHÔNG |

---

# 9. KIỂM TOÁN TẬP KIỂM THỬ GIẢ LẬP (SYNTHETIC GROUND TRUTH AUDIT)

* **Bằng chứng kiểm tra:** Tệp `profileAnalytics.test.ts` chứa 25 ca kiểm thử đơn vị với các phép so sánh số học như `assert(logicScore === 76.0)`.
* **Kết luận kiểm toán:**
  $$\text{Unit Test 25/25 PASS} \equiv \text{Implementation Arithmetic Correctness}$$
  $$\text{Unit Test 25/25 PASS} \not\equiv \text{Pedagogical Scoring Validity}$$
  $$\text{Unit Test 25/25 PASS} \not\equiv \text{Human WSDC Judge Agreement}$$
* **Hành động bảo vệ:** Toàn bộ tài liệu Contract v1 đã loại bỏ hoàn toàn các nhận định ngộ nhận kết quả kiểm thử đơn vị là bằng chứng kiểm chuẩn thực tế.

---

# 10. ĐÁNH GIÁ ĐỘ SẴN SÀNG KIỂM CHUẨN 8 CHIỀU (CALIBRATION READINESS 8D)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CONTRACT READINESS:        🟢 READY                                      │
│    • Hợp đồng thẩm quyền Contract v1 đã hoàn tất, phân lập trạng thái sạch. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. DATASET READINESS:         🔴 BLOCKED / NOT READY                        │
│    • Tập mẫu 50 bài nói thực tế chưa được thu thập (HUMAN-GROUND-TRUTH = MISSING).│
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. HUMAN JUDGE READINESS:     🔴 BLOCKED / NOT READY                        │
│    • Chưa ký kết hợp đồng và bàn giao rubric cho 3 giám khảo WSDC con người.│
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. FORMULA READINESS:         🟡 READY WITH CONDITIONS                      │
│    • Toàn bộ 9 công thức Candidate đã được đăng ký, sẵn sàng nạp biến số.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. INSTRUMENTATION READINESS: 🟡 READY WITH CONDITIONS                      │
│    • Pipeline DSP và Parser C-R-E sẵn sàng, cần bổ sung bộ tách âm tiết.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. REPRODUCIBILITY READINESS: 🟢 READY                                      │
│    • Bất biến Zero Waste LLM đảm bảo tính tái lập 100% của telemetry âm học.│
├─────────────────────────────────────────────────────────────────────────────┤
│ 7. VERSIONING READINESS:      🟡 READY WITH CONDITIONS                      │
│    • Ràng buộc formula_version đã xác lập, cần cập nhật Prisma schema sau.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 8. AUDITABILITY READINESS:    🟢 READY                                      │
│    • Ma trận đối soát 4 chiều và sổ theo dõi Drift được thiết lập hoàn hảo. │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 11. DANH MỤC QUYẾT ĐỊNH CỦA PRODUCT OWNER (PRODUCT OWNER DECISIONS REQUIRED)

1. **Phê duyệt chính thức Hợp đồng:** Ban hành [`docs/SCORING_FORMULA_CONTRACT_v1.md`](file:///d:/Projects/The_Debate/debate-training/docs/SCORING_FORMULA_CONTRACT_v1.md) làm căn cứ pháp lý kỹ thuật duy nhất.
2. **Phê duyệt cơ chế Dual-Scale:** Thống nhất tính toán nội bộ thang $[0, 100]$ và lưu trữ/hiển thị thang $[0.0, 10.0]$ làm tròn 1 chữ số.
3. **Phê duyệt ngân sách thu thập Golden Dataset:** Cấp phép thu thập 50 bài nói thực tế và thù lao cho 3 giám khảo WSDC chấm điểm độc lập.
4. **Phê duyệt kế hoạch khắc phục Drift:** Cho phép lập lịch refactor `radarCalculator.ts`, `debateController.ts`, và `07_SCORING_SPEC.md` sau khi hoàn tất giai đoạn kiểm chuẩn.

---

# 12. DANH MỤC VẤN ĐỀ GÂY NGHẼN (BLOCKING ISSUES)

Chỉ có 2 vấn đề gây nghẽn duy nhất đối với tiến trình **Formula Freeze**:
1. 🔴 **BLOCKER-01 (Missing Real Dataset):** Chưa có tập mẫu âm thanh/văn bản thực tế để chạy ma trận hiệu chuẩn 25 ca.
2. 🔴 **BLOCKER-02 (Missing Human Ground Truth):** Chưa có nhãn chấm điểm độc lập của 3 giám khảo WSDC để đo lường sai số mô hình.

---

# 13. DANH MỤC VẤN ĐỀ KHÔNG GÂY NGHẼN (NON-BLOCKING ISSUES)

Các vấn đề sau **KHÔNG LÀM NGHẼN** việc ban hành Contract v1 và chuẩn bị dữ liệu:
* 🟢 **NON-BLOCK-01:** Các mục Implementation Drift (Sẽ được sửa đồng loạt trong Remediation Phase sau khi khóa công thức).
* 🟢 **NON-BLOCK-02:** Các công thức đang ở trạng thái Candidate (Được thiết kế có chủ đích để tinh chỉnh trọng số qua dữ liệu thực).
* 🟢 **NON-BLOCK-03:** Việc cập nhật Prisma Schema thêm trường `formula_version` (Sẽ thực hiện cùng đợt migration tổng thể).

---

# 14. BƯỚC ĐI TIẾP THEO ĐƯỢC CẤP PHÉP (AUTHORIZED NEXT STEP)

### 🎯 AUTHORIZED NEXT STEP: CALIBRATION DATASET PREPARATION
**(CHUẨN BỊ BỘ DỮ LIỆU KIỂM CHUẨN THỰC TẾ & THIẾT LẬP HỘI ĐỒNG GIÁM KHẢO WSDC)**

> **Cảnh báo nghiêm ngặt:** Tuyệt đối **KHÔNG ĐƯỢC PHÉP SỬA CODE (NO CODE REMEDIATION)** trong giai đoạn này. Mọi hành vi sửa code trước khi có dữ liệu kiểm chuẩn thực nghiệm đều phá vỡ Tường Lửa Thẩm Quyền.

---

# 15. CÁC HÀNH VI BỊ CẤM TUYỆT ĐỐI (FORBIDDEN ACTIONS)

- ❌ **NO SCORING REFACTOR:** Cấm sửa đổi logic trong `radarCalculator.ts`, `skillLevelScorers.ts`, `debateController.ts`.
- ❌ **NO SCHEMA MIGRATION:** Cấm sửa đổi `schema.prisma` hoặc chạy lệnh migrate database.
- ❌ **NO FORMULA PROMOTION:** Cấm tự động chuyển bất kỳ Candidate Formula nào thành Frozen.
- ❌ **NO TEST REWRITING:** Cấm sửa đổi tệp test `profileAnalytics.test.ts`.
- ❌ **NO SYNTHETIC GROUND TRUTH:** Cấm dùng kết quả unit test để tuyên bố hợp chuẩn WSDC.
- ❌ **NO UNDOCUMENTED SCORING RULE:** Cấm đưa bất kỳ công thức tự chế nào vào hệ thống mà không có trong Contract v1.

---

# 16. BẢNG TỰ KIỂM TRA CUỐI CÙNG (FINAL EXECUTION CHECKLIST)

- [x] Không có bất kỳ tệp mã nguồn nào bị chỉnh sửa.
- [x] Không có tệp Prisma schema nào bị chỉnh sửa.
- [x] Không có database migration nào được tạo ra.
- [x] Không có tệp kiểm thử nào bị chỉnh sửa.
- [x] Không có công thức Candidate nào bị thăng cấp trái phép.
- [x] Không có kết quả kiểm thử giả lập nào bị gọi là Ground Truth.
- [x] Không tự ý giải quyết các SPEC GAP toán học.
- [x] Không tự ý ra quyết định thay cho Product Owner.
- [x] Không làm sai lệch nội dung của Master Blueprint v16.
- [x] Bản hợp đồng `docs/SCORING_FORMULA_CONTRACT_v1.md` được bảo toàn nguyên vẹn tính toàn vẹn.

---

# TỔNG KẾT BÁO CÁO

### 🏆 FINAL PRE-CALIBRATION AUDIT = PASS
**Hệ thống AI Debate Master — Thinking OS đã thiết lập thành công Hàng Rào Thẩm Quyền Chấm Điểm vững chắc nhất. Dự án chính thức được cấp phép bước vào giai đoạn Thu Thập Dữ Liệu Thực Tế và Hiệu Chuẩn Tranh Biện Quốc Tế (Calibration Phase).**
