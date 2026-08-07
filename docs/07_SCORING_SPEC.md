# AI Debate Master — Scoring Specification

**Project:** AI Debate Master — Thinking OS  
**Document:** `docs/07_SCORING_SPEC.md`  
**Blueprint Version:** 3.0.0  
**Document Version:** 1.0.0  
**Status:** Technical Specification  
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`

---

## 1. Document Purpose & Scope

Tài liệu này đặc tả **Scoring Engine** của hệ thống AI Debate Master — Thinking OS.

Scoring Engine chịu trách nhiệm tổng hợp các kết quả đánh giá từ các thành phần phân tích tranh biện để tạo ra điểm số cuối cùng cho phiên tranh biện.

Đặc tả này đối chiếu trực tiếp với phần **Section 11 — Scoring Engine Architecture** trong Blueprint v3.0.0, trong đó công thức trọng số bắt buộc là:

    Score = (Content × 0.40) + (Style × 0.40) + (Strategy × 0.20)

Blueprint xác định ba nhóm điểm chính:
- Content — 40%
- Style — 40%
- Strategy — 20%

Blueprint cũng quy định cơ chế **Fallacy Deduction** với mức trừ **1.5 điểm cho mỗi lỗi logic** được phát hiện.

Tài liệu này **không tự bổ sung công thức hoặc quy tắc chấm điểm chi tiết chưa được Blueprint v3.0.0 đặc tả**. Những nội dung chưa đủ dữ liệu để triển khai chính xác được đánh dấu rõ là **SPEC GAP**.

---

## 2. Core Scoring Formula

### 2.1. Công thức tổng điểm
Công thức tổng điểm bắt buộc theo Blueprint:

    Score = (Content × 0.40) + (Style × 0.40) + (Strategy × 0.20)

Trong đó:

| Component | Weight | Nguồn đánh giá chính |
|---|---:|---|
| Content | 40% | Logic Coach |
| Style | 40% | Voice Coach / Voice Analysis Engine |
| Strategy | 20% | Interaction Coach |
| Psychology | Chưa được gán trọng số | Psychology Coach |

### 2.2. Nguyên tắc trọng số
Tổng trọng số của ba thành phần được sử dụng trong công thức là: `0.40 + 0.40 + 0.20 = 1.00`.

Psychology Coach là một trong bốn AI Coach của hệ thống nhưng Blueprint v3.0.0 chưa gán Psychology Coach vào công thức tổng điểm.
Do đó:
- Không được tự ý đưa Psychology vào Score.
- Không được tự ý phân bổ lại trọng số.
- Không được tự ý thay đổi Content / Style / Strategy weights.

---

## 3. Component Breakdown

### 3.1. Content — 40%

#### 3.1.1. Phạm vi đánh giá
Content đánh giá chất lượng nội dung và cấu trúc lập luận. Blueprint mô tả Content thông qua cấu trúc Knowledge Graph của luận điểm và khả năng phát hiện: Claim, Reason, Evidence, Tính logic, Lỗi ngụy biện (fallacy), Chất lượng dẫn chứng.

#### 3.1.2. Claim
Claim là kết luận hoặc luận điểm mà người học đưa ra để bảo vệ quan điểm.
`SPEC GAP:` Blueprint chưa đặc tả công thức định lượng cụ thể để chuyển chất lượng Claim thành giá trị điểm Content.

#### 3.1.3. Reason
Reason thể hiện lý do hoặc cơ chế dùng để hỗ trợ Claim.
`SPEC GAP:` Blueprint chưa quy định công thức hoặc trọng số riêng cho Reason bên trong Content.

#### 3.1.4. Evidence
Blueprint quy định Evidence Evaluation Scale từ 1 đến 5 sao:

| Evidence Star | Ý nghĩa theo Blueprint |
|---:|---|
| 5 | Có nghiên cứu khoa học, báo cáo uy tín như OECD, UNESCO... |
| 4 | Có số liệu thống kê cụ thể từ các tổ chức tin cậy |
| 3 | Có ví dụ thực tế cụ thể ngoài đời sống |
| 2 | Chỉ là ý kiến suy đoán chủ quan cá nhân |
| 1 | Suy đoán vô căn cứ, không có tính thực tế |

Dữ liệu `evidence_star` được lưu trong `debate_transcripts` dưới dạng số nguyên từ 1 đến 5.
`SPEC GAP:` Blueprint chưa quy định công thức mapping trực tiếp từ `evidence_star` sang điểm Content.

#### 3.1.5. Logic
Content bao gồm việc đánh giá tính logic (Cấu trúc lập luận, ngụy biện, dẫn chứng, Knowledge Graph, mâu thuẫn ẩn, lỗ hổng tiền đề).
`SPEC GAP:` Blueprint chưa đưa ra công thức toán học cụ thể để chuyển các kết quả phân tích logic thành một điểm Content chuẩn hóa.

### 3.2. Style — 40%

#### 3.2.1. Phạm vi đánh giá
Style đánh giá chất lượng truyền tải bài nói (40% tổng điểm) bao gồm: WPM, Fluency, Rhythm, Pauses, Filler Words.

#### 3.2.2. WPM
- Trên 170 WPM: nói quá nhanh.
- Dưới 100 WPM: nói quá chậm.
- 120–150 WPM: vùng tốc độ tối ưu.
`SPEC GAP:` Blueprint chưa quy định hàm toán học chuyển WPM thực tế thành điểm Style.

#### 3.2.3. Fluency & 3.2.4. Rhythm
`SPEC GAP:` Blueprint chưa quy định thang điểm hoặc công thức cụ thể lượng hóa Fluency và Rhythm thành điểm Style.

#### 3.2.5. Pauses
`SPEC GAP:` Blueprint chưa quy định khoảng pause bao nhiêu là tốt/lỗi, cách cộng/trừ điểm và trọng số của pause trong Style.

#### 3.2.6. Filler Words
Blueprint quy định nếu tần suất vượt quá **3 từ đệm trong 1 phút phát biểu** ("ờ", "ừm", "à", "thì là"), hệ thống sẽ trừ trực tiếp vào điểm Style.
`SPEC GAP:` Chưa quy định trừ bao nhiêu điểm, trừ một lần hay theo từng từ vượt ngưỡng, giới hạn mức trừ, và cách kết hợp với các chỉ số Style khác.

### 3.3. Strategy — 20%

#### 3.3.1. Phạm vi đánh giá
Strategy chiếm **20%** tổng điểm, bao gồm: Setup, Rebuttal, POI, Timing, Phân bổ thời gian bài phát biểu, Khả năng tương tác với đối phương.

#### 3.3.2. Setup & 3.3.3. Rebuttal
`SPEC GAP:` Blueprint chưa quy định công thức định lượng cụ thể đánh giá chất lượng Setup và Rebuttal thành điểm Strategy.

#### 3.3.4. POI
Interaction Coach theo dõi khả năng lắng nghe chủ động, mức độ bám sát trọng tâm, thời điểm chất vấn POI và né tránh câu hỏi.
`SPEC GAP:` Blueprint chưa quy định công thức mapping các kết quả POI thành điểm Strategy.

#### 3.3.5. Timing
`SPEC GAP:` Chưa quy định công thức tính điểm Timing, ngưỡng thời gian cụ thể, và trọng số riêng của Setup/Rebuttal/POI/Timing trong Strategy.

---

## 4. Fallacy Deduction Rule

### 4.1. Nguồn dữ liệu
Trường `fallacies_detected` (JSONB) thuộc `debate_transcripts` lưu mảng JSON chứa các lỗi ngụy biện.

### 4.2. Mức phạt
Quy tắc bắt buộc:

    Fallacy Deduction = -1.5 điểm / lỗi logic

(Ví dụ: Ad hominem, Strawman).

### 4.3. Quan hệ với Content
Fallacy Deduction thuộc phạm vi Content:

    Content_after_fallacy_deduction = Content_before_fallacy_deduction - (1.5 × số lỗi được tính)

`SPEC GAP:` Blueprint chưa đặc tả đầy đủ:
- Chính xác phần tử nào trong `fallacies_detected` được tính là một "lỗi".
- Cách xử lý khi cùng một lỗi lặp lại nhiều lần.
- Có giới hạn số lỗi tối đa được trừ hay không.
- Điểm Content có floor hay không, Điểm tổng Score có thể trở thành số âm hay không.

---

## 5. AI Coach Dependency

### 5.1. Logic Coach → Content
Dữ liệu từ Logic Coach (Cấu trúc, Ngụy biện, Dẫn chứng, Knowledge Graph) là nguồn chính cho **Content (40%)**.
`SPEC GAP:` Chưa đặc tả schema Evaluation Output chi tiết của Logic Coach dành riêng cho Scoring Engine.

### 5.2. Voice Coach → Style
Dữ liệu từ Voice Coach (WPM, Pitch, Breathing, Pauses, Filler Words) là nguồn chính cho **Style (40%)**.
`SPEC GAP:` Chưa đặc tả schema điểm trung gian tổng hợp các chỉ số Voice thành Style Score.

### 5.3. Interaction Coach → Strategy
Dữ liệu từ Interaction Coach (Lắng nghe chủ động, Bám sát trọng tâm, POI, Tương tác/Né tránh) là nguồn chính cho **Strategy (20%)**.
`SPEC GAP:` Chưa đặc tả schema điểm trung gian tổng hợp các chỉ số Interaction thành Strategy Score.

### 5.4. Psychology Coach
Psychology Coach phân tích Mức độ bình tĩnh, Linh hoạt tư duy, Kiểm soát cảm xúc, Tránh công kích. Tuy nhiên, nó **chưa được gán trọng số** trong Scoring Formula.
`SPEC GAP:` Blueprint chưa quy định Psychology Coach có được sử dụng như một thành phần điểm độc lập hay không.

---

## 6. Scoring Pipeline

Pipeline mức kiến trúc được xác định từ Blueprint:

    Debate Session
        ↓
    Transcript / Audio
        ↓
    Multi-Coach Analysis (Logic, Voice, Interaction, Psychology)
        ↓
    Component Evaluation (Content, Style, Strategy)
        ↓
    Fallacy Deduction (-1.5/lỗi)
        ↓
    Weighted Scoring (40% + 40% + 20%)
        ↓
    Final Score

---

## 7. Persistence Requirements Relevant to Scoring

Blueprint Database Design định nghĩa trong `debate_sessions`:
- `score_content`
- `score_style`
- `score_strategy`
- `score_total`

Blueprint định nghĩa trong `debate_transcripts`:
- `fallacies_detected`
- `evidence_star`

`SPEC GAP:` Chưa đặc tả chính xác thời điểm ghi các score fields, điểm được tính ở cấp transcript/speech/turn hay toàn session, và cách aggregate nhiều transcript/turn thành một score của toàn session.

---

## 8. Explicit Scoring Specification Gaps

1. **Thang điểm cơ sở:** Chưa xác định điểm tối đa là 10, 50 hay 100.
2. **Mapping Evidence Star → Content:** Chưa quy định cách mapping.
3. **Công thức Claim & Reason:** Chưa có công thức định lượng chất lượng.
4. **Công thức Logic:** Chưa mapping kết quả Knowledge Graph thành điểm Content.
5. **Công thức Style:** Chưa có công thức tổng hợp WPM, Fluency, Rhythm, Pauses.
6. **Filler Words Deduction:** Chưa quy định mức điểm bị trừ khi vượt ngưỡng 3 từ/phút.
7. **Công thức Strategy:** Chưa có công thức tổng hợp Setup, Rebuttal, POI, Timing.
8. **Aggregation Across Turns:** Chưa có công thức aggregate kết quả nhiều lượt.
9. **Fallacy Scope & Duplicates:** Chưa xác định cách đếm số lỗi và xử lý lỗi trùng lặp.
10. **Negative Score Handling:** Chưa quy định xử lý khi tổng phạt khiến điểm xuống dưới 0 (giữ nguyên, clamp về 0...).
11. **Score Rounding:** Chưa quy định số chữ số thập phân cần giữ.
12. **Coach Output Contract:** Chưa có schema chuẩn hóa đầy đủ từ Coach sang Scoring Engine.
13. **Psychology Score:** Chưa có trọng số chính thức.

---

## 9. Non-Invention Rules

1. Không thay đổi công thức: `Content 40% + Style 40% + Strategy 20%`
2. Không đưa Psychology Coach vào tổng điểm.
3. Không tự tạo công thức sub-metrics (Evidence Star, WPM, Filler Words, Setup...).
4. Không tự thay đổi mức Fallacy Deduction: `-1.5 điểm / lỗi logic`.
5. Không tự đặt thang điểm 10/50/100 hay quyết định floor/ceiling/xử lý điểm âm.

---

## 10. Compliance Checklist

- [x] Dẫn chiếu Section 11 — Scoring Engine Architecture.
- [x] Công thức Content 40% + Style 40% + Strategy 20%.
- [x] Content bao gồm Claim, Reason, Evidence, Logic, Fallacy.
- [x] Style bao gồm WPM, Fluency, Rhythm, Pauses, Filler Words.
- [x] Strategy bao gồm Setup, Rebuttal, POI, Timing.
- [x] Fallacy Deduction -1.5 điểm / lỗi.
- [x] Các luồng Coach -> Score Component được xác định.
- [x] Các phần chưa đặc tả được đánh dấu SPEC GAP rõ ràng.
- [x] Không tự bổ sung logic hoặc thang điểm ngoài Blueprint.

---

## 11. Document Status

**Status:** Blueprint-Aligned / Specification with Explicit Gaps  
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`, Version 3.0.0.

Tài liệu này chỉ đặc tả những gì có thể xác định trực tiếp từ Blueprint. Các công thức chi tiết còn thiếu không được tự suy diễn. Để triển khai Scoring Engine hoàn chỉnh, các mục được đánh dấu **SPEC GAP** phải được đặc tả và phê duyệt bổ sung trước khi hard-code.

**Current authoritative formula:**
`Score = (Content × 0.40) + (Style × 0.40) + (Strategy × 0.20)`

**Current authoritative fallacy rule:**
`Fallacy Deduction = -1.5 points / logical fallacy`