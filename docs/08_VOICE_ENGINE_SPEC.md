# 08. Voice Engine Specification

**Project:** AI Debate Master — Thinking OS  
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf` — Version 3.0.0  
**Blueprint Reference:** Section 14 — Voice Analysis Engine  
**Related Blueprint Sections:** Section 06 / Section 17 — Audio Requirements  
**Document Status:** Specification derived strictly from Blueprint v3.0.0

---

## 1. Document Purpose & Scope

Tài liệu này đặc tả các yêu cầu đối với **Voice Analysis Engine** của hệ thống AI Debate Master — Thinking OS.

Phạm vi của tài liệu tập trung vào các yêu cầu được Blueprint v3.0.0 quy định đối với:

- Phân tích tốc độ nói.
- Speech Rate / WPM.
- Phát hiện filler words.
- Real-time voice feedback.
- Quy tắc không ngắt lời người học.
- Audio input requirements.
- Quan hệ giữa Voice Analysis Engine và Style Scoring.
- Các điểm chưa được Blueprint đặc tả đủ để triển khai chi tiết.

Tài liệu này đối chiếu trực tiếp với **Section 14 — Voice Analysis Engine** của Blueprint v3.0.0.

Không có logic xử lý mới nào được tự ý bổ sung ngoài phạm vi Blueprint.

Các nội dung Blueprint chưa đặc tả đủ được đánh dấu rõ:

    SPEC GAP: [Nội dung thiếu]

---

# 2. Voice Analysis Engine Responsibilities

Voice Analysis Engine chịu trách nhiệm phân tích các đặc trưng giọng nói có liên quan đến chất lượng trình bày của người học.

Các chỉ số được Blueprint đề cập bao gồm:

- WPM — Words Per Minute.
- Fluency.
- Rhythm.
- Pauses.
- Filler Words.
- Các đặc trưng audio / voice liên quan đến khả năng truyền tải.

Các kết quả phân tích Voice được sử dụng làm nguồn dữ liệu cho **Style Score** trong Scoring Engine.

Quan hệ kiến trúc:

    Audio Input
        ↓
    Voice Analysis Engine
        ↓
    Voice Metrics
        ├── WPM
        ├── Fluency
        ├── Rhythm
        ├── Pauses
        └── Filler Words
        ↓
    Style Evaluation
        ↓
    Style Score (40%)

SPEC GAP: Blueprint chưa đặc tả đầy đủ schema output chuẩn hóa của Voice Analysis Engine dành cho Scoring Engine.

---

# 3. Speech Rate (WPM) Specification

## 3.1. Definition

WPM là **Words Per Minute**, dùng để biểu thị tốc độ nói của người học.

Voice Analysis Engine phải có khả năng xác định tốc độ nói từ audio / speech transcript để phục vụ:

- Phân tích giọng nói.
- Real-time feedback.
- Style evaluation.
- Scoring.

---

## 3.2. WPM Thresholds

Blueprint v3.0.0 quy định các ngưỡng chính:

| WPM | Classification | Interpretation |
|---:|---|---|
| < 100 | Too Slow | Quá chậm |
| 100–119 | Below Optimal Range | Không nằm trong vùng tối ưu |
| 120–150 | Optimal Range | Vùng tốc độ tối ưu |
| 151–170 | Above Optimal Range | Nhanh hơn vùng tối ưu |
| > 170 | Too Fast | Quá nhanh |

### 3.2.1. Too Slow

Điều kiện:

    WPM < 100

Phân loại:

    Too Slow / Quá chậm

Voice Analysis Engine phải nhận diện trạng thái này để phục vụ hệ thống feedback.

SPEC GAP: Blueprint chưa đặc tả chính xác feedback message hoặc UI representation tương ứng với trạng thái Too Slow.

---

### 3.2.2. Optimal Range

Điều kiện:

    120 <= WPM <= 150

Phân loại:

    Optimal Range / Vùng tốc độ tối ưu

Đây là vùng tốc độ nói được Blueprint xác định là tối ưu.

SPEC GAP: Blueprint chưa đặc tả liệu việc nằm trong vùng tối ưu có tạo ra một feedback event cụ thể hay chỉ được sử dụng như một trạng thái phân tích.

---

### 3.2.3. Too Fast

Điều kiện:

    WPM > 170

Phân loại:

    Too Fast / Quá nhanh

Blueprint sử dụng lỗi / cảnh báo:

    "Máy xay gió"

Đây là tín hiệu cho thấy người học đang nói quá nhanh.

Voice Analysis Engine phải phát hiện trạng thái này để phục vụ real-time feedback.

SPEC GAP: Blueprint chưa đặc tả chính xác nội dung payload hoặc message được gửi khi trạng thái "Máy xay gió" được kích hoạt.

---

## 3.3. WPM and Real-Time Feedback

Blueprint yêu cầu Voice Analysis Engine hỗ trợ phát hiện tốc độ nói theo thời gian thực.

Khi tốc độ nói vượt ngưỡng được Blueprint quy định, hệ thống có thể cung cấp tín hiệu phản hồi động.

Đặc biệt:

    WPM > 170
        ↓
    "Máy xay gió"
        ↓
    Dynamic feedback signal

Tín hiệu này không được phép biến thành lời nói hoặc hành động làm gián đoạn người học.

Quy tắc UX chi tiết được quy định tại Section 5 của tài liệu này.

---

# 4. Filler Words Specification

## 4.1. Definition

Filler Words là các từ đệm được sử dụng trong quá trình nói.

Blueprint đưa ra các ví dụ:

- "ờ"
- "ừm"
- "à"
- "thì là"

Voice Analysis Engine phải có khả năng phát hiện filler words trong speech stream để phục vụ đánh giá Style.

---

## 4.2. Filler Words Threshold

Blueprint quy định ngưỡng:

    > 3 filler words / minute

Khi tần suất filler words vượt quá **3 từ đệm trong 1 phút phát biểu**, điều này sẽ ảnh hưởng đến **Style Score**.

Có thể biểu diễn điều kiện:

    FillerWordsPerMinute > 3

    → Style is affected

Quy tắc này phải được giữ nguyên.

---

## 4.3. Filler Words and Style Scoring

Filler words thuộc nhóm chỉ số Style.

Quan hệ:

    Voice Analysis Engine
        ↓
    Filler Words Detection
        ↓
    Filler Words / Minute
        ↓
    Threshold Check
        ↓
    Style Evaluation
        ↓
    Style Score

Blueprint xác định rằng vượt ngưỡng 3 filler words/phút sẽ ảnh hưởng đến điểm Style.

SPEC GAP: Blueprint chưa đặc tả mức điểm Style bị trừ khi vượt ngưỡng.

SPEC GAP: Blueprint chưa đặc tả việc mức phạt có tăng tuyến tính theo số filler words hay không.

SPEC GAP: Blueprint chưa đặc tả cách xử lý nhiều đoạn speech có thời lượng khác nhau khi tính filler words / minute.

Không được tự suy diễn các quy tắc trên.

---

# 5. Non-Interruption & Real-Time Feedback Rule

## 5.1. Core UX Rule

Đây là một quy tắc UX cốt lõi của Voice Analysis Engine:

    AI KHÔNG ĐƯỢC NGẮT LỜI HỌC SINH TRONG LÚC NÓI.

Voice Analysis Engine phải phân tích speech trong khi người học đang phát biểu mà không làm gián đoạn luồng nói.

---

## 5.2. Dynamic Feedback

Trong lúc người học đang nói, hệ thống chỉ được phép cung cấp:

    Dynamic Feedback Signal

dưới dạng tín hiệu phản hồi động tại góc màn hình.

Ví dụ về trạng thái có thể được phản ánh:

- Nói quá nhanh.
- Các trạng thái voice-related được hệ thống nhận diện.

Mục đích của tín hiệu là giúp người học nhận biết trạng thái của mình trong khi vẫn tiếp tục phát biểu.

---

## 5.3. No Voice Interruption

Voice Analysis Engine không được sử dụng phản hồi bằng giọng nói để chen vào speech stream của người học nếu hành động đó làm người học bị ngắt lời.

Không được biến cảnh báo real-time thành một đoạn hội thoại chen ngang bài nói.

Quy tắc ưu tiên:

    User Speech Continuity
        >
    Real-Time Feedback

---

## 5.4. UI Feedback Location

Blueprint yêu cầu tín hiệu phản hồi động được hiển thị:

    Góc màn hình

Tín hiệu này không được làm gián đoạn quá trình phát biểu.

SPEC GAP: Blueprint chưa đặc tả:

- Vị trí góc màn hình cụ thể.
- Kích thước.
- Màu sắc.
- Icon.
- Animation.
- Thời lượng hiển thị.
- Các trạng thái UI cụ thể.
- Accessibility behavior.

Không được tự ý chuẩn hóa các thuộc tính trên trong Voice Engine Specification.

---

# 6. Audio Requirements

## 6.1. Audio Codec / Bitrate

Theo yêu cầu Audio được dẫn chiếu từ Blueprint Section 06 / Section 17:

    Audio Opus 24 kbps

Voice Analysis Engine phải tương thích với yêu cầu audio này.

Quan hệ:

    Microphone
        ↓
    Audio Capture
        ↓
    Opus 24 kbps
        ↓
    Voice Analysis Engine

---

## 6.2. Cross-Section Consistency

Yêu cầu Audio Opus 24 kbps phải được giữ nhất quán với các đặc tả Audio / API / transport liên quan trong Blueprint.

Tài liệu này không thay đổi hoặc mở rộng yêu cầu codec / bitrate đã được Blueprint xác định.

SPEC GAP: Blueprint chưa đặc tả đầy đủ các tham số codec Opus khác ngoài yêu cầu 24 kbps nếu có.

---

## 6.3. Audio Processing Requirements

Voice Analysis Engine cần nhận audio phù hợp với pipeline audio của hệ thống để thực hiện:

- Speech rate analysis.
- Filler words detection.
- Fluency analysis.
- Rhythm analysis.
- Pause analysis.
- Các phân tích voice khác được Blueprint quy định.

SPEC GAP: Blueprint chưa đặc tả chi tiết audio preprocessing pipeline trước Voice Analysis Engine.

---

# 7. Voice Metrics

Voice Analysis Engine có phạm vi phân tích các nhóm chỉ số sau:

| Metric | Purpose | Blueprint Status |
|---|---|---|
| WPM | Đánh giá tốc độ nói | Defined |
| Fluency | Đánh giá độ trôi chảy | Defined at conceptual level |
| Rhythm | Đánh giá nhịp điệu | Defined at conceptual level |
| Pauses | Đánh giá khoảng ngắt nghỉ | Defined at conceptual level |
| Filler Words | Phát hiện từ đệm | Threshold defined |
| Audio characteristics | Phân tích đặc trưng giọng nói | Defined at conceptual level |

Trong đó WPM và Filler Words có các ngưỡng / điều kiện được Blueprint xác định rõ hơn.

Các metric còn lại cần được triển khai theo Blueprint khi có đặc tả đầy đủ.

---

# 8. Voice Engine → Style Score Dependency

Voice Analysis Engine là nguồn dữ liệu chính cho **Style Score**.

Style chiếm:

    40% tổng Score

Công thức tổng điểm của Scoring Engine:

    Score = (Content × 0.40)
          + (Style × 0.40)
          + (Strategy × 0.20)

Voice Engine không trực tiếp thay đổi trọng số Style.

Voice Engine chỉ cung cấp các kết quả phân tích cần thiết cho Style evaluation.

Luồng dữ liệu:

    Audio
        ↓
    Voice Analysis Engine
        ↓
    WPM / Fluency / Rhythm / Pauses / Filler Words
        ↓
    Style Evaluation
        ↓
    Style Score
        ↓
    Final Score

SPEC GAP: Blueprint chưa quy định công thức chi tiết để aggregate Voice Metrics thành Style Score.

---

# 9. Real-Time Processing Model

Ở mức kiến trúc, Voice Analysis Engine phải hỗ trợ quá trình:

    Audio Stream
        ↓
    Continuous Voice Analysis
        ↓
    Real-Time Metric Detection
        ↓
    Dynamic Feedback Signal

Trong quá trình này:

- Speech của người học phải tiếp tục được duy trì.
- AI không được ngắt lời.
- Feedback được thể hiện bằng tín hiệu động trên giao diện.

SPEC GAP: Blueprint chưa đặc tả:

- Processing window.
- Sampling interval.
- Latency target.
- Detection window.
- Debounce / hysteresis logic.
- Event frequency.
- Điều kiện reset trạng thái cảnh báo.

Không được tự suy diễn các giá trị trên.

---

# 10. Explicit Voice Engine Specification Gaps

## 10.1. WPM Calculation Formula

SPEC GAP: Blueprint chưa quy định chính xác công thức tính WPM.

Chưa xác định rõ:

- Tính theo mili-giây hay giây.
- Khoảng thời gian tối thiểu để tính WPM.
- Cách xác định bắt đầu / kết thúc một speech segment.
- Cách xử lý khoảng lặng.
- Cách xử lý speech overlap.
- Cách tính khi speech duration rất ngắn.

Không được tự chọn một công thức implementation.

---

## 10.2. Word Counting Method

SPEC GAP: Blueprint chưa đặc tả chính xác cách xác định một "word" để tính WPM.

Chưa xác định:

- Dùng transcript token.
- Dùng ASR word timestamp.
- Dùng phương pháp khác.

---

## 10.3. Standard Filler Words Dictionary

SPEC GAP: Blueprint chỉ đưa ra các ví dụ filler words nhưng chưa cung cấp danh sách chuẩn đầy đủ.

Ví dụ được Blueprint nêu:

    "ờ"
    "ừm"
    "à"
    "thì là"

Chưa xác định:

- Danh sách filler words đầy đủ.
- Các biến thể chính tả.
- Các filler words theo ngữ cảnh.
- Cách xử lý filler words không có trong dictionary.
- Dictionary có configurable hay không.

---

## 10.4. Filler Word Detection

SPEC GAP: Blueprint chưa đặc tả phương pháp xác định filler word.

Chưa xác định rõ:

- ASR-based detection.
- NLP-based detection.
- Audio-based detection.
- Hybrid detection.

---

## 10.5. Dynamic Feedback WebSocket Payload

Blueprint yêu cầu tín hiệu phản hồi động trong real time nhưng chưa đặc tả JSON payload truyền qua WebSocket.

SPEC GAP: Chưa có schema chính thức cho:

    Dynamic Feedback WebSocket Payload

Chưa xác định:

- Event name.
- Event type.
- Timestamp format.
- Metric field.
- Current value.
- Threshold.
- Severity.
- Message.
- UI state.
- Session identifier.
- Debater identifier.

Không được tự tạo JSON contract trong tài liệu này.

---

## 10.6. Real-Time Feedback Latency

SPEC GAP: Blueprint chưa quy định latency tối đa từ thời điểm phát hiện trạng thái voice đến thời điểm hiển thị tín hiệu động.

---

## 10.7. Background Noise

SPEC GAP: Blueprint chưa đặc tả cách xử lý:

- Tiếng ồn nền.
- Tiếng người khác.
- Tiếng vọng.
- Microphone noise.
- Environmental noise.
- Các trường hợp audio quality thấp.

Không được tự ý thêm noise reduction algorithm.

---

## 10.8. Audio Preprocessing

SPEC GAP: Blueprint chưa quy định đầy đủ:

- Noise suppression.
- Echo cancellation.
- Automatic gain control.
- Voice activity detection.
- Audio normalization.
- Filtering.

---

## 10.9. Voice Activity Detection

SPEC GAP: Blueprint chưa đặc tả chính xác cách xác định:

- Khi nào người học bắt đầu nói.
- Khi nào người học kết thúc nói.
- Khi nào pause là một phần của speech.
- Khi nào silence được loại khỏi WPM calculation.

---

## 10.10. Pause Calculation

SPEC GAP: Blueprint đề cập đến Pauses nhưng chưa quy định:

- Ngưỡng pause.
- Đơn vị đo.
- Cách tính pause duration.
- Khoảng pause tốt / xấu.
- Cách mapping pause metric thành Style Score.

---

## 10.11. Rhythm Calculation

SPEC GAP: Blueprint chưa cung cấp công thức định lượng Rhythm.

---

## 10.12. Fluency Calculation

SPEC GAP: Blueprint chưa cung cấp công thức định lượng Fluency.

---

## 10.13. Style Score Mapping

SPEC GAP: Blueprint chưa quy định công thức:

    Voice Metrics → Style Score

Đặc biệt chưa có trọng số riêng cho:

- WPM
- Fluency
- Rhythm
- Pauses
- Filler Words

---

## 10.14. Filler Words Score Deduction

SPEC GAP: Blueprint xác định:

    > 3 filler words / minute
        → ảnh hưởng Style Score

nhưng chưa xác định mức trừ cụ thể.

---

## 10.15. Consecutive Alerts

SPEC GAP: Blueprint chưa quy định cách xử lý khi trạng thái cảnh báo xảy ra liên tục.

Ví dụ:

    WPM > 170
        ↓
    Feedback
        ↓
    WPM > 170
        ↓
    Feedback

Chưa có quy tắc về event frequency hoặc suppression.

---

## 10.16. Multi-Speaker Handling

SPEC GAP: Blueprint chưa đặc tả đầy đủ cách Voice Engine xử lý audio khi có nhiều người cùng xuất hiện trong microphone stream.

---

# 11. Non-Invention Rules

Implementation của Voice Analysis Engine phải tuân thủ các nguyên tắc sau:

1. Không thay đổi các ngưỡng WPM đã được Blueprint quy định.

2. Không thay đổi vùng tối ưu:

       120–150 WPM

3. Không thay đổi điều kiện quá chậm:

       < 100 WPM

4. Không thay đổi điều kiện quá nhanh:

       > 170 WPM

5. Không thay đổi cảnh báo:

       "Máy xay gió"

6. Không thay đổi ngưỡng filler words:

       > 3 filler words / minute

7. Không tự đặt mức trừ Style khi filler words vượt ngưỡng.

8. Không để AI ngắt lời người học trong quá trình phát biểu.

9. Real-time feedback chỉ được thể hiện dưới dạng tín hiệu động tại góc màn hình theo yêu cầu Blueprint.

10. Không tự tạo WebSocket payload schema nếu Blueprint chưa quy định.

11. Không tự đặt latency target.

12. Không tự đặt noise reduction pipeline.

13. Không tự đặt công thức WPM chi tiết.

14. Không tự đặt công thức Fluency / Rhythm / Pauses.

15. Không tự đặt công thức Voice Metrics → Style Score.

16. Các nội dung Blueprint chưa đặc tả phải được đánh dấu:

       SPEC GAP: [Nội dung thiếu]

---

# 12. Compliance Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | Dẫn chiếu Section 14 — Voice Analysis Engine | COMPLIANT |
| 2 | WPM < 100 = Quá chậm | COMPLIANT |
| 3 | WPM 120–150 = Vùng tối ưu | COMPLIANT |
| 4 | WPM > 170 = Quá nhanh | COMPLIANT |
| 5 | Cảnh báo "Máy xay gió" | COMPLIANT |
| 6 | Filler Words > 3/phút ảnh hưởng Style | COMPLIANT |
| 7 | AI không được ngắt lời học sinh | COMPLIANT |
| 8 | Real-time feedback là tín hiệu động | COMPLIANT |
| 9 | Dynamic feedback hiển thị ở góc màn hình | COMPLIANT |
| 10 | Audio Opus 24 kbps | COMPLIANT |
| 11 | Voice Engine cung cấp dữ liệu cho Style | COMPLIANT |
| 12 | Không tự đặt công thức WPM | COMPLIANT |
| 13 | Không tự đặt danh sách filler words đầy đủ | COMPLIANT |
| 14 | Không tự tạo WebSocket payload | COMPLIANT |
| 15 | Không tự suy diễn noise handling | COMPLIANT |
| 16 | Không tự suy diễn Style scoring formula | COMPLIANT |
| 17 | Các điểm chưa đặc tả được đánh dấu SPEC GAP | COMPLIANT |

---

# 13. Document Status

**Status:** Blueprint-Aligned / Specification with Explicit Gaps

**Source of Truth:**

    ai-debate-master-blueprint-v3.pdf
    Version 3.0.0

**Primary Blueprint Reference:**

    Section 14 — Voice Analysis Engine

**Related References:**

    Section 06 / Section 17 — Audio Requirements

**Authoritative Voice Rules:**

    WPM < 100
        → Too Slow / Quá chậm

    120–150 WPM
        → Optimal Range / Vùng tốc độ tối ưu

    WPM > 170
        → Too Fast / "Máy xay gió"

    Filler Words > 3 / minute
        → ảnh hưởng Style Score

    Audio
        → Opus 24 kbps

    Real-Time Feedback
        → Dynamic Signal tại góc màn hình

    User Speech
        → MUST NOT be interrupted by AI

**Scoring Dependency:**

    Voice Analysis Engine
        → Style
        → 40% of Final Score

**Implementation Constraint:**

Mọi công thức, threshold, payload schema, processing rule hoặc behavior chưa được Blueprint v3.0.0 đặc tả rõ phải được đánh dấu **SPEC GAP** và không được tự suy diễn thành implementation requirement.

**End of 08_VOICE_ENGINE_SPEC.md**