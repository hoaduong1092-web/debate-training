# SCORING FORMULA CONTRACT v1
## AI DEBATE MASTER — THINKING OS

> **Tài Liệu Thẩm Quyền:** SCORING FORMULA & CALIBRATION CONTRACT v1.0.0  
> **Source of Truth Tối Cao:** Master Blueprint v16.0.0 (`ai-debate-co-creation-chatlog-v16.md`) & Master Handoff Spec (`15_new ChatGPT-Chỉnh sửa thông báo trường học-20260821-1401.md`)  
> **Trạng Thái Tài Liệu:** 🟡 CONTRACT DRAFT / CALIBRATION-READY (NOT FULLY FROZEN)  
> **Ngày Ban Hành:** 21/08/2026  
> **Phạm Vi Áp Dụng:** Toàn bộ hệ thống đo lường âm học (DSP), chẩn đoán lập luận (Logic Coach C-R-E), tổng hợp điểm đấu trường (Session Aggregation), và hồ sơ năng lực học tập (Learning Profile Engine).

---

# 1. HỆ THỐNG PHÂN CẤP THẨM QUYỀN (AUTHORITY HIERARCHY)

Tài liệu này xác lập trật tự thẩm quyền bất khả xâm phạm đối với toàn bộ các công thức toán học, thuật toán đo lường và quy tắc chấm điểm trong dự án **AI Debate Master — Thinking OS**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ CẤP 1 (THẨM QUYỀN TỐI CAO): Master Blueprint v16.x                           │
│       • Văn bản quy chuẩn cao nhất xác lập mục tiêu sư phạm & kiến trúc.    │
├─────────────────────────────────────────────────────────────────────────────┤
│ CẤP 2 (ĐẶC TẢ QUY CHUẨN ĐƯỢC PHÊ DUYỆT): Master Handoff Spec v15/v16        │
│       • Các tài liệu chuyển giao kỹ thuật và biên bản đồng sáng tạo.        │
├─────────────────────────────────────────────────────────────────────────────┤
│ CẤP 3 (LƯỢC ĐỒ DỮ LIỆU HIỆN HÀNH): Database Schema (Prisma)                 │
│       • Ràng buộc cấu trúc bảng và kiểu dữ liệu hiện hữu.                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ CẤP 4 (MÃ NGUỒN THỰC THI HIỆN TẠI): Backend Services & Controllers          │
│       • Chỉ dùng để xác định mức độ tuân thủ (Compliance) hoặc sai lệch.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ CẤP 5 (TÀI LIỆU CŨ / MÃ NGUỒN LỖI THỜI): Legacy Docs (07_SCORING_SPEC)      │
│       • Các văn bản không đồng bộ với Blueprint v16 coi là DEPRECATED.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Nguyên Tắc Xử Lý Xung Đột Thẩm Quyền:
1. Nếu mã nguồn hiện tại hoặc tài liệu cũ mâu thuẫn với Blueprint v16:
   * **Blueprint v16 = AUTHORITY (QUY CHUẨN BẮT BUỘC)**.
   * **Mã nguồn hiện tại / Spec cũ = IMPLEMENTATION DRIFT / DEPRECATED (SAI LỆCH CẦN SỬA ĐỔI)**.
2. Tuyệt đối **KHÔNG ĐƯỢC** tự ý giải quyết xung đột bằng suy đoán chủ quan.
3. Nếu Blueprint v16 chưa định nghĩa đầy đủ phương trình toán học:
   * Bắt buộc phân loại thành **`SPEC GAP`** hoặc **`CANDIDATE`**.
   * Tuyệt đối **CẤM TỰ PHÁT MINH CÔNG THỨC TOÁN HỌC** mà chưa qua quy trình kiểm chuẩn và phê duyệt chính thức.

---

# 2. HAI BẤT BIẾN HỆ THỐNG BẮT BUỘC (NON-NEGOTIABLE INVARIANTS)

Tất cả các thành phần phát triển phần mềm, kiểm thử tự động, AI Agent và kỹ sư hệ thống phải tuân thủ nghiêm ngặt 2 bất biến sau:

> ### 🛡️ INVARIANT-SCORE-01 — NO IMPLICIT PROMOTION (CẤM TỰ ĐỘNG NÂNG CẤP CÔNG THỨC)
> Một công thức mang trạng thái **`formula_status = CANDIDATE`** tuyệt đối **KHÔNG BAO GIỜ ĐƯỢC PHÉP** tự động coi là **`FROZEN`** chỉ vì các lý do sau:
> * Mã nguồn đã hiện thực nó và đang chạy không có lỗi;
> * Các tệp Unit Test / Integration Test tự động chạy đạt 100% PASS;
> * Hệ thống xuất ra các giá trị điểm số xác định (deterministic outputs);
> * Các ca kiểm thử giả lập (synthetic test cases) đều vượt qua;
> * Đội ngũ phát triển nhận định rằng kết quả đầu ra "nghe hợp lý".
> 
> **Điều Kiện Tiên Quyết Duy Nhất Để Promotion (`promotion_eligible = true`):**
> Phải thỏa mãn đồng thời cả 4 điều kiện sau:
> 1. Có bằng chứng kiểm chuẩn thực nghiệm (**Calibration Evidence**) trên tập dữ liệu bài nói thật;
> 2. Đăng ký định danh phiên bản chính thức (**Official `formula_version` Registration**);
> 3. Có văn bản phê duyệt chính thức từ **Product / Domain Owner**;
> 4. Bộ kiểm thử hồi quy toàn diện (**Regression Suite**) vượt qua hoàn toàn.

> ### 🛡️ INVARIANT-SCORE-02 — NO SYNTHETIC GROUND TRUTH (CẤM ĐỒNG NHẤT UNIT TEST VỚI GROUND TRUTH)
> Các tệp kiểm thử tự động (ví dụ: `profileAnalytics.test.ts = 25/25 PASS`) chỉ chứng minh duy nhất:
> $$\text{Implementation Arithmetic Correctness (Tính Đúng Đắn Số Học Của Mã Nguồn)}$$
> Tuyệt đối **KHÔNG ĐƯỢC PHÉP** diễn giải kết quả kiểm thử đơn vị thành:
> * Tính hợp lệ sư phạm (*Pedagogical Validity*);
> * Độ tương đồng với giám khảo con người (*Human Judge Agreement*);
> * Tính chuẩn xác của mô hình chấm điểm (*Scoring Validity*);
> * Sự tương đương với chuẩn trọng tài WSDC quốc tế (*WSDC Adjudication Equivalence*);
> * Bằng chứng kiểm chuẩn đã hoàn tất (*Calibration Completed Evidence*).
> 
> Thuật ngữ bắt buộc sử dụng trong mọi tài liệu kỹ thuật là: **`Implementation Arithmetic Correctness`**, tuyệt đối cấm dùng các từ gây ngộ nhận như *`Ground Truth`* hoặc *`Human Validated`* khi chưa có dữ liệu chấm của trọng tài con người.

---

# 3. KIẾN TRÚC CHẤM ĐIỂM 4 TẦNG (4-LAYER SCORING ARCHITECTURE)

Hệ thống chấm điểm được tổ chức thành 4 tầng phân lập rõ ràng giữa đo lường vật lý, trích xuất đặc trưng, công thức ứng viên và tổng hợp cấp phiên đấu:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — RAW MEASUREMENTS (Đo Lường Thô Xác Định)                         │
│ Trạng thái: 🟢 FROZEN DETERMINISTIC PIPELINE                               │
│ • Tốc độ nói WPM thô (WordCount / Duration)                                │
│ • Độ dài khoảng lặng (Pause Duration >= 1.2s)                              │
│ • Tổng thời lượng phát biểu thực tế (Duration in Seconds/Milliseconds)     │
│ • Số lượng từ đếm được (Word Count)                                        │
│ • Trích xuất cấu trúc C-R-E (Claim, Reasoning, Evidence text blocks)       │
│ • Số sao chất lượng dẫn chứng (Evidence Stars 1★ - 5★)                     │
│ • Thời lượng chất vấn POI (Micro POI duration, 15-second floor)            │
│ • Vùng thời gian an toàn WSDC (Protected Time 1st & Last Minute)           │
│ ➔ BẤT BIẾN: ZERO LLM TOKENS cho telemetry xác định.                       │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 — NORMALIZED FEATURES (Chuẩn Hóa Đặc Trưng Vi Mô)                  │
│ Trạng thái: 🔷 CONFIRMED PRINCIPLE (Khi đã có toán) / 🔴 SPEC GAP (Khi thiếu)│
│ • Tính hợp lệ Logic (Logic Validity)                                       │
│ • Chất lượng dẫn chứng 3 chiều (Evidence Quality 3D: Source, Rel, Suf)     │
│ • Độ giao thoa ngữ nghĩa phản biện (Opponent Engagement semantic overlap)  │
│ • Độ biến thiên cao độ âm thanh (Prosody pitch variation)                  │
│ • Điểm ổn định ngắt nghỉ (Pause Stability Score)                           │
│ • Mật độ từ đệm có xét ngữ cảnh (Context-aware Filler metrics)             │
│ • Chỉ số phân bổ thời gian phát biểu (Time-management metrics)             │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — DOMAIN SCORING FORMULAS (Công Thức Chấm Điểm 3 Miền)             │
│ Trạng thái: 🔵 CANDIDATE (Bắt buộc giữ trạng thái chờ hiệu chuẩn)          │
│ • Content Raw Score: C_raw = 0.30L + 0.20E + 0.15CRE + 0.25R + 0.10A       │
│ • Strategy Score:    S = 0.30I + 0.25E + 0.20R + 0.10P + 0.15T             │
│ • Style Score:       Style = 0.30C + 0.20P + 0.15Pr + 0.15F + 0.20E        │
│ ➔ Yêu cầu: formula_status = CANDIDATE; human_validation_status = MISSING   │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4 — SESSION AGGREGATION (Tổng Hợp Điểm Cấp Session)                  │
│ Trạng thái: 🟢 FROZEN NORMATIVE ARCHITECTURE                               │
│ • Công thức tổng hợp cấp Session:                                          │
│     Score_Total = 0.40 * Content + 0.20 * Strategy + 0.40 * Style          │
│ • Hard Caps: Logic Contradiction <= 3.0; Missing Core Clash <= 3.0         │
│ • Khống chế biên: clamp [0, 100], sau đó quy đổi theo scale contract       │
│ • Làm tròn: 1 chữ số thập phân (toFixed(1)) cho giá trị lưu trữ/hiển thị   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. DANH MỤC CÁC QUY CHUẨN ĐÃ KHÓA (FROZEN NORMATIVE RULES)

Các quy tắc dưới đây là **LUẬT CHÍNH THỨC CỦA HỆ THỐNG (FROZEN NORMATIVE LAWS)**, bắt nguồn từ Master Blueprint v16 và đã hoàn toàn sẵn sàng để thi công:

1. **Quy Tắc Tổng Hợp Cấp Session (Session Aggregation Formula):**
   $$\text{Score}_{\text{Total}} = 0.40 \times \text{Content} + 0.20 \times \text{Strategy} + 0.40 \times \text{Style}$$
   * Nguồn: Blueprint v16 (§17.1), Master Handoff (§3).
   * Trạng thái: 🟢 **FROZEN**.

2. **Cổng Hiện Diện Dẫn Chứng (Evidence Presence Gate):**
   $$\text{EvidenceContribution} = \text{EvidencePresence} \times \text{EvidenceQuality}$$
   * Trong đó: $\text{EvidencePresence} \in \{0, 1\}$. Nếu bài nói không có dẫn chứng ($\text{EvidencePresence} = 0$), thì $\text{EvidenceContribution} = 0$.
   * Nguồn: Blueprint v16 (§17.2), Master Handoff (§10).
   * Trạng thái: 🟢 **FROZEN**.

3. **Cổng Tính Liên Quan Của Dẫn Chứng (Relevance Gate):**
   $$\text{Relevance} = 0 \implies \text{EvidenceContribution} = 0$$
   * Dù dẫn chứng có nguồn gốc 5★ xuất sắc đến đâu, nếu không liên quan đến đề tài ($\text{Relevance} = 0$), điểm đóng góp của dẫn chứng bị triệt tiêu hoàn toàn về đúng $0$.
   * Nguồn: Blueprint v16 (§17.2, §17.5 TC-CAL-02).
   * Trạng thái: 🟢 **FROZEN**.

4. **Quy Chuẩn Trừ Điểm Ngụy Biện (Normative Fallacy Penalty Rule):**
   $$\text{FallacyPenalty} = 1.5 \times N_{\text{fallacy}}$$
   * Trừ trực tiếp $1.5$ điểm trên thang 10 cho mỗi lỗi ngụy biện logic phát hiện được vào điểm $C_{\text{raw}}$.
   * **Lưu ý đặc biệt:** Mọi mã nguồn hoặc tài liệu cũ tính mức phạt khác (ví dụ: `min(15, unique * 2)` hoặc `5-10đ`) được xác định chính thức là **`IMPLEMENTATION DRIFT / DEPRECATED`**.
   * Nguồn: Blueprint v16 (§17.2), Master Handoff (§6).
   * Trạng thái: 🟢 **FROZEN NORMATIVE RULE**.

5. **Khống Chế Lỗi Mâu Thuẫn Logic (Logic Contradiction Hard Cap):**
   $$\text{Direct Logical Contradiction} \implies \text{Logic Sub-score} \le 3.0 / 10.0$$
   * Khi tiền đề (Premise) và kết luận (Conclusion) mâu thuẫn trực tiếp, điểm Logic bị khóa trần tối đa $3.0/10.0$ ($30/100$).
   * Nguồn: Blueprint v16 (§17.5 TC-CAL-01).
   * Trạng thái: 🟢 **FROZEN HARD CAP**.

6. **Khống Chế Bỏ Qua Xung Đột Cốt Lõi (Core Clash Failure Hard Cap):**
   $$\text{Missing Core Clash} \implies \text{Strategy Score} \le 3.0 / 10.0$$
   * Bài phát biểu dù dài và nhiều ví dụ nhưng né tránh hoàn toàn điểm giao tranh chính (Core Clash) sẽ bị khóa trần Strategy tối đa $3.0/10.0$ ($30/100$).
   * Nguồn: Blueprint v16 (§17.5 TC-CAL-03).
   * Trạng thái: 🟢 **FROZEN HARD CAP**.

7. **Điều Kiện Kích Hoạt Vi Phạm Tốc Độ Máy Xay Gió (Windmiller Trigger Condition):**
   $$\text{Windmiller Violation Trigger} \iff (\text{WPM} > 170) \land (\text{PauseRatio} < 10\%)$$
   * Tình trạng phát biểu dồn ép, nuốt chữ và không ngắt nghỉ bị bắt lỗi xác định dựa trên cặp chỉ số âm học trên.
   * Nguồn: Blueprint v16 (§17.5 TC-CAL-04), Voice Spec 08.
   * Trạng thái: 🟢 **FROZEN TRIGGER CONDITION**.

8. **Chính Sách Công Bằng Giọng Vùng Miền (Accent Fairness & Protected Feature):**
   * Giọng nói địa phương (Bắc, Trung, Nam, Tây Nam Bộ, Bắc Trung Bộ) là **Protected Feature**.
   * Tuyệt đối không được phép tồn tại bất kỳ biến số trừ điểm hay trọng số trừng phạt nào đối với giọng vùng miền trong công thức Style. Trường `accent_detected` chỉ được dùng cho mục đích hiệu chuẩn ASR và kiểm toán công bằng (Fairness Audit).
   * Nguồn: Blueprint v16 (§17.4), Master Handoff (§21, §27).
   * Trạng thái: 🟢 **FROZEN POLICY**.

9. **Nguyên Tắc Không Lãng Phí LLM (Zero Waste LLM Rule):**
   * Tuyệt đối không sử dụng LLM token cho các tác vụ đo lường xác định (đếm số từ, tính WPM, đo khoảng lặng, đếm từ đệm, vẽ biểu đồ).
   * Nguồn: Master Spec 00 (§3), AI Coach Spec 05 (§3).
   * Trạng thái: 🟢 **FROZEN ARCHITECTURAL INVARIANT**.

10. **Quy Chuẩn An Toàn Chất Vấn Đấu Trường (POI Safety & Time Gate):**
    * Lượt chất vấn POI khống chế thời lượng micro tối đa 15 giây; tự động khóa nút xin chất vấn trong phút đầu tiên và phút cuối cùng của bài nói chính (Protected Time).
    * Nguồn: Master Spec 00 (§2), Blueprint v16 (Chương 2).
    * Trạng thái: 🟢 **FROZEN ARENA RULE**.

11. **Bất Biến Hồ Sơ Học Tập Phi Định Tính (Non-Identity Learning Profile):**
    * Learning Profile chỉ được ghi nhận và hiển thị sự tiến bộ kỹ năng quan sát được (*Observable Skill Progression*), nghiêm cấm gán nhãn đánh giá phẩm chất hay bản chất con người (*Non-Identity Labeling*).
    * Nguồn: Blueprint v16 (§16.1), Master Handoff (§1).
    * Trạng thái: 🟢 **FROZEN PEDAGOGICAL INVARIANT**.

12. **Yêu Cầu Truy Vết Phiên Bản Công Thức (Formula Versioning Metadata):**
    * Mọi điểm số phái sinh (`score_content`, `score_strategy`, `score_style`, `score_total`) khi được lưu trữ bắt buộc phải đi kèm trường định danh `formula_version` để phục vụ đối soát và tính toán lại (*Recalculation*).
    * Nguồn: Master Handoff (§45, §46).
    * Trạng thái: 🟢 **FROZEN DATA REQUIREMENT**.

---

# 5. NGUYÊN TẮC ĐÃ CHỐT CẦN ĐẶC TẢ TOÁN HỌC (CONFIRMED PRINCIPLES REQUIRING MATHEMATICAL SPECIFICATION)

Các nguyên tắc dưới đây đã được phê duyệt dứt khoát về mặt đường lối sư phạm nhưng **đang ở trạng thái `SPEC GAP` về mặt công thức toán học**. Tuyệt đối cấm lập trình viên hoặc AI tự ý phát minh phương trình khi chưa có bản đặc tả chính thức:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. BẢNG QUY ĐỔI EVIDENCE STAR (Evidence Star -> Numerical E_src Table)     │
│    • Nguyên tắc: 1★ (nguồn yếu) -> 5★ (khoa học thực chứng).              │
│    • GAP: Thiếu bảng Lookup số học ánh xạ chính xác 1★, 2★, 3★, 4★, 5★    │
│           sang thang điểm E_src [0, 100].                                  │
├────────────────────────────────────────────────────────────────────────────┤
│ 2. BỘ TÁCH ÂM TIẾT TIẾNG VIỆT (Vietnamese Syllable Tokenizer)               │
│    • Nguyên tắc: Đo lường tốc độ phát âm chuẩn xác dựa trên âm tiết.       │
│    • GAP: Thiếu module DSP phân tách âm tiết tiếng Việt deterministic.     │
├────────────────────────────────────────────────────────────────────────────┤
│ 3. TỐC ĐỘ PHÁT ÂM KHÔNG KHOẢNG LẶNG (Articulation Rate - AR)               │
│    • Nguyên tắc: AR = Syllables / Phonation Time (loại trừ pauses).        │
│    • GAP: Thiếu thuật toán tính Phonation Time thời gian thực.             │
├────────────────────────────────────────────────────────────────────────────┤
│ 4. BỘ PHÂN LOẠI TỪ ĐỆM THEO NGỮ CẢNH (Context-Aware Filler Classifier)      │
│    • Nguyên tắc: Phân biệt True Filler ("ờ, à, kiểu") với liên từ ngữ pháp │
│                  ("thì, rồi, mà, chứ"). Không phạt từ "thì" ngữ pháp.      │
│    • GAP: Thiếu bộ parser ngữ pháp phân loại ngữ cảnh trước khi đếm.       │
├────────────────────────────────────────────────────────────────────────────┤
│ 5. ĐỘ PHỦ NGỮ NGHĨA PHẢN BIỆN (Opponent Engagement Semantic Overlap)       │
│    • Nguyên tắc: Đo mức độ bám sát và phản biện trực diện luận điểm đối thủ│
│    • GAP: Thiếu phương trình toán học tính khoảng cách ngữ nghĩa NLP.      │
├────────────────────────────────────────────────────────────────────────────┤
│ 6. SO SÁNH TÁC ĐỘNG (Impact Comparison Metric)                             │
│    • Nguyên tắc: Đánh giá khả năng cân đo mức độ ảnh hưởng của chính sách. │
│    • GAP: Thiếu hàm số học định lượng mức độ sâu của Impact Weighing.      │
├────────────────────────────────────────────────────────────────────────────┤
│ 7. PHÂN BỔ THỜI GIAN PHÁT BIỂU (Time Management Metric)                    │
│    • Nguyên tắc: Thời lượng phát biểu phải tỷ lệ thuận với tầm quan trọng.│
│    • GAP: Thiếu hàm tính độ lệch chuẩn (Time Distribution Variance).       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

# 6. SỔ ĐĂNG KÝ CÔNG THỨC ỨNG VIÊN (CANDIDATE FORMULA REGISTRY)

Tất cả các công thức trong phần này đều mang trạng thái:
* `formula_status: CANDIDATE`
* `calibration_required: true`
* `human_validation_status: MISSING`
* `promotion_eligible: false`

```yaml
# 1. CONTENT RAW SCORING FORMULA
formula_id: CONTENT_RAW_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Công thức tổng hợp điểm nội dung thô trước khi trừ điểm ngụy biện
mathematical_expression: "C_raw = 0.30 * L + 0.20 * E + 0.15 * CRE + 0.25 * R + 0.10 * A"
inputs:
  L: "Logic / Reasoning Quality [0, 100]"
  E: "Evidence Contribution [0, 100]"
  CRE: "C-R-E Structural Completeness [0, 100]"
  R: "Rebuttal / Direct Clash Depth [0, 100]"
  A: "Argument Coherence & Analogy [0, 100]"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Blueprint v16 §17.2, Handoff §11"
implementation_status: TBD
notes: "Chưa được freeze. Cần kiểm chuẩn trọng số vi mô qua ma trận 25 ca."

---
# 2. EVIDENCE QUALITY 3D FORMULA
formula_id: EVIDENCE_QUALITY_3D_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Mô hình đánh giá chất lượng dẫn chứng 3 chiều
mathematical_expression: "E_quality = 0.40 * E_src + 0.35 * E_rel + 0.25 * E_suf"
inputs:
  E_src: "Evidence Source Quality normalized from Stars [0, 100]"
  E_rel: "Evidence Relevance to Motion/Claim [0, 100]"
  E_suf: "Evidence Sufficiency to prove Claim Scope [0, 100]"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Master Handoff §9"
implementation_status: TBD
notes: "Cần bảng Lookup E_src và thuật toán đo lường liên tục E_rel, E_suf."

---
# 3. STRATEGY SCORING FORMULA
formula_id: STRATEGY_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Công thức tổng hợp điểm chiến thuật tranh biện
mathematical_expression: "S = 0.30 * I + 0.25 * E + 0.20 * R + 0.10 * P + 0.15 * T"
inputs:
  I: "Issue Prioritisation & Core Clash [0, 100]"
  E: "Opponent Engagement & Direct Rebuttal [0, 100]"
  R: "Reflex & Adaptation [0, 100]"
  P: "POI Management [0, 100]"
  T: "Time Allocation & Speech Structure [0, 100]"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Blueprint v16 §17.3, Handoff §14"
implementation_status: TBD
notes: "Trọng số 30/25/20/10/15 là đề xuất chờ kiểm chuẩn."

---
# 4. REFLEX & ADAPTATION FORMULA
formula_id: REFLEX_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Công thức đo lường khả năng phản xạ thích ứng lập luận
mathematical_expression: "R = 0.45 * ChallengeRecognition + 0.35 * ResponseQuality + 0.20 * Adaptation"
inputs:
  ChallengeRecognition: "Khả năng nhận diện thế bí/thách thức [0, 100]"
  ResponseQuality: "Chất lượng câu trả lời phản hồi [0, 100]"
  Adaptation: "Khả năng chuyển hướng chiến thuật [0, 100]"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Blueprint v16 §17.3, Handoff §17"
implementation_status: TBD
notes: "Tuyệt đối không đo bằng độ trễ mili-giây (Zero Latency Penalty)."

---
# 5. STYLE SCORING FORMULA
formula_id: STYLE_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Công thức tổng hợp điểm phong cách truyền đạt
mathematical_expression: "Style = 0.30 * C + 0.20 * P + 0.15 * Pr + 0.15 * F + 0.20 * E"
inputs:
  C: "Communication Clarity [0, 100]"
  P: "Pace Control [0, 100]"
  Pr: "Prosody Variation [0, 100]"
  F: "Fluency [0, 100]"
  E: "Engagement & Presence [0, 100]"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Blueprint v16 §17.4, Handoff §22"
implementation_status: TBD
notes: "Trọng số 30/20/15/15/20 là đề xuất chờ kiểm chuẩn."

---
# 6. PROSODY SCORING FORMULA
formula_id: PROSODY_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Công thức đo lường độ truyền cảm và ngữ điệu âm thanh
mathematical_expression: "Prosody = 0.40 * PitchVariation + 0.30 * EmphasisAlignment + 0.30 * PauseStructure"
inputs:
  PitchVariation: "Độ biến thiên cao độ F0 hợp lý [0, 100]"
  EmphasisAlignment: "Khả năng nhấn giọng đúng trọng tâm câu [0, 100]"
  PauseStructure: "Cấu trúc ngắt nghỉ biểu cảm [0, 100]"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Blueprint v16 §17.4, Handoff §26"
implementation_status: TBD
notes: "Cấm chấm điểm dựa trên pitch cao/trầm cố định. Cần module trích xuất F0."

---
# 7. WPM-TO-PACE SCORING CURVE
formula_id: WPM_PACE_CURVE_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Đường cong chuyển đổi tốc độ phát âm sang điểm số Pace
mathematical_expression: |
  if (wpm >= 120 && wpm <= 150) return 100;
  if (wpm >= 110 && wpm < 120) return 90 + (wpm - 110);
  if (wpm >= 100 && wpm < 110) return 80 + (wpm - 100);
  if (wpm >= 151 && wpm <= 160) return 99 - (wpm - 151);
  if (wpm >= 161 && wpm <= 170) return 89 - (wpm - 161) * 1.4;
  if (wpm > 170) return Math.max(0, 55 - (wpm - 170) * 2);
  if (wpm < 100) return Math.max(0, 80 - (100 - wpm) * 1.5);
inputs:
  wpm: "Tốc độ nói tính bằng từ/phút (WordCount / DurationMinutes)"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Master Handoff §25"
implementation_status: TBD
notes: "Đường cong piecewise đề xuất; bắt buộc kiểm chuẩn qua dữ liệu âm thanh thực tế."

---
# 8. PAUSE STABILITY SCORING CURVE
formula_id: PAUSE_STABILITY_CURVE_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Đường cong suy giảm điểm ngắt nghỉ khi lệch vùng tối ưu (10% - 25%)
mathematical_expression: |
  let score = 100;
  if (pauseRatio < 10) score = 100 - (10 - pauseRatio) * 2;
  else if (pauseRatio > 25) score = 100 - (pauseRatio - 25) * 2;
  return Math.max(0, Math.min(100, score));
inputs:
  pauseRatio: "Tỷ lệ phần trăm thời gian ngắt nghỉ (0 - 100%)"
output_range: "[0, 100]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Master Handoff §24, voiceTelemetry.ts"
implementation_status: COMPLIANT_IN_TELEMETRY
notes: "Đã có code trong telemetry nhưng cần đối soát kiểm chuẩn trước khi freeze thành luật."

---
# 9. FILLER SEVERITY CLASSIFICATION
formula_id: FILLER_SEVERITY_V1_CANDIDATE
formula_version: 16.0.0-candidate.1
formula_status: CANDIDATE
definition: Phân tầng mức độ nghiêm trọng của từ đệm
mathematical_expression: |
  F1 (Tự nhiên)     : 1 - 2 từ đệm / phút  -> Điểm Fluency khấu trừ <= 5%
  F2 (Đáng chú ý)   : > 2 - 4 từ đệm / phút -> Điểm Fluency khấu trừ 10% - 25%
  F3 (Gây rối loạn) : > 4 từ đệm / phút     -> Điểm Fluency khấu trừ > 30%
inputs:
  fillerRate: "Số từ đệm hợp lệ trên mỗi phút phát biểu (FillerCount / DurationMinutes)"
output_range: "Classification [F1, F2, F3]"
calibration_required: true
human_validation_status: MISSING
promotion_eligible: false
authority_source: "Master Handoff §32"
implementation_status: TBD
notes: "Chưa được freeze. Cần kiểm chuẩn trên Speech Corpus tiếng Việt."
```

---

# 7. PHÂN TÁCH ĐẶC BIỆT CÁC THÀNH PHẦN NHẠY CẢM

### 7.1. Phân Tách Âm Học: Đo Lường (Measurement) vs Chuẩn Mực (Benchmark) vs Đường Cong (Curve)
* **`PAUSE-MEASUREMENT`:** Đo khoảng lặng giữa 2 từ liên tiếp $\ge 1.2$ giây $\implies$ 🟢 **`FROZEN MEASUREMENT PIPELINE`**.
* **`PAUSE-BENCHMARK`:** Vùng ngắt nghỉ tối ưu chuẩn WSDC $10\% \le \text{PauseRatio} \le 25\%$ $\implies$ 🟢 **`FROZEN BENCHMARK`**.
* **`PAUSE-SCORING-CURVE`:** Hàm suy giảm điểm số trừ 2 điểm cho mỗi 1% lệch $\implies$ 🔵 **`CANDIDATE SCORING CURVE`** (Cần đối soát kiểm chuẩn).
* **`WPM-ZONES`:** Phân vùng $<100$ (Slow), $120-150$ (Optimal), $>170$ (Fast) $\implies$ 🟢 **`FROZEN WPM ZONES`**.
* **`WPM-SCORING-CURVE`:** Phương trình số học chuyển WPM sang điểm số $\implies$ 🔵 **`CANDIDATE SCORING CURVE`**.

### 7.2. Phân Tách Hiện Tượng Máy Xay Gió (Windmiller Failure)
* **`WINDMILLER-TRIGGER`:** Điều kiện kích hoạt vi phạm $(\text{WPM} > 170) \land (\text{PauseRatio} < 10\%)$ $\implies$ 🟢 **`FROZEN TRIGGER CONDITION`**.
* **`WINDMILLER-PENALTY-FUNCTION`:** Hàm toán học trừ điểm chính xác $\implies$ 🔴 **`SPEC GAP / CANDIDATE`** (Khái niệm "trừ cực nặng" chưa phải là một phương trình số học).

### 7.3. Phân Tách Hard Caps & Giới Hạn Dẫn Xuất
* **Logic Contradiction Cap:** $\text{Logic} \le 3.0 / 10.0$ $\implies$ 🟢 **`FROZEN HARD CAP`**.
* **Core Clash Failure Cap:** $\text{Strategy} \le 3.0 / 10.0$ $\implies$ 🟢 **`FROZEN HARD CAP`**.
* **Content Cap on Contradiction:** $\text{Content} \le 4.0 / 10.0$ $\implies$ 🔵 **`CANDIDATE / DERIVED RULE (NOT FROZEN)`** (Không có căn cứ văn bản, để điểm Content suy giảm tự nhiên theo trọng số).

### 7.4. Phân Tách Thang Điểm Hệ Thống (Dual-Scale Architecture)
* **SCALE-01 (Internal Computational Scale):** Thang chuẩn hóa $[0, 100]$ kiểu số thực `Double Precision` $\implies$ 🔵 **`CANDIDATE ARCHITECTURAL NORMALIZATION`**.
* **SCALE-02 (Storage & Display Scale):** Thang hiển thị UI và trường cơ sở dữ liệu `score_total` $[0.0, 10.0]$ làm tròn 1 chữ số $\implies$ 🔷 **`CONFIRMED PRINCIPLE / FORMAL APPROVAL REQUIRED`**.

---

# 8. BẢNG MA TRẬN THẨM QUYỀN TOÀN DIỆN (MASTER AUTHORITY TABLE)

| ID | Thành Phần Chấm Điểm | Định Nghĩa Quy Chuẩn (Normative Definition) | Nguồn Thẩm Quyền | Auth Status | Impl Status | Calib Status | Human Valid | Promotion Eligible | Ghi Chú Kỹ Thuật & Drift |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **REQ-01** | Session Aggregation | $\text{Score}_{\text{Total}} = 0.40C + 0.20S + 0.40V$ | Blueprint v16 (§17.1) | 🟢 FROZEN | 🔴 DRIFT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Code hiện tại lấy trung bình `coach.score`. |
| **REQ-02** | Content Weight ($C$) | Trọng số Nội dung $= 40\%$ ($0.40$) | Blueprint v16 (§17.1) | 🟢 FROZEN | 🔴 DRIFT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Khóa dứt khoát. |
| **REQ-03** | Strategy Weight ($S$) | Trọng số Chiến thuật $= 20\%$ ($0.20$) | Blueprint v16 (§17.1) | 🟢 FROZEN | 🔴 DRIFT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Khóa dứt khoát. |
| **REQ-04** | Style Weight ($V$) | Trọng số Phong cách $= 40\%$ ($0.40$) | Blueprint v16 (§17.1) | 🟢 FROZEN | 🔴 DRIFT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Khóa dứt khoát. |
| **REQ-05** | Content Raw ($C_{\text{raw}}$)| $C_{\text{raw}} = 0.30L + 0.20E + 0.15\text{CRE} + 0.25R + 0.10A$ | Blueprint v16 (§17.2) | 🔵 CANDIDATE | 🔴 TBD | REQUIRED | MISSING | 🔴 FALSE | Đề xuất ứng viên chờ hiệu chuẩn. |
| **REQ-06** | Evidence Model | $\text{EvidenceContrib} = \text{Presence} \times E_{\text{quality}}$ | Blueprint v16 (§17.2) | 🟢 FROZEN | 🔴 DRIFT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Binary Presence Gate ($0$ hoặc $1$). |
| **REQ-07** | Relevance Gate | $\text{Relevance} = 0 \implies \text{EvidenceContrib} = 0$ | Blueprint v16 (§17.2) | 🟢 FROZEN | 🔴 DRIFT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | 5★ lạc đề nhân chéo bằng $0$đ. |
| **REQ-08** | Evidence Quality 3D | $E_{\text{quality}} = 0.40E_{\text{src}} + 0.35E_{\text{rel}} + 0.25E_{\text{suf}}$ | Handoff (§9) | 🔵 CANDIDATE | 🔴 TBD | REQUIRED | MISSING | 🔴 FALSE | Đề xuất 3 chiều chờ hiệu chuẩn. |
| **REQ-09** | Evidence Stars (1★-5★) | Phân tầng giá trị dẫn chứng $1★ \to 5★$ | Blueprint v16 (§17.2) | 🔷 CONFIRMED | 🔴 DRIFT | REQUIRED | MISSING | 🔴 FALSE | 🔴 **SPEC GAP:** Thiếu bảng Lookup số học $E_{\text{src}}$. |
| **REQ-10** | Fallacy Penalty Rule | $\text{FallacyPenalty} = 1.5 \times N_{\text{fallacy}}$ | Blueprint v16 (§17.2) | 🟢 FROZEN | 🔴 CONFLICT | REQUIRED | MISSING | 🟢 ELIGIBLE (Rule) | Quy chuẩn tối cao đã khóa; code bị lệch (Drift). |
| **REQ-11** | Logic Hard Cap | Mâu thuẫn tiền đề $\implies \text{Logic} \le 3.0 / 10.0$ | Blueprint v16 (§17.5) | 🟢 FROZEN | 🔴 MISSING | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Hard cap TC-CAL-01 đã khóa dứt khoát. |
| **REQ-12** | Content Cap on Logic | $\text{Content} \le 4.0 / 10.0$ | Suy luận phân tích cũ | 🔵 CANDIDATE | 🔴 MISSING | REQUIRED | MISSING | 🔴 FALSE | **KHÔNG FROZEN**. Chỉ là suy luận đề xuất. |
| **REQ-13** | Strategy Formula ($S$) | $S = 0.30I + 0.25E + 0.20R + 0.10P + 0.15T$ | Blueprint v16 (§17.3) | 🔵 CANDIDATE | 🔴 TBD | REQUIRED | MISSING | 🔴 FALSE | Trọng số $30/25/20/10/15$ là proposal. |
| **REQ-14** | Core Clash Hard Cap | Bỏ qua xung đột chính $\implies \text{Strategy} \le 3.0$ | Blueprint v16 (§17.5) | 🟢 FROZEN | 🔴 MISSING | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Hard cap TC-CAL-03 đã khóa dứt khoát. |
| **REQ-15** | Reflex Zero Latency | Tuyệt đối KHÔNG phạt độ trễ mili-giây | Blueprint v16 (§17.3) | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Khóa nguyên tắc không phụ thuộc mạng. |
| **REQ-16** | POI Floor & Safety | Micro $\le 15$s; Khóa phút đầu & phút cuối | Spec 00, Blueprint v16 | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Đã có bộ đếm và luật WSDC cứng. |
| **REQ-17** | Style Formula | $\text{Style} = 0.30C + 0.20P + 0.15\text{Pr} + 0.15F + 0.20E$ | Blueprint v16 (§17.4) | 🔵 CANDIDATE | 🔴 TBD | REQUIRED | MISSING | 🔴 FALSE | Trọng số $30/20/15/15/20$ là proposal. |
| **REQ-18** | Style Philosophy | Hiệu quả giao tiếp, không xét giọng hay/dở | Handoff (§20) | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Khóa triết lý sư phạm. |
| **REQ-19** | WPM Zone Boundaries | $<100$ Slow, $120-150$ Optimal, $>170$ Fast | Spec 08, Handoff (§23)| 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Đã cài đặt trong `voiceTelemetry.ts`. |
| **REQ-20** | WPM-to-Pace Curve | Đường cong giảm điểm mềm cho dải lệch | Handoff (§25) | 🔵 CANDIDATE | 🔴 DRIFT | REQUIRED | MISSING | 🔴 FALSE | Cần hiệu chuẩn trên tập âm thanh. |
| **REQ-21** | Pause Measurement | Đo khoảng lặng giữa 2 từ $\ge 1.2$s | Spec 08 (§2) | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Bóc tách bằng Whisper word timestamps. |
| **REQ-22** | Pause Benchmark | Vùng tối ưu: $10\% \le \text{PauseRatio} \le 25\%$ | Handoff (§24) | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Chuẩn tỷ lệ ngắt nghỉ đã khóa. |
| **REQ-23** | Pause Scoring Curve | Phạt lệch chuẩn $2$ điểm cho mỗi $1\%$ lệch | `voiceTelemetry.ts` | 🔵 CANDIDATE | 🟢 COMPLIANT | REQUIRED | MISSING | 🔴 FALSE | Đường cong đề xuất cần kiểm chứng. |
| **REQ-24** | Windmiller Trigger | Điều kiện: $\text{WPM} > 170 \text{ AND Pause} < 10\%$ | Blueprint v16 (§17.5) | 🟢 FROZEN | 🔴 MISSING | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Điều kiện kích hoạt đã khóa cứng. |
| **REQ-25** | Windmiller Penalty Func| Hàm toán học trừ điểm dồn ép nuốt chữ | Blueprint v16 (§17.5) | 🔵 CANDIDATE | 🔴 MISSING | REQUIRED | MISSING | 🔴 FALSE | 🔴 **SPEC GAP:** Chưa có hàm số học cụ thể. |
| **REQ-26** | Accent Fairness | Giọng vùng miền là Protected Feature | Blueprint v16 (§17.4) | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Khóa tuyệt đối luật không phân biệt. |
| **REQ-27** | Zero Waste LLM Rule | Cấm dùng LLM cho telemetry xác định | Spec 00, Spec 05 | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Bất biến kỹ thuật tiết kiệm chi phí. |
| **REQ-28** | Non-Identity Profile | Cấm gán nhãn phẩm chất con người | Blueprint v16 (§16.1) | 🟢 FROZEN | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Bất biến sư phạm tối cao. |
| **REQ-29** | SCALE-01 Computational| Thang điểm tính toán nội bộ $[0, 100]$ | Toàn bộ tài liệu | 🔵 CANDIDATE | 🔴 DRIFT | NOT_REQ | NOT_REQ | 🔴 FALSE | Đề xuất chuẩn hóa Double Precision. |
| **REQ-30** | SCALE-02 Persistence | Thang điểm lưu DB & hiển thị $[0.0, 10.0]$ | Spec 13, Spec 18, Schema | 🔷 CONFIRMED | 🟢 COMPLIANT | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Chuẩn $[0.0, 10.0]$ làm tròn 1 chữ số. |
| **REQ-31** | Formula Versioning | Bắt buộc lưu `formula_version` với derived score | Handoff (§45, §46) | 🟢 FROZEN | 🔴 MISSING | NOT_REQ | NOT_REQ | 🟢 ELIGIBLE | Khóa yêu cầu kiến trúc truy vết. |

---

# 9. MA TRẬN 25 CA KIỂM CHUẨN (25-CASE CALIBRATION MATRIX)

> **Lưu Ý Ranh Giới Thẩm Quyền:**  
> * `Scenario Authorization`: Kịch bản kiểm thử có được tài liệu quy chuẩn cho phép hay không.  
> * `Deterministic Acceptance Output`: Đầu ra số học đã xác định dứt khoát hay đang chờ chạy dữ liệu kiểm chuẩn (*Calibration Required*). Tuyệt đối không biến dải điểm kỳ vọng thành tiêu chuẩn nghiệm thu cứng.

| Case ID | Miền Đánh Giá | Kịch Bản Kiểm Thử | Scenario Auth | Formula Status | Output Status | Calibration Required? | Nguồn Quy Chuẩn |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| **TC-01** | Content | Không có dẫn chứng ($E=0$) | 🟢 AUTHORIZED | 🟢 FROZEN | $E_{\text{contrib}} = 0 \implies \text{DETERMINISTIC}$ | ❌ NO | Blueprint v16 (§17.2) |
| **TC-02** | Content | Dẫn chứng 1★ nguồn yếu | 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [6.0, 6.5] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§7) |
| **TC-03** | Content | Dẫn chứng 3★ chuẩn mực | 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [7.5, 8.2] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§7) |
| **TC-04** | Content | Dẫn chứng 5★ xuất sắc | 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [9.0, 9.8] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§7) |
| **TC-05** | Content | 5★ nhưng Lạc đề (Irrelevant)| 🟢 AUTHORIZED | 🟢 FROZEN | $E_{\text{contrib}} = 0 \implies \text{DETERMINISTIC}$ | ❌ NO | Blueprint v16 (§17.5 TC-02) |
| **TC-06** | Content | Dẫn chứng đúng nhưng chưa đủ | 🔵 PROPOSED | 🔵 CANDIDATE | Content $\in [6.8, 7.4] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§8) |
| **TC-07** | Content | C-R-E Hoàn chỉnh | 🟢 AUTHORIZED | 🔷 CONFIRMED | Content $\in [9.5, 10.0] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Spec 05, Spec 13 |
| **TC-08** | Content | Chỉ có Luận điểm (Claim only)| 🟢 AUTHORIZED | 🔷 CONFIRMED | Content $\le 3.0 \implies \text{STRUCTURAL GATE}$ | ❌ NO | Blueprint v15/v16 |
| **TC-09** | Content | Claim + Reason, thiếu Evidence| 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [6.5, 7.2] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Blueprint v16 (§17.2) |
| **TC-10** | Content | Dẫn chứng không có lập luận | 🔵 PROPOSED | 🔵 CANDIDATE | Content $\in [3.5, 4.5] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§11) |
| **TC-11** | Content | Mắc 2 lỗi ngụy biện | 🟢 AUTHORIZED | 🟢 FROZEN (Rule) | Trừ đúng $3.0$đ $\implies \text{DETERMINISTIC PENALTY}$ | ❌ NO | Blueprint v16 (§17.2) |
| **TC-12** | Content | Mâu thuẫn trực tiếp | 🟢 AUTHORIZED | 🟢 FROZEN | $\text{Logic} \le 3.0 \implies \text{DETERMINISTIC HARD CAP}$ | ❌ NO | Blueprint v16 (§17.5 TC-01) |
| **TC-13** | Strategy| Bám sát Core Clash xuất sắc | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.8, 9.5] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Blueprint v16 (§17.3) |
| **TC-14** | Strategy| Nói nhiều ý phụ, né Core Clash| 🟢 AUTHORIZED | 🟢 FROZEN | $\text{Strategy} \le 3.0 \implies \text{DETERMINISTIC CAP}$ | ❌ NO | Blueprint v16 (§17.5 TC-03) |
| **TC-15** | Strategy| Phản biện trực diện đối thủ | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.5, 9.2] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§16) |
| **TC-16** | Strategy| Đọc văn mẫu (Scripted) | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [3.5, 4.5] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§16) |
| **TC-17** | Strategy| Phản xạ thích ứng linh hoạt | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.5, 9.2] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Blueprint v16 (§17.3) |
| **TC-18** | Strategy| Xử lý POI $\le 15$s sắc bén | 🟢 AUTHORIZED | 🟢 FROZEN | Đạt chuẩn POI $\implies \text{DETERMINISTIC GATE}$ | ❌ NO | Spec 00, Spec 06 |
| **TC-19** | Strategy| Phân bổ thời lượng chuẩn | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.5, 9.5] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§19) |
| **TC-20** | Strategy| Cháy giáo án / Phân bổ kém | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [4.0, 5.0] \implies \text{CANDIDATE RANGE}$ | 🟢 YES | Master Handoff (§19) |
| **TC-21** | Style | Tốc độ quá chậm ($<100$ WPM)| 🟢 AUTHORIZED | 🟢 FROZEN | Xếp vùng SLOW $\implies \text{DETERMINISTIC ZONE}$ | ❌ NO | Voice Spec 08 |
| **TC-22** | Style | Tốc độ tối ưu ($135$ WPM) | 🟢 AUTHORIZED | 🟢 FROZEN | Xếp vùng OPTIMAL $\implies \text{DETERMINISTIC ZONE}$| ❌ NO | Voice Spec 08 |
| **TC-23** | Style | Máy xay gió (Windmiller) | 🟢 AUTHORIZED | 🟢 FROZEN Trig | Kích hoạt phạt Pace $\implies \text{CALIBRATION CURVE}$ | 🟢 YES | Blueprint v16 (§17.5 TC-04) |
| **TC-24** | Style | Lạm dụng từ đệm ($>4$/phút) | 🔵 PROPOSED | 🔵 CANDIDATE | Phân loại $F_3 \implies \text{CALIBRATION CURVE}$ | 🟢 YES | Master Handoff (§32) |
| **TC-25** | Style | Giọng Nghệ An chuẩn phát âm| 🟢 AUTHORIZED | 🟢 FROZEN Pol | $\text{Style} \ge 8.5 \implies \text{FAIRNESS BENCHMARK}$ | ❌ NO | Blueprint v16 (§17.5 TC-05) |

---

# 10. QUY TRÌNH KIỂM CHUẨN TƯƠNG LAI (CALIBRATION PROTOCOL PIPELINE)

Quy trình chuẩn hóa để chuyển đổi một công thức từ **`CANDIDATE`** sang **`FROZEN`** bắt buộc phải trải qua 11 bước khép kín:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: THU THẬP TẬP MẪU THỰC TẾ (Real Debate Speech & Text Samples)       │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 2: CHẤM ĐIỂM ĐỘC LẬP BỞI GIÁM KHẢO CON NGƯỜI (Human WSDC Judges)      │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 3: GÁN NHÃN ĐA CHIỀU (Independent Micro-metric & Domain Annotations)  │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 4: ĐỐI SOÁT ĐỘ ĐỒNG THUẬN GIÁM KHẢO (Inter-Rater Agreement / Kappa)   │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 5: CHẠY THỬ NGHIỆM CÔNG THỨC ỨNG VIÊN (Candidate Formula Execution)   │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 6: ĐỐI CHIẾU MÔ HÌNH VỚI CON NGƯỜI (Model vs Human Comparison)        │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 7: PHÂN TÍCH SAI SỐ & LỆCH VÙNG MIỀN (Error & Bias Analysis)          │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 8: ĐIỀU CHỈNH TRỌNG SỐ NẾU CẦN (Formula Parameter Revision)           │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 9: CHẠY BỘ KIỂM THỬ HỒI QUY (Regression Suite Execution)              │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 10: PHÊ DUYỆT BẰNG VĂN BẢN (Product / Domain Owner Approval)          │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 11: ĐĂNG KÝ PHIÊN BẢN CÔNG THỨC CHÍNH THỨC (Formula Version Freeze)   │
│          ➔ CHUYỂN TRẠNG THÁI: CANDIDATE ──► FROZEN                         │
└────────────────────────────────────────────────────────────────────────────┘
```

> **Lưu ý Thẩm quyền:** Hiện tại chưa có ngưỡng thống kê nghiệm thu toán học nào (như $MAE \le 0.5$ hay Pearson $r \ge 0.85$) được ghi nhận trong Blueprint v16. Mọi ngưỡng dung sai sai số cụ thể được phân loại là **`SPEC GAP`** và sẽ do Hội đồng Chuyên môn phê duyệt cùng đợt bàn giao Golden Dataset.

---

# 11. LỘ TRÌNH DỮ LIỆU THỰC CHỨNG (HUMAN GROUND TRUTH ROADMAP)

* **Hiện Trạng Dữ Liệu:** **`HUMAN-GROUND-TRUTH = MISSING`** (Hoàn toàn chưa có bộ dữ liệu mẫu có nhãn của trọng tài con người trong repository).
* **Kế Hoạch Xây Dựng Tập Mẫu (Proposed Roadmap):**
  * **Quy mô mẫu:** Tối thiểu 50 bài phát biểu tranh biện thực tế của học sinh Việt Nam (Bao gồm cả Text Debate và Voice Debate).
  * **Đa dạng vùng miền:** Đảm bảo tối thiểu $30\%$ mẫu giọng miền Bắc, $35\%$ mẫu giọng miền Trung (Nghệ An, Hà Tĩnh, Huế, Đà Nẵng), $35\%$ mẫu giọng miền Nam.
  * **Hội đồng Giám khảo:** 3 trọng tài/huấn luyện viên tranh biện chuẩn WSDC/BP độc lập thực hiện chấm điểm mù (*Blind Adjudication*) theo rubric C-R-E và DSP.
* **Cảnh Báo Thẩm Quyền:** Tuyệt đối không được mô tả lộ trình này như một công việc đã hoàn thành.

---

# 12. SỔ THEO DÕI SAI LỆCH MÃ NGUỒN (IMPLEMENTATION DRIFT REGISTER)

Dưới đây là danh mục các điểm sai lệch giữa mã nguồn hiện tại và Quy chuẩn thẩm quyền cao nhất Master Blueprint v16 cần được khắc phục (*REMEDIATION REQUIRED*):

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. DRIFT TẠI radarCalculator.ts                                             │
│    • Hiện trạng code: Tính FallacyPenalty = min(15, uniqueFallacies * 2).   │
│    • Quy chuẩn Blueprint v16: FallacyPenalty = 1.5 * N_fallacy.             │
│    • Phân loại: 🔴 IMPLEMENTATION DRIFT (REMEDIATION REQUIRED).             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. DRIFT TẠI docs/07_SCORING_SPEC.md                                        │
│    • Hiện trạng tài liệu: Thang điểm 100 cũ, Fallacy phạt 5-10đ trần 20đ.   │
│    • Quy chuẩn Blueprint v16: Thang 40/20/40, Fallacy phạt 1.5đ không trần.│
│    • Phân loại: 🔴 DEPRECATED SPECIFICATION (UPDATE REQUIRED).              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. DRIFT TẠI debateController.ts (Session Aggregation)                      │
│    • Hiện trạng code: Lấy trung bình cộng coachFeedback.score; nhân giả lập │
│                       score * 0.98, score * 1.02, score * 0.95.             │
│    • Quy chuẩn Blueprint v16: Tính 0.40 Content + 0.20 Strategy + 0.40 Style│
│    • Phân loại: 🔴 CRITICAL IMPLEMENTATION DRIFT (REMEDIATION REQUIRED).   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. THIẾU SÓT LƯU TRỮ formula_version TRONG DATABASE                         │
│    • Hiện trạng schema.prisma: debate_sessions chỉ có score_total đơn độc,  │
│                                thiếu formula_version và calculated_at.      │
│    • Quy chuẩn Handoff: Bắt buộc lưu version để phục vụ Recalculation.      │
│    • Phân loại: 🔴 IMPLEMENTATION GAP (SCHEMA AMENDMENT REQUIRED LATER).    │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Ràng Buộc Nghiêm Ngặt:** Không tiến hành sửa đổi các mục Drift trên trong tác vụ hiện tại. Chúng được ghi nhận chính thức để xử lý trong giai đoạn Implementation Phase sau khi hoàn tất Calibration Contract.

---

# 13. CÁC HÀNH VI BỊ NGHIÊM CẤM (FORBIDDEN ACTIONS)

Trong khuôn khổ tác vụ thiết lập hợp đồng tài liệu thẩm quyền này, nghiêm cấm tuyệt đối các hành vi sau:
1. ❌ **CẤM** chỉnh sửa tệp `radarCalculator.ts`, `skillLevelScorers.ts`, `voiceDspService.ts`, `debateController.ts`.
2. ❌ **CẤM** chỉnh sửa tệp lược đồ Prisma `schema.prisma` hoặc tạo migration cơ sở dữ liệu mới.
3. ❌ **CẤM** thay đổi hành vi lưu trữ điểm số hoặc API response của backend/frontend.
4. ❌ **CẤM** tự ý thay thế các công thức `CANDIDATE` bằng các phương trình tự chế "nghe hay hơn".
5. ❌ **CẤM** tự ý tuyên bố các công thức `CANDIDATE` đã trở thành `FROZEN`.
6. ❌ **CẤM** tuyên bố kết quả Unit Test là Ground Truth hoặc kết quả kiểm chuẩn hoàn tất.
7. ❌ **CẤM** tự ý giải thích lại hoặc làm sai lệch nội dung của Master Blueprint v16.

---

# 14. BẢNG KIỂM TRA TÍNH TOÀN VẸN TÀI LIỆU (DOCUMENT INTEGRITY AUDIT)

Bản kiểm toán tài liệu xác nhận đã đáp ứng đầy đủ 20 tiêu chí nghiệm thu:

- [x] 1. Mọi quy tắc `FROZEN` đều có trích dẫn nguồn thẩm quyền xác thực.
- [x] 2. Mọi công thức `CANDIDATE` đều được dán nhãn `formula_status: CANDIDATE` tường minh.
- [x] 3. Mọi công thức `CANDIDATE` đều ghi nhận rõ ràng `calibration_required: true`.
- [x] 4. Không có bất kỳ công thức Candidate nào bị tự động nâng cấp (No Implicit Promotion).
- [x] 5. Không có tệp Synthetic Unit Test nào bị gọi là Ground Truth.
- [x] 6. Tất cả các `SPEC GAP` toán học đều được liệt kê đầy đủ.
- [x] 7. Sai lệch mã nguồn (`IMPLEMENTATION DRIFT`) được tách biệt hoàn toàn khỏi quy chuẩn thẩm quyền.
- [x] 8. Quy chuẩn `FallacyPenalty = 1.5 * N_fallacy` được công nhận là Normative Rule của Blueprint v16.
- [x] 9. Hard Cap `Logic <= 3.0` được công nhận là `FROZEN`.
- [x] 10. Hard Cap `Strategy <= 3.0` được công nhận là `FROZEN`.
- [x] 11. Giới hạn `Content <= 4.0` được xác định chính xác là `CANDIDATE / NOT FROZEN`.
- [x] 12. Điều kiện kích hoạt Windmiller (`WPM > 170 & Pause < 10%`) được công nhận là `FROZEN`.
- [x] 13. Hàm trừ điểm Windmiller được phân loại chính xác là `CANDIDATE / SPEC GAP`.
- [x] 14. Chính sách công bằng giọng vùng miền (Accent Fairness) được công nhận là `FROZEN`.
- [x] 15. Nguyên tắc Zero Waste LLM được công nhận là `FROZEN`.
- [x] 16. Quy tắc an toàn đấu trường POI 15s được công nhận là `FROZEN`.
- [x] 17. Yêu cầu lưu trữ `formula_version` được công nhận là `FROZEN`.
- [x] 18. Kiến trúc thang điểm Dual-scale được phân loại chính xác là `CONFIRMED PRINCIPLE / FORMAL APPROVAL REQUIRED`.
- [x] 19. Toàn bộ 25 kịch bản kiểm chuẩn được bảo toàn nguyên vẹn với phân định rõ giữa Scenario Auth và Output Status.
- [x] 20. Tuyệt đối không có bất kỳ tệp mã nguồn hay schema cơ sở dữ liệu nào bị thay đổi.

---

# 15. TUYÊN BỐ THẨM QUYỀN TỐI CAO (FINAL AUTHORITY DECLARATION)

> **`SCORING FORMULA CONTRACT v1` LÀ BẢN HỢP ĐỒNG PHÂN ĐỊNH THẨM QUYỀN VÀ TRẠNG THÁI CÔNG THỨC.**
> 
> Văn bản này **KHÔNG ĐỒNG NGHĨA** với việc mọi công thức chứa trong tài liệu đã được đóng băng để code. Bản hợp đồng phân định rõ ràng:
> * **NHỮNG GÌ ĐÃ LÀ LUẬT (FROZEN NORMATIVE LAWS)**
> * **NHỮNG GÌ LÀ NGUYÊN TẮC ĐÃ CHỐT CẦN ĐẶC TẢ TOÁN HỌC (CONFIRMED PRINCIPLES)**
> * **NHỮNG GÌ LÀ CÔNG THỨC ĐỀ XUẤT CHỜ HIỆU CHUẨN (CANDIDATE PROPOSALS)**
> * **NHỮNG GÌ LÀ SAI LỆCH MÃ NGUỒN CẦN SỬA ĐỔI (IMPLEMENTATION DRIFTS)**
> * **NHỮNG GÌ LÀ LỖ HỔNG ĐẶC TẢ CẦN PHÊ DUYỆT (SPEC GAPS)**
> 
> Con đường hợp lệ duy nhất để đưa công thức vào Production Scoring Engine:
> $$\text{CANDIDATE} \longrightarrow \text{REAL-DATA CALIBRATION} \longrightarrow \text{HUMAN VALIDATION} \longrightarrow \text{REGRESSION} \longrightarrow \text{OWNER APPROVAL} \longrightarrow \text{FORMAL FORMULA VERSION} \longrightarrow \text{FROZEN}$$
> 
> **MỌI HÀNH VI ĐI TẮT ĐỀU BỊ COI LÀ VI PHẠM TÍNH TOÀN VẸN CỦA HỆ THỐNG.**
