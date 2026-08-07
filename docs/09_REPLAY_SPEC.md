# 09_REPLAY_SPEC.md

# AI Debate Master — Thinking OS
## Replay Specification
### Version 3.0.0

---

## 1. Document Purpose & Scope

### 1.1. Purpose

Tài liệu này đặc tả **Debate Replay Engine** của hệ thống AI Debate Master — Thinking OS.

Replay Engine được xây dựng để cho phép người dùng xem lại một phiên Debate dựa trên dữ liệu đã được hệ thống ghi nhận và phân tích trong phiên Debate đó.

Tài liệu này đối chiếu trực tiếp với:

- **Blueprint v3.0.0**
- **Section 15 — Debate Replay Engine**

Replay là cơ chế **đọc lại dữ liệu đã tồn tại**, không phải một quy trình phân tích Debate mới.

### 1.2. Scope

Replay Engine bao gồm việc kết hợp và hiển thị bốn lớp dữ liệu chính:

1. Audio
2. Transcript
3. Timeline
4. AI Analysis JSON

Replay phải duy trì được mối liên hệ giữa các lớp dữ liệu này để người dùng có thể:

- nghe lại phần Audio tương ứng;
- theo dõi Transcript tương ứng;
- di chuyển theo Timeline;
- xem các kết quả phân tích AI đã được tạo trong phiên Debate;
- xác định các lỗi logic được Logic Coach đánh dấu;
- xác định các điểm WPM bất thường được Voice Coach đánh dấu.

Replay Engine **không được tạo ra một lần phân tích AI mới** khi người dùng thực hiện Replay.

---

# 2. Replay Engine Architecture

## 2.1. Data Layer Model

Replay Engine sử dụng mô hình dữ liệu gồm 4 lớp:

    Audio
        ↓
    Transcript
        ↓
    Timeline
        ↓
    AI Analysis JSON

Bốn lớp dữ liệu này phải được liên kết với nhau thông qua thông tin timestamp hoặc các cơ chế đồng bộ tương ứng được Blueprint quy định.

Nếu Blueprint chưa đặc tả chi tiết schema hoặc cơ chế liên kết cụ thể, phải đánh dấu:

    SPEC GAP: [Nội dung chưa được Blueprint v3.0.0 đặc tả]

---

## 2.2. Layer 1 — Audio

Audio là dữ liệu âm thanh được ghi nhận trong phiên Debate.

Replay Engine sử dụng Audio đã được lưu trữ để cho phép người dùng nghe lại phiên Debate.

Audio là dữ liệu nguồn phục vụ chức năng:

- Play;
- Pause;
- Seek;
- Replay theo Timeline;
- Đồng bộ với Transcript.

Định dạng, codec, bitrate, chunking, streaming và buffering cụ thể:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả đầy đủ codec Audio, container, bitrate, chunking, streaming protocol và client buffering strategy cho Replay.

---

## 2.3. Layer 2 — Transcript

Transcript là nội dung lời nói đã được chuyển thành văn bản trong phiên Debate.

Transcript được sử dụng để:

- hiển thị nội dung Debate;
- đồng bộ với Audio;
- xác định đoạn Transcript tương ứng với vị trí trên Timeline;
- hỗ trợ người dùng theo dõi nội dung khi Replay.

Transcript phải có khả năng liên kết với vị trí thời gian tương ứng trong Audio.

Schema chính xác của timestamp Transcript:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả JSON schema chi tiết cho timestamp của Transcript.

---

## 2.4. Layer 3 — Timeline

Timeline là lớp điều phối vị trí Replay theo thời gian.

Timeline cho phép người dùng di chuyển đến một vị trí cụ thể của phiên Debate và từ đó:

1. xác định vị trí Audio tương ứng;
2. xác định đoạn Transcript tương ứng;
3. hiển thị các thông tin phân tích AI liên quan đến vị trí đó nếu có.

Timeline cũng là lớp hiển thị các marker hoặc vùng đánh dấu liên quan đến kết quả phân tích.

Cách biểu diễn UI cụ thể của Timeline:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả UI Timeline markers, marker interaction, visual representation và behavior chi tiết.

---

## 2.5. Layer 4 — AI Analysis JSON

AI Analysis JSON chứa các kết quả phân tích đã được tạo trong phiên Debate.

Replay Engine đọc dữ liệu phân tích này để hiển thị lại các kết quả đã có.

Các dữ liệu phân tích được Blueprint đề cập trong phạm vi Replay bao gồm:

- Logic Coach data;
- Voice Coach data;
- Logic errors;
- WPM anomalies.

Replay Engine không được coi AI Analysis JSON là dữ liệu đầu vào để chạy lại AI.

AI Analysis JSON là **static analysis data** tại thời điểm Replay.

---

# 3. Replay Data Relationship

## 3.1. Conceptual Relationship

Replay Engine phải duy trì quan hệ logic:

    Audio
      ↕
    Transcript
      ↕
    Timeline
      ↕
    AI Analysis JSON

Mục tiêu là khi người dùng chọn một vị trí trên Timeline, hệ thống có thể xác định dữ liệu Replay tương ứng.

Ví dụ ở mức hành vi:

    User selects Timeline position
            ↓
    Resolve corresponding Audio position
            ↓
    Resolve corresponding Transcript segment
            ↓
    Resolve existing AI Analysis markers
            ↓
    Display Replay state

Đây chỉ là mô hình hành vi ở mức Replay Engine.

Các thuật toán mapping, schema và implementation detail chưa được Blueprint đặc tả thì không được tự suy diễn.

---

## 3.2. Timestamp Synchronization

Timestamp là cơ chế quan trọng để đồng bộ:

- Audio;
- Transcript;
- Timeline;
- AI Analysis.

Replay Engine phải dựa trên dữ liệu timestamp đã tồn tại thay vì thực hiện phân tích lại để suy ra timestamp mới.

Schema cụ thể:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả JSON schema chuẩn cho việc đồng bộ timestamp giữa Audio, Transcript, Timeline và AI Analysis JSON.

---

# 4. No-LLM Strict Rule

## 4.1. Principle

**Replay MUST NOT call an LLM.**

Khi người dùng mở hoặc xem lại một Debate, Replay Engine **CHỈ ĐỌC DỮ LIỆU TĨNH ĐÃ ĐƯỢC PHÂN TÍCH VÀ LƯU TRỮ TỪ TRƯỚC**.

Replay không được biến thành một phiên AI analysis mới.

---

## 4.2. Forbidden Replay Behavior

Trong quá trình Replay, hệ thống tuyệt đối không được:

- gọi lại LLM API;
- chạy lại Logic Coach;
- chạy lại Voice Coach;
- tạo lại AI Analysis JSON;
- yêu cầu AI phân tích lại Transcript;
- yêu cầu AI phân tích lại Audio;
- thực hiện inference mới chỉ vì người dùng mở Replay;
- tạo kết quả AI mới từ dữ liệu Replay.

Mọi kết quả AI được hiển thị trong Replay phải đến từ dữ liệu phân tích đã tồn tại.

---

## 4.3. Replay Processing Model

Replay phải hoạt động theo mô hình:

    Existing Debate Data
            ↓
    Load Stored Replay Data
            ↓
    Read Static Analysis JSON
            ↓
    Synchronize Audio / Transcript / Timeline
            ↓
    Render Replay UI

Không được có:

    Replay
       ↓
    LLM API
       ↓
    Re-run AI Coach
       ↓
    New Analysis

Đây là quy tắc kiến trúc bắt buộc của Replay Engine.

---

## 4.4. Deterministic Replay

Cùng một bộ dữ liệu Replay đã lưu phải cho phép hệ thống hiển thị lại cùng một kết quả phân tích.

Replay là hoạt động **read-only đối với AI analysis result**.

Việc cập nhật hoặc tạo mới AI Analysis không thuộc phạm vi của Replay Engine.

---

# 5. Core Replay Features

## 5.1. Sync Audio & Transcript

Replay Engine phải hỗ trợ đồng bộ Audio và Transcript.

Khi người dùng chọn một vị trí hoặc đoạn trên Timeline:

    Timeline selection
            ↓
    Corresponding Audio position
            +
    Corresponding Transcript segment

Mục tiêu:

- người dùng có thể nghe đúng đoạn Audio;
- Transcript hiển thị đúng nội dung tương ứng;
- Replay position và Transcript position được đồng bộ.

### Required Behavior

    Click Timeline
        ↓
    Seek Audio
        ↓
    Resolve Transcript segment
        ↓
    Display synchronized Transcript

Schema và cơ chế đồng bộ timestamp chi tiết:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả schema và thuật toán synchronization cụ thể.

---

## 5.2. Logic Error Highlighting

Replay phải có khả năng hiển thị các lỗi logic đã được Logic Coach phát hiện trong phiên Debate.

Nguồn dữ liệu:

    AI Analysis JSON
        ↓
    Logic Coach data
        ↓
    Replay highlighting

Replay chỉ hiển thị kết quả Logic Coach đã được lưu.

Replay không chạy lại Logic Coach.

Các lỗi logic có thể được liên kết với Timeline/Transcript tương ứng nếu dữ liệu phân tích đã cung cấp mapping cần thiết.

Cơ chế biểu diễn UI cụ thể:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chi tiết UI presentation, marker style, interaction và navigation behavior của Logic Coach highlights trong Replay.

---

## 5.3. WPM Anomaly Highlighting

Replay phải có khả năng hiển thị các điểm WPM bất thường đã được Voice Coach xác định.

Nguồn dữ liệu:

    AI Analysis JSON
        ↓
    Voice Coach data
        ↓
    WPM anomaly markers
        ↓
    Replay Timeline / Transcript highlighting

Các điểm WPM bất thường phải được đọc từ dữ liệu Voice Coach đã lưu.

Replay không được chạy lại Voice Coach để tính WPM.

Cách xác định ngưỡng WPM anomaly:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả đầy đủ threshold, algorithm và schema chi tiết của WPM anomaly trong Replay.

---

# 6. Replay State

## 6.1. Stored Replay State

Replay State được hình thành từ dữ liệu đã lưu của Debate.

Các thành phần chính:

    Audio
    Transcript
    Timeline
    AI Analysis JSON

Replay State không được yêu cầu AI service để khởi tạo.

---

## 6.2. Read-Only Analysis

AI Analysis trong Replay được coi là immutable/read-only đối với Replay Engine.

Replay Engine không có trách nhiệm:

- sửa kết quả AI;
- tái phân tích;
- tái chấm điểm;
- tái chạy Coach;
- tạo phiên bản AI analysis mới.

Nếu hệ thống có cơ chế chỉnh sửa hoặc tái phân tích ở một feature khác:

    SPEC GAP: Blueprint v3.0.0 chưa xác định quan hệ giữa Replay Engine và bất kỳ cơ chế re-analysis nào ngoài phạm vi Replay.

---

# 7. Storage Tier Dependency

## 7.1. Replay Availability

Khả năng Replay phụ thuộc trực tiếp vào Storage Tier của dữ liệu Debate.

Replay yêu cầu dữ liệu cần thiết cho Replay vẫn còn khả dụng.

Đặc biệt, theo Blueprint Section 17:

- trong giai đoạn dữ liệu còn ở Storage Tier phù hợp, Replay có thể sử dụng Audio và Transcript;
- sau **180 ngày**, dữ liệu được chuyển sang **Cold Storage**;
- ở trạng thái Cold Storage chỉ còn:
  - Score;
  - Thinking DNA.

Do đó, sau khi dữ liệu đã chuyển sang Cold Storage theo quy định của Blueprint:

    Score
    Thinking DNA

vẫn còn khả dụng, nhưng:

    Audio
    Transcript

không còn khả dụng cho Replay.

---

## 7.2. Post-180-Day Replay Constraint

Sau 180 ngày:

    Debate
       ↓
    Cold Storage
       ↓
    Score + Thinking DNA
       ↓
    No Audio Replay
    No Transcript Replay

Vì Replay yêu cầu Audio + Transcript + Timeline + AI Analysis JSON nên Replay đầy đủ không thể được thực hiện nếu các dữ liệu cần thiết đã bị loại khỏi Storage Tier theo Section 17.

---

## 7.3. Storage-Aware Replay

Replay Engine phải tôn trọng Storage Tier hiện tại.

Replay không được:

- giả định Audio luôn tồn tại;
- giả định Transcript luôn tồn tại;
- tự khôi phục dữ liệu đã chuyển sang Cold Storage;
- gọi LLM để tái tạo Transcript;
- gọi AI Coach để tái tạo Analysis.

Nếu dữ liệu Replay không còn khả dụng do Storage Tier policy:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả chi tiết UI/UX behavior khi người dùng yêu cầu Replay đối với Debate đã chuyển sang Cold Storage.

---

# 8. Replay Data Integrity

Replay Engine phụ thuộc vào tính toàn vẹn của bốn lớp dữ liệu.

## 8.1. Required Data Set

Mô hình Replay:

    Audio
    +
    Transcript
    +
    Timeline
    +
    AI Analysis JSON

Các thành phần phải có quan hệ nhất quán để Replay có thể hoạt động chính xác.

---

## 8.2. Missing Data

Nếu một lớp dữ liệu cần thiết cho Replay không tồn tại, Replay behavior phải tuân theo dữ liệu và policy được Blueprint quy định.

Không được tự bổ sung cơ chế fallback bằng LLM.

Ví dụ:

    Missing Audio
        ≠
    Call LLM to recreate Audio

    Missing Transcript
        ≠
    Call LLM to regenerate Transcript

    Missing AI Analysis
        ≠
    Re-run AI Coach

Chi tiết fallback behavior:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả đầy đủ behavior khi từng thành phần Replay Data bị thiếu, hỏng hoặc không đồng bộ.

---

# 9. Explicit Replay Spec Gaps

Các nội dung dưới đây được xác định là **SPEC GAP** nếu Blueprint v3.0.0 không cung cấp đặc tả chi tiết tương ứng.

## 9.1. Replay Data Schema

    SPEC GAP: JSON schema đầy đủ của Replay Data Object chưa được đặc tả chi tiết.

## 9.2. Audio–Transcript Timestamp Mapping

    SPEC GAP: JSON schema và quy tắc mapping timestamp chính xác giữa Audio và Transcript chưa được đặc tả.

## 9.3. Timeline Marker Schema

    SPEC GAP: Schema của Timeline marker chưa được đặc tả chi tiết.

## 9.4. Logic Coach Marker Schema

    SPEC GAP: Schema chi tiết để liên kết Logic Coach error với timestamp, Transcript segment và Timeline marker chưa được đặc tả.

## 9.5. Voice Coach / WPM Marker Schema

    SPEC GAP: Schema chi tiết để biểu diễn WPM anomaly và liên kết với Timeline/Transcript chưa được đặc tả.

## 9.6. Timeline UI

    SPEC GAP: UI Timeline markers, marker visual states, hover behavior, click behavior và navigation behavior chưa được đặc tả chi tiết.

## 9.7. Audio Streaming

    SPEC GAP: Cơ chế streaming Audio Opus trên client chưa được Blueprint đặc tả chi tiết.

## 9.8. Audio Buffering

    SPEC GAP: Cơ chế client-side buffering, preloading và buffer recovery cho Audio Replay chưa được đặc tả.

## 9.9. Audio Seeking

    SPEC GAP: Quy tắc seeking chính xác đối với Audio Replay và cách xử lý seek tới timestamp bất kỳ chưa được đặc tả.

## 9.10. Transcript Rendering

    SPEC GAP: Cách render Transcript theo từng segment, word-level timestamp hoặc sentence-level timestamp chưa được đặc tả.

## 9.11. Missing Replay Data

    SPEC GAP: Behavior/UI khi Audio, Transcript, Timeline hoặc AI Analysis JSON bị thiếu, hỏng hoặc không đồng bộ chưa được đặc tả.

## 9.12. Cold Storage Replay UX

    SPEC GAP: UI/UX cụ thể khi người dùng mở một Debate đã chuyển sang Cold Storage và không còn Audio/Transcript chưa được đặc tả.

## 9.13. Replay Loading State

    SPEC GAP: Loading state, error state và retry behavior khi tải Replay Data chưa được đặc tả.

## 9.14. Replay Performance

    SPEC GAP: Performance requirements, latency target và resource limits của Replay Engine chưa được đặc tả.

---

# 10. Security & API Boundary

Replay Engine phải duy trì nguyên tắc:

    Replay = Read Existing Data

Replay không được tạo ra một API boundary mới để gọi LLM.

Nếu hệ thống có API endpoint riêng cho Replay:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả API contract chi tiết cho Replay Engine.

Nếu có quyền truy cập Replay:

    SPEC GAP: Blueprint v3.0.0 chưa đặc tả authorization rule chi tiết cho Replay Data.

Không được tự suy diễn thêm authentication, authorization hoặc access-control logic ngoài Blueprint.

---

# 11. Implementation Constraints

## 11.1. Mandatory Constraints

Implementation của Replay Engine phải:

1. Đọc dữ liệu Replay đã tồn tại.
2. Đồng bộ Audio và Transcript.
3. Sử dụng Timeline để điều hướng Replay.
4. Hiển thị Logic Coach errors đã được lưu.
5. Hiển thị WPM anomalies đã được lưu.
6. Tuân thủ Storage Tier policy.
7. Không gọi lại LLM.
8. Không chạy lại AI Coaches.
9. Không tái tạo AI Analysis trong quá trình Replay.

---

## 11.2. Forbidden Extensions

Không được tự ý bổ sung:

- AI re-analysis trong Replay;
- conversational AI trong Replay;
- AI-generated explanation mới;
- AI-generated summary mới;
- AI-generated correction mới;
- AI Coach execution mới;
- automatic re-scoring;
- bất kỳ feature nào không được Blueprint v3.0.0 quy định.

Nếu một feature cần thiết nhưng Blueprint chưa quy định:

    SPEC GAP: [Mô tả chính xác nội dung còn thiếu]

---

# 12. Compliance Checklist

| ID | Requirement | Status |
|---|---|---|
| RPL-001 | Replay Engine dẫn chiếu Section 15 | COMPLIANT |
| RPL-002 | Replay sử dụng Audio | COMPLIANT |
| RPL-003 | Replay sử dụng Transcript | COMPLIANT |
| RPL-004 | Replay sử dụng Timeline | COMPLIANT |
| RPL-005 | Replay sử dụng AI Analysis JSON | COMPLIANT |
| RPL-006 | Audio và Transcript được đồng bộ trong Replay | COMPLIANT |
| RPL-007 | Timeline cho phép điều hướng tới đoạn Replay tương ứng | COMPLIANT |
| RPL-008 | Logic Coach errors được highlight | COMPLIANT |
| RPL-009 | Voice Coach WPM anomalies được highlight | COMPLIANT |
| RPL-010 | Replay chỉ đọc static analysis data | COMPLIANT |
| RPL-011 | Replay không gọi lại LLM | COMPLIANT |
| RPL-012 | Replay không chạy lại Logic Coach | COMPLIANT |
| RPL-013 | Replay không chạy lại Voice Coach | COMPLIANT |
| RPL-014 | Replay tuân thủ Storage Tier dependency | COMPLIANT |
| RPL-015 | Sau 180 ngày Cold Storage chỉ giữ Score + Thinking DNA theo Section 17 | COMPLIANT |
| RPL-016 | Không Replay Audio/Transcript sau khi dữ liệu đã chuyển sang Cold Storage | COMPLIANT |
| RPL-017 | Timestamp synchronization schema | SPEC GAP |
| RPL-018 | Timeline marker UI | SPEC GAP |
| RPL-019 | Audio Opus streaming | SPEC GAP |
| RPL-020 | Client-side audio buffering | SPEC GAP |
| RPL-021 | Replay Data JSON schema chi tiết | SPEC GAP |
| RPL-022 | Missing-data behavior | SPEC GAP |
| RPL-023 | Cold Storage Replay UX | SPEC GAP |
| RPL-024 | Replay API contract | SPEC GAP |
| RPL-025 | Replay loading/error/retry behavior | SPEC GAP |

---

# 13. Blueprint Compliance Rules

Tài liệu này phải được triển khai theo các nguyên tắc sau:

### Rule 1 — Blueprint First

Blueprint v3.0.0 là Source of Truth duy nhất.

### Rule 2 — No Spec Invention

Không được tự suy diễn behavior, schema, API, algorithm hoặc UI detail mà Blueprint chưa đặc tả.

### Rule 3 — Explicit Spec Gap

Mọi nội dung chưa được Blueprint quy định chi tiết phải được ghi rõ:

    SPEC GAP: [Nội dung thiếu]

### Rule 4 — No-LLM Replay

Replay tuyệt đối không được gọi LLM hoặc chạy lại AI Coaches.

### Rule 5 — Static Analysis Only

AI Analysis trong Replay phải được đọc từ dữ liệu đã lưu.

### Rule 6 — Storage Tier Compliance

Replay phải tuân thủ Storage Tier policy tại Section 17.

### Rule 7 — No Post-Cold-Storage Replay Assumption

Không được giả định rằng Audio và Transcript vẫn tồn tại sau khi Debate chuyển sang Cold Storage.

---

# 14. Document Status

**Document:** 09_REPLAY_SPEC.md

**Project:** AI Debate Master — Thinking OS

**Blueprint Version:** 3.0.0

**Blueprint Section:** Section 15 — Debate Replay Engine

**Related Blueprint Section:** Section 17 — Storage Tier / Data Retention

**Status:** SPECIFICATION — BLUEPRINT ALIGNED

**Implementation Status:** NOT IMPLEMENTED BY THIS DOCUMENT

**Source of Truth:** ai-debate-master-blueprint-v3.pdf

**Compliance Principle:** Blueprint v3.0.0 is authoritative.

**Critical Architectural Rule:** Replay is a static-data playback and visualization mechanism. It MUST NOT invoke an LLM or re-run AI Coaches.

**Known Specification Gaps:** Timestamp synchronization schema, Timeline marker schema/UI, Audio Opus streaming and buffering, Replay Data schema, missing-data behavior, Cold Storage Replay UX, API contract and other implementation details explicitly identified above remain SPEC GAP until defined by the authoritative Blueprint or an explicitly approved specification amendment.