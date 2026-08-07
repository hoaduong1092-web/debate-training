# 05. AI Coach Specification

**Project:** AI Debate Master — Thinking OS  
**Document:** `docs/05_AI_COACH_SPEC.md`  
**Blueprint Version:** 3.0.0  
**Document Version:** 1.0.0  
**Status:** Technical Specification  
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`

---

# 1. Document Purpose & Scope

## 1.1 Purpose

Tài liệu này đặc tả lớp **AI Coach** của hệ thống AI Debate Master — Thinking OS.

Thiết kế được dẫn chiếu trực tiếp từ:

- **Section 09 — AI Coach Framework:** định nghĩa 4 AI Coach độc lập và phạm vi phân tích chuyên biệt của từng Coach.
- **Section 06 — System Architecture:** định nghĩa kiến trúc Multi-Agent và **Multi-Agent Orchestrator** trung tâm để điều phối quá trình phân tích đa chiều.
- Các section liên quan của Blueprint v3.0.0 được tham chiếu khi cần để bảo đảm tính nhất quán, đặc biệt:
  - Section 07 — Database Design
  - Section 08 — API Specification
  - Section 10 — Prompt Engineering Standard
  - Section 13 — Scoring Engine
  - Section 14 — Voice Analysis Engine
  - Section 17 — Deployment Architecture
  - Section 19 — Testing Strategy

## 1.2 Scope

AI Coach Framework bao gồm đúng 4 Coach được Blueprint định nghĩa:

1. **Logic Coach**
2. **Voice Coach**
3. **Interaction Coach**
4. **Psychology Coach**

Các Coach thực hiện những phân tích chuyên biệt và độc lập, sau đó kết quả được điều phối bởi **Multi-Agent Orchestrator** trung tâm.

## 1.3 Scope Boundary

Tài liệu này không tự định nghĩa thêm:

- Coach thứ năm hoặc các Coach mới.
- Prompt template hoàn chỉnh cho từng Coach.
- LLM/model cụ thể cho từng Coach.
- IPC protocol cụ thể.
- Message broker cụ thể.
- JSON Schema hoàn chỉnh cho output của Orchestrator.
- Thuật toán chi tiết của Knowledge Graph.
- Thuật toán chi tiết phát hiện fallacy.
- Thuật toán chi tiết đánh giá tâm lý.
- Công thức scoring riêng ngoài các công thức đã được Blueprint quy định.
- Cơ chế triển khai cụ thể chưa được Blueprint đặc tả.

Những nội dung trên nếu cần thiết nhưng chưa được Blueprint v3.0.0 đặc tả sẽ được đánh dấu **SPEC GAP**.

---

# 2. Blueprint Alignment

## 2.1 Section 09 — AI Coach Framework

Blueprint định nghĩa hệ thống có **4 AI Coach độc lập chạy song song**, mỗi Coach đảm nhiệm một lĩnh vực phân tích chuyên biệt nhằm tạo ra nhận xét kiến tạo toàn diện.

| Coach | Lĩnh vực phân tích | Cơ chế xử lý được Blueprint mô tả |
|---|---|---|
| Logic Coach | Cấu trúc lập luận, ngụy biện, dẫn chứng, tính logic hệ thống | Chuyển âm thanh thành transcript, xây dựng Knowledge Graph của luận điểm để tìm mâu thuẫn ẩn và lỗ hổng tiền đề |
| Voice Coach | WPM, cao độ, nhịp thở, khoảng lặng, từ đệm | Xử lý trực tiếp tín hiệu âm thanh bằng Audio DSP, trích xuất đặc trưng giọng nói và đo khoảng lặng phi ngôn ngữ |
| Interaction Coach | Lắng nghe chủ động, bám sát trọng tâm đối thủ, thời điểm chất vấn POI | Phân tích giao thoa ngữ nghĩa giữa bài nói hai bên, đo mức độ tương tác trực tiếp hoặc né tránh câu hỏi |
| Psychology Coach | Bình tĩnh, linh hoạt tư duy, kiểm soát cảm xúc, tránh công kích | Sentiment Analysis và phân tích biến thiên âm tần để phát hiện nóng giận, lo lắng hoặc tự tin |

---

# 3. Multi-Agent Orchestrator Architecture

## 3.1 Architectural Role

Theo Section 06, hệ thống sử dụng một **Multi-Agent Orchestrator** trung tâm để điều phối các AI Coach trong kiến trúc Multi-Agent.

Orchestrator là lớp điều phối logic giữa dữ liệu phiên tranh luận và 4 Coach.

Blueprint xác định:

- Orchestrator trung tâm.
- 4 AI Coach độc lập.
- Các Coach chạy song song.
- Phân tích đa chiều dữ liệu đầu vào.
- Session Memory và Background Summarizer hỗ trợ việc cung cấp context hiệu quả cho AI.

Blueprint không đặc tả chi tiết implementation-level của Orchestrator.

## 3.2 Logical Interaction

```text
                         DEBATE SESSION
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Session Context    │
                    │                     │
                    │ • Topic             │
                    │ • Debate Context    │
                    │ • Transcript        │
                    │ • Audio             │
                    │ • Recent Turns      │
                    │ • Session Summary   │
                    └──────────┬──────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │  Multi-Agent            │
                  │  Orchestrator           │
                  │                         │
                  │  Central Coordination   │
                  └────────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ Logic Coach  │ │ Voice Coach  │ │ Interaction  │
      │              │ │              │ │ Coach        │
      └──────────────┘ └──────────────┘ └──────────────┘
              │                │                │
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                       ┌──────────────┐
                       │ Psychology   │
                       │ Coach        │
                       └──────┬───────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Coach Analysis      │
                    │ Results             │
                    └─────────────────────┘
                    Lưu ý: Sơ đồ trên mô tả quan hệ logic giữa Orchestrator và 4 Coach. Blueprint không đặc tả rằng Psychology Coach phải chạy sau ba Coach còn lại. Theo Section 09, 4 Coach là các tác nhân độc lập chạy song song. Vì vậy implementation phải coi 4 Coach là các nhánh phân tích độc lập.

## 3.3 Parallel Execution

Logical execution model:

Input Session
      │
      ▼
Multi-Agent Orchestrator
      │
      ├──────────────► Logic Coach
      │
      ├──────────────► Voice Coach
      │
      ├──────────────► Interaction Coach
      │
      └──────────────► Psychology Coach
                            │
                            ▼
                    Independent Results
                            │
                            ▼
                    Orchestrated Result

Các Coach không được hiểu là một chuỗi pipeline bắt buộc:

Logic → Voice → Interaction → Psychology

mà là các nhánh phân tích chuyên biệt được Orchestrator điều phối.

## 3.4 Orchestrator Responsibilities

Theo phạm vi Blueprint, Orchestrator chịu trách nhiệm logic ở mức khái niệm:

Nhận context của phiên tranh luận.
Điều phối dữ liệu tới các Coach phù hợp.
Kích hoạt 4 Coach độc lập.
Thu nhận kết quả phân tích từ các Coach.
Điều phối kết quả thành đầu ra phân tích tổng thể.

Chi tiết về:

retry;
timeout;
concurrency primitive;
queue;
event bus;
IPC;
serialization;
failure isolation;
result ordering;

chưa được Blueprint đặc tả.

SPEC GAP: Chưa có orchestration protocol chi tiết.
4. Session Context & Memory
4.1 Session Memory

Section 06 quy định cơ chế Session Memory nhằm giảm chi phí token khi phiên tranh luận kéo dài.

Thay vì gửi toàn bộ lịch sử thô tới LLM, hệ thống:

Duy trì các lượt tranh luận gần nhất.
Chạy Background Summarizer để nén các lượt trước đó.
Chuyển lịch sử trước thành các nút thông tin logic tinh gọn.
Cung cấp cho LLM:
5 lượt chat gần nhất.
Session Summary.

Blueprint đặt mục tiêu giảm tới 80% chi phí API trong cơ chế này.

4.2 Coach Context

AI Coach phải được hiểu là một phần của pipeline phân tích sử dụng context của phiên tranh luận.

Các thành phần context có thể liên quan gồm:

Debate Session
├── Topic
├── Debate Context
├── Recent Turns
├── Session Summary
├── Transcript
└── Audio / Audio Features

SPEC GAP: Blueprint không quy định schema chính thức của CoachContext.

5. Logic Coach Specification
5.1 Responsibility

Logic Coach chịu trách nhiệm phân tích:

cấu trúc lập luận;
ngụy biện;
chất lượng dẫn chứng;
tính logic hệ thống.
5.2 Processing Flow

Blueprint mô tả quy trình ở mức khái niệm:

Audio
  │
  ▼
Speech-to-Text
  │
  ▼
Transcript
  │
  ▼
Argument Analysis
  │
  ▼
Knowledge Graph
  │
  ├── Hidden Contradiction Detection
  │
  └── Premise Gap Detection
5.2.1 Speech-to-Text

Đối với đầu vào bằng giọng nói:

Audio
  ↓
Speech-to-Text
  ↓
Transcript

Section 17 của Blueprint quy định Speech-to-Text sử dụng Whisper-compatible API, với mục tiêu độ chính xác từ vựng và dấu câu tiếng Việt trên 95%.

5.2.2 Argument Structure

Logic Coach phân tích cấu trúc của luận điểm.

Section 04 và Section 13 của Blueprint xác định trọng tâm Content bao gồm cấu trúc luận điểm theo:

Claim
  ↓
Reason
  ↓
Evidence

Logic Coach phải cung cấp dữ liệu phục vụ việc đánh giá cấu trúc và logic của luận điểm.

5.2.3 Knowledge Graph

Blueprint yêu cầu Logic Coach:

xây dựng đồ thị tri thức (Knowledge Graph) của luận điểm.

Mục đích được Blueprint xác định là:

tìm kiếm mâu thuẫn ẩn;
tìm kiếm lỗ hổng tiền đề.

Logical representation:

Transcript
    │
    ▼
Claims / Reasons / Evidence
    │
    ▼
Knowledge Graph
    │
    ├── Relationships
    ├── Dependencies
    ├── Contradictions
    └── Missing Premises
5.2.4 Hidden Contradiction

Logic Coach phải sử dụng cấu trúc luận điểm được biểu diễn trong Knowledge Graph để hỗ trợ phát hiện các mâu thuẫn ẩn giữa các thành phần lập luận.

SPEC GAP: Blueprint chưa định nghĩa thuật toán hoặc tiêu chí formal để xác định một quan hệ là hidden contradiction.

5.2.5 Premise Gap

Logic Coach phải hỗ trợ phát hiện premise gap, tức các lỗ hổng trong tiền đề cần thiết để kết nối lập luận.

SPEC GAP: Blueprint chưa định nghĩa formal rule set hoặc scoring algorithm cho premise gap.


```markdown
# 6. Fallacy Analysis

## 6.1 Fallacies

Blueprint xác định Logic Coach có trách nhiệm phát hiện ngụy biện.

Section 13 quy định việc trừ điểm đối với một số lỗi ngụy biện logic, trong đó Blueprint nêu:

- Ad hominem.
- Strawman.

Blueprint quy định mức:

```text
Fallacy Deduction = -1.5 điểm / lỗi

đối với các lỗi được nêu trong Scoring Engine.

6.2 Database Representation

Section 07 định nghĩa trường:

debate_transcripts.fallacies_detected

với kiểu:

JSONB

Mục đích:

lưu mảng JSON các lỗi ngụy biện được phát hiện, bao gồm vị trí, loại lỗi và mô tả.

Logical representation:

{
  "fallacies_detected": [
    {
      "position": "...",
      "type": "...",
      "description": "..."
    }
  ]
}

Đây chỉ là representation ở mức minh họa theo mô tả Blueprint.

SPEC GAP: Blueprint chưa cung cấp JSON Schema chuẩn bắt buộc cho fallacies_detected.

7. Evidence Evaluation
7.1 Evidence Star

Blueprint định nghĩa trường:

evidence_star

trong debate_transcripts.

Kiểu dữ liệu:

INT

Phạm vi:

1–5
7.2 Evidence Evaluation Scale
Sao	Chất lượng dẫn chứng
5	Có nghiên cứu khoa học hoặc báo cáo uy tín như OECD, UNESCO
4	Có số liệu thống kê cụ thể từ tổ chức tin cậy
3	Có ví dụ thực tế cụ thể ngoài đời sống
2	Ý kiến suy đoán chủ quan cá nhân
1	Suy đoán vô căn cứ, không có tính thực tế

Logic Coach chịu trách nhiệm phân tích chất lượng dẫn chứng để cung cấp tín hiệu đánh giá này.

7.3 Relationship with Scoring Engine

Section 13 quy định:

Content = 40%
Style   = 40%
Strategy = 20%

Trong đó Content được đo qua cấu trúc Knowledge Graph và bị trừ điểm khi có lỗi ngụy biện.

Logic Coach do đó cung cấp các tín hiệu phân tích phục vụ Content Evaluation.

SPEC GAP: Blueprint chưa đặc tả chính xác cách evidence_star được chuyển đổi thành điểm Content.
8. Voice Coach Specification
8.1 Responsibility

Voice Coach chịu trách nhiệm phân tích:

tốc độ phát âm;
WPM;
cao độ giọng nói;
nhịp thở;
độ dài khoảng lặng;
từ đệm.
8.2 Audio DSP Pipeline

Blueprint mô tả Voice Coach xử lý trực tiếp luồng tín hiệu âm thanh bằng Audio DSP.

Logical flow:

Microphone
    │
    ▼
Audio Stream
    │
    ▼
Audio DSP
    │
    ├── Speech Rate / WPM
    ├── Pitch
    ├── Breathing
    ├── Non-verbal Pauses
    └── Filler Words
    │
    ▼
Voice Coach Analysis
8.3 WPM

Section 14 định nghĩa các ngưỡng tốc độ nói:

Trạng thái	WPM
Quá nhanh	> 170
Tối ưu	120–150
Quá chậm	< 100

Blueprint mô tả tốc độ trên 170 WPM là lỗi "Máy xay gió" và yêu cầu cảnh báo đỏ theo thời gian thực.

8.4 Pitch

Voice Coach phân tích cao độ giọng nói.

SPEC GAP: Blueprint chưa định nghĩa:

đơn vị đo;
sampling rate;
pitch extraction algorithm;
baseline cá nhân;
ngưỡng cảnh báo;
cách chuẩn hóa pitch.
8.5 Breathing

Voice Coach phân tích nhịp thở.

SPEC GAP: Blueprint chưa định nghĩa thuật toán nhận diện hoặc schema dữ liệu của breathing metrics.

8.6 Non-verbal Pauses

Voice Coach đo:

độ dài khoảng lặng phi ngôn ngữ.

Logical flow:

Audio
  ↓
Voice Activity / Audio DSP
  ↓
Pause Detection
  ↓
Pause Duration

SPEC GAP: Blueprint chưa quy định ngưỡng phân loại pause, loại pause hoặc thuật toán detection cụ thể.

8.7 Filler Words

Voice Coach đếm từ đệm.

SPEC GAP: Blueprint chưa cung cấp danh sách filler words chuẩn theo ngôn ngữ hoặc quy tắc đếm.
9. Interaction Coach Specification
9.1 Responsibility

Interaction Coach chịu trách nhiệm phân tích:

active listening;
mức độ bám sát trọng tâm đối thủ;
thời điểm chất vấn POI;
giao thoa ngữ nghĩa giữa hai bên;
mức độ tương tác trực tiếp;
mức độ né tránh câu hỏi.
9.2 Two-Side Semantic Analysis

Khác với Logic Coach tập trung vào cấu trúc luận điểm, Interaction Coach cần xem xét mối quan hệ giữa bài nói của hai bên.

Logical flow:

Side A Speech
      │
      ├──────────┐
      │          │
      ▼          ▼
 Semantic Comparison
      ▲          ▲
      │          │
      └──────────┘
      │
      ▼
Side B Speech

Mục tiêu là xác định mức độ giao thoa ngữ nghĩa giữa hai bên.

9.3 Active Listening

Coach phân tích mức độ người nói thực sự phản hồi nội dung của đối phương.

SPEC GAP: Blueprint chưa định nghĩa formal scoring rubric cho active listening.

9.4 Staying on Point

Interaction Coach đánh giá việc bài nói có:

bám sát trọng tâm đối thủ;
tương tác trực tiếp với luận điểm đối phương;
hay né tránh câu hỏi.

SPEC GAP: Blueprint chưa định nghĩa threshold hoặc scoring formula cho mức độ staying on point.

9.5 POI

Blueprint xác định Interaction Coach có trách nhiệm phân tích thời điểm chất vấn POI.

SPEC GAP: Blueprint chưa định nghĩa:

schema của POI event;
timestamp format;
điều kiện một sự kiện được xem là POI;
scoring formula;
ngưỡng thời điểm tối ưu.
10. Psychology Coach Specification
10.1 Responsibility

Psychology Coach chịu trách nhiệm phân tích:

mức độ bình tĩnh;
sự linh hoạt tư duy;
kiểm soát cảm xúc;
tránh công kích cá nhân.
10.2 Analysis Inputs

Blueprint quy định hai phương pháp chính:

Sentiment Analysis
Phân tích biến thiên âm tần

Logical flow:

Transcript
    │
    ▼
Sentiment Analysis
    │
    ├── Emotional Signals
    │
    ▼
Psychology Analysis
    ▲
    │
Audio
    │
    ▼
Pitch Variation Analysis
10.3 Emotional State Signals

Blueprint nêu việc phân tích để phát hiện các trạng thái:

nóng giận;
lo lắng;
tự tin.

Psychology Coach sử dụng các tín hiệu này để đánh giá trạng thái tâm lý trong quá trình tranh luận.

SPEC GAP: Blueprint chưa định nghĩa taxonomy cảm xúc đầy đủ hoặc schema output chuẩn.

10.4 Calmness

Coach phân tích mức độ bình tĩnh.

SPEC GAP: Chưa có ngưỡng định lượng hoặc công thức tính calmness_score.

10.5 Cognitive Flexibility

Coach phân tích sự linh hoạt tư duy.

SPEC GAP: Blueprint chưa định nghĩa phép đo hoặc rubric định lượng cho cognitive_flexibility.

10.6 Emotional Control

Coach phân tích khả năng kiểm soát cảm xúc dựa trên:

sắc thái từ ngữ;
biến thiên âm tần.

SPEC GAP: Blueprint chưa định nghĩa cách kết hợp hai tín hiệu thành một chỉ số duy nhất.

10.7 Personal Attack / Ad Hominem

Psychology Coach phải chú ý tới việc tránh công kích cá nhân.

Logic Coach cũng phát hiện lỗi Ad hominem như một fallacy logic.

Hai khía cạnh này không được tự ý gộp thành một metric mới vì Blueprint chưa định nghĩa quan hệ giữa hai hệ thống.

SPEC GAP: Blueprint chưa quy định cách phân chia trách nhiệm hoặc hợp nhất kết quả giữa Psychology Coach và Logic Coach đối với hành vi công kích cá nhân.

11. Coach Input Model

Blueprint chưa cung cấp một JSON Schema chuẩn cho input của AI Coach.

Ở mức logical architecture, dữ liệu đầu vào có thể bao gồm những thành phần đã được Blueprint đề cập:

Coach Input
├── Debate Session
├── Topic
├── Debate Context
├── Transcript
├── Recent Turns
├── Session Summary
└── Audio / Audio Signal

Việc Coach nào sử dụng trường dữ liệu nào phải tuân thủ phạm vi chuyên biệt của Coach.

Ví dụ:

Logic Coach
├── Transcript
├── Debate Context
├── Recent Turns
└── Session Summary

Voice Coach
└── Audio

Interaction Coach
├── User Transcript
├── Opponent Transcript
├── Debate Context
└── POI-related interaction

Psychology Coach
├── Transcript
└── Audio / Pitch Signals

Đây là logical mapping phục vụ mô tả architecture.

SPEC GAP: Blueprint chưa định nghĩa schema input chính thức và field-level contract giữa Orchestrator và từng Coach.

12. Coach Output Model

Mỗi Coach phải tạo ra kết quả phân tích thuộc đúng phạm vi chuyên môn của mình.

Logical representation:

Coach Result
├── Coach Identity
├── Analysis
├── Metrics
├── Findings
└── Feedback

Tuy nhiên Blueprint không cung cấp JSON Schema chuẩn.

SPEC GAP: Chưa có output contract chính thức cho từng Coach.

SPEC GAP: Chưa có JSON Schema chuẩn cho Orchestrator output.

SPEC GAP: Chưa định nghĩa versioning strategy cho Coach output.

13. Orchestrator Result Aggregation

Orchestrator phải có khả năng nhận kết quả từ 4 Coach:

Logic Coach
      │
      ├─────────────┐
Voice Coach        │
      │             │
      ├─────────────┤
Interaction Coach  │
      │             │
      ├─────────────┤
Psychology Coach   │
      │             │
      └──────┬──────┘
             ▼
     Orchestrator
             │
             ▼
      Unified Analysis

Unified Analysis phải bảo toàn được nguồn gốc phân tích của từng Coach, nhưng Blueprint chưa quy định schema cụ thể.

SPEC GAP: Chưa có canonical unified result schema.

SPEC GAP: Chưa có quy tắc conflict resolution nếu hai Coach đưa ra các nhận xét khác nhau.

SPEC GAP: Chưa có quy tắc ưu tiên kết quả giữa các Coach.

SPEC GAP: Chưa có quy định liệu Orchestrator có được phép tự sinh nhận xét mới hay chỉ tổng hợp kết quả từ các Coach.

14. Relationship with Scoring Engine

AI Coach Framework cung cấp các tín hiệu phân tích phục vụ hệ thống đánh giá.

Section 13 quy định công thức tổng điểm:

Total Score
=
(Content × 0.40)
+
(Style × 0.40)
+
(Strategy × 0.20)
Content

Liên quan trực tiếp đến:

Logic Coach;
Knowledge Graph;
fallacy detection;
evidence evaluation.
Style

Liên quan trực tiếp đến:

Voice Analysis Engine;
Voice Coach.
Strategy

Liên quan đến:

thời điểm phản biện;
phân bổ thời gian;
các tín hiệu chiến thuật trong debate.

Interaction Coach có thể cung cấp dữ liệu liên quan đến tương tác và POI.

Psychology Coach cung cấp phân tích về trạng thái tâm lý nhưng Blueprint không quy định Psychology Coach là một thành phần trọng số độc lập trong công thức Total Score.

Do đó không được tự ý tạo thêm trọng số cho Psychology Coach.

SPEC GAP: Blueprint chưa quy định chính xác mapping toàn bộ output của 4 Coach vào các biến Content, Style, Strategy.


```markdown
# 15. Real-Time Processing

Blueprint quy định hệ thống hỗ trợ dữ liệu âm thanh thời gian thực thông qua WebSocket.

Endpoint:

```text
/api/v1/debates/{id}/stream

Client gửi audio chunk:

PCM / Opus

Server trả về:

transcript tức thời;
chỉ số nhịp nói thời gian thực.

Section 17 quy định mục tiêu:

Audio latency < 500ms

Voice Coach vì vậy thuộc pipeline có yêu cầu xử lý real-time.

SPEC GAP: Blueprint chưa quy định chính xác Coach nào chạy real-time và Coach nào chạy post-turn hoặc post-session.

SPEC GAP: Blueprint chưa định nghĩa event contract giữa WebSocket stream và AI Coach Orchestrator.

16. Prompt Engineering Dependency

Section 10 của Blueprint quy định prompt của AI Coach phải được chuẩn hóa nghiêm ngặt và bao gồm các kỹ thuật cốt lõi.

Ví dụ, Blueprint yêu cầu Prompt Engineering Standard phải kiểm tra việc sử dụng Analogy Module và nếu học sinh chưa sử dụng phép so sánh phù hợp thì AI phải đưa ra gợi ý.

AI Coach Specification không tự viết lại prompt template.

Prompt implementation phải được đặc tả trong tài liệu Prompt Engineering tương ứng.

SPEC GAP: Chưa có prompt templates hoàn chỉnh cho:

Logic Coach.
Voice Coach.
Interaction Coach.
Psychology Coach.
Orchestrator.
17. Error & Failure Handling

Blueprint xác định kiến trúc Multi-Agent nhưng chưa mô tả chi tiết failure handling.

Các tình huống sau chưa được đặc tả:

một Coach timeout;
một Coach trả về malformed result;
một Coach không thể phân tích audio;
STT thất bại;
Knowledge Graph generation thất bại;
một Coach không trả kết quả;
một Coach trả kết quả không nhất quán.

SPEC GAP: Chưa có failure-handling contract cho Multi-Agent Orchestrator.

SPEC GAP: Chưa có retry policy.

SPEC GAP: Chưa có timeout policy cho từng Coach.

SPEC GAP: Chưa có degraded-mode behavior.

18. Inter-Process / Inter-Agent Communication

Blueprint chỉ xác định:

Multi-Agent Orchestrator
        ↓
4 Independent AI Coaches

Blueprint không quy định công nghệ IPC hoặc communication protocol.

Không được tự ý quyết định:

HTTP;
gRPC;
message queue;
Kafka;
RabbitMQ;
Redis Streams;
shared memory;
event bus;

là implementation bắt buộc của Blueprint.

SPEC GAP: Chưa có IPC protocol giữa Orchestrator và các Coach.

SPEC GAP: Chưa có message envelope schema.

SPEC GAP: Chưa có correlation ID specification.

SPEC GAP: Chưa có event naming convention.

19. Data Persistence

Section 07 định nghĩa debate_transcripts với các trường liên quan trực tiếp đến AI Coach:

id
session_id
speaker_type
turn_number
text_content
audio_path
fallacies_detected
evidence_star

Trong đó:

fallacies_detected JSONB
evidence_star INT

là các trường phục vụ lưu trữ kết quả phân tích logic.

Blueprint chưa định nghĩa bảng persistence riêng cho:

Voice Coach results;
Interaction Coach results;
Psychology Coach results;
Orchestrator results.

Không được tự ý thêm các bảng này vào Database Design chỉ từ tài liệu này.

SPEC GAP: Chưa có persistence schema cho output của Voice Coach, Interaction Coach, Psychology Coach và Orchestrator.

20. AI Coach Security & Safety

AI Debate Master phục vụ học sinh từ 11 tuổi trở lên và Blueprint yêu cầu Safety Filters để ngăn nội dung độc hại, nhạy cảm hoặc không phù hợp với lứa tuổi.

AI Coach phải nằm trong cùng safety boundary của hệ thống.

Testing Strategy của Blueprint yêu cầu:

Prompt Red-Teaming.
Kiểm thử jailbreak.
Ngăn thông tin sai lệch, quan điểm lệch lạc về chính trị, tôn giáo hoặc ngôn từ bạo lực.
Mục tiêu tỷ lệ an toàn 100%.

AI Coach Specification không tạo thêm safety policy riêng ngoài Blueprint.
21. Explicit AI Coach SPEC Gaps

Danh sách SPEC GAP chính thức của tài liệu này:

ID	SPEC GAP
GAP-001	Chưa có prompt template chi tiết cho từng AI Coach
GAP-002	Chưa có prompt template chi tiết cho Multi-Agent Orchestrator
GAP-003	Chưa có JSON Schema chuẩn cho input của từng Coach
GAP-004	Chưa có JSON Schema chuẩn cho output của từng Coach
GAP-005	Chưa có JSON Schema chuẩn cho Orchestrator output
GAP-006	Chưa có IPC protocol giữa Orchestrator và các Coach
GAP-007	Chưa có message envelope/schema giữa các Agent
GAP-008	Chưa có correlation ID contract
GAP-009	Chưa có retry policy cho Agent
GAP-010	Chưa có timeout policy cho Agent
GAP-011	Chưa có degraded-mode behavior khi một Coach thất bại
GAP-012	Chưa có thuật toán Knowledge Graph cụ thể
GAP-013	Chưa có schema Knowledge Graph cụ thể
GAP-014	Chưa có thuật toán formal để phát hiện hidden contradiction
GAP-015	Chưa có thuật toán formal để phát hiện premise gap
GAP-016	Chưa có taxonomy đầy đủ và JSON Schema cho fallacies_detected
GAP-017	Chưa có quy tắc chi tiết mapping evidence_star vào Content Score
GAP-018	Chưa có thuật toán pitch extraction
GAP-019	Chưa có ngưỡng pitch và normalization strategy
GAP-020	Chưa có thuật toán breathing detection
GAP-021	Chưa có thuật toán non-verbal pause detection
GAP-022	Chưa có danh sách filler words chuẩn
GAP-023	Chưa có rubric định lượng cho active listening
GAP-024	Chưa có semantic-overlap scoring formula cho Interaction Coach
GAP-025	Chưa có POI event schema và scoring formula
GAP-026	Chưa có calmness scoring formula
GAP-027	Chưa có cognitive flexibility scoring formula
GAP-028	Chưa có emotional control scoring formula
GAP-029	Chưa có emotion taxonomy chuẩn cho Psychology Coach
GAP-030	Chưa có quy tắc hợp nhất Logic Coach và Psychology Coach đối với Ad hominem
GAP-031	Chưa có canonical unified result schema
GAP-032	Chưa có conflict-resolution policy giữa các Coach
GAP-033	Chưa có quy tắc ưu tiên kết quả giữa các Coach
GAP-034	Chưa có quy định Orchestrator chỉ tổng hợp hay được phép suy luận thêm
GAP-035	Chưa có mapping đầy đủ từ output 4 Coach sang Content / Style / Strategy
GAP-036	Chưa có quy định Coach nào chạy real-time, post-turn hoặc post-session
GAP-037	Chưa có WebSocket-to-Coach event contract
GAP-038	Chưa có persistence schema cho Voice / Interaction / Psychology Coach
GAP-039	Chưa có persistence schema cho Orchestrator result
GAP-040	Chưa có versioning strategy cho Coach contracts
22. AI Coach Compliance Checklist
22.1 Architecture
 Multi-Agent architecture được xác định.
 Có Multi-Agent Orchestrator trung tâm.
 Có đúng 4 AI Coach theo Blueprint.
 4 Coach được mô tả là các tác nhân độc lập.
 4 Coach chạy song song theo Section 09.
 Không tự thêm Coach mới.
 Không tự thêm communication technology chưa được Blueprint quy định.
22.2 Logic Coach
 Phân tích cấu trúc lập luận.
 Phân tích fallacy.
 Phân tích evidence.
 Có fallacies_detected.
 Có evidence_star 1–5.
 Transcript được sử dụng làm đầu vào.
 Knowledge Graph được xác định.
 Hidden contradiction được xác định.
 Premise gap được xác định.
 Các thuật toán chưa được Blueprint đặc tả được đánh dấu SPEC GAP.
22.3 Voice Coach
 WPM.
 Pitch.
 Breathing.
 Non-verbal pauses.
 Filler words.
 Audio DSP.
 WPM thresholds theo Section 14.
 Các thuật toán chi tiết chưa được Blueprint đặc tả được đánh dấu SPEC GAP.
22.4 Interaction Coach
 Active listening.
 Semantic interaction giữa hai bên.
 Bám sát trọng tâm đối thủ.
 POI timing.
 Phát hiện né tránh câu hỏi.
 Các scoring/rule chi tiết chưa được Blueprint đặc tả được đánh dấu SPEC GAP.
22.5 Psychology Coach
 Calmness.
 Cognitive flexibility.
 Emotional control.
 Tránh personal attack.
 Sentiment Analysis.
 Pitch variation analysis.
 Phát hiện nóng giận.
 Phát hiện lo lắng.
 Phát hiện tự tin.
 Các scoring/rule chi tiết chưa được Blueprint đặc tả được đánh dấu SPEC GAP.
22.6 Blueprint Compliance
 Tuân thủ Section 06 — System Architecture.
 Tuân thủ Section 09 — AI Coach Framework.
 Không tự tạo prompt templates.
 Không tự tạo IPC protocol.
 Không tự tạo canonical JSON schemas.
 Không tự tạo scoring formulas ngoài Blueprint.
 Không tự tạo database tables ngoài Blueprint.
 Các phần chưa được đặc tả được đánh dấu SPEC GAP.

```markdown
# 23. Document Status

**Status:** SPECIFICATION DRAFT — BLUEPRINT ALIGNED

Tài liệu này chuyển Section 06 và Section 09 của `ai-debate-master-blueprint-v3.pdf` thành một đặc tả AI Coach có cấu trúc để phục vụ các tài liệu kỹ thuật tiếp theo.

Tài liệu **không được xem là hoàn chỉnh implementation contract** cho tới khi các SPEC GAP được giải quyết bằng một tài liệu nguồn có thẩm quyền hoặc bằng phiên bản Blueprint mới.

## Source of Truth

```text
ai-debate-master-blueprint-v3.pdf
Version 3.0.0
Primary References
Section 06 — System Architecture
Section 09 — AI Coach Framework
Supporting References
Section 07 — Database Design
Section 08 — API Specification
Section 10 — Prompt Engineering Standard
Section 13 — Scoring Engine
Section 14 — Voice Analysis Engine
Section 17 — Deployment Architecture
Section 19 — Testing Strategy
Compliance Rule

Nếu một yêu cầu implementation không được Blueprint v3.0.0 đặc tả rõ ràng, không được tự suy diễn thành một requirement chính thức. Phải ghi rõ SPEC GAP: [Nội dung thiếu].

END OF DOCUMENT