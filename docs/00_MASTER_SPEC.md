# AI Debate Master

## Master Technical Specification

**Document:** `00_MASTER_SPEC.md`
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`
**Blueprint Version:** `v3.0.0`
**Release Date:** 07/08/2026
**Specification Status:** Master Technical Specification

---

## 1. Source of Truth

Tài liệu này được xây dựng trực tiếp từ:

> **AI DEBATE MASTER — Bậc thầy tranh luận AI — Hệ điều hành phát triển tư duy (Thinking OS), Project Blueprint Version 3.0.0 — Technical Specification.**

`ai-debate-master-blueprint-v3.pdf` là **Source of Truth duy nhất** của dự án.

Mọi kiến trúc, logic nghiệp vụ, công nghệ, API, Database, AI Coach, bảo mật, triển khai và kiểm thử phải tuân thủ Blueprint v3.0.0.

Không được tự ý:

* thêm chức năng nghiệp vụ;
* loại bỏ chức năng đã được Blueprint quy định;
* thay đổi công nghệ lõi đã được Blueprint quy định;
* thay đổi mô hình dữ liệu đã được Blueprint quy định;
* thay đổi API contract đã được Blueprint quy định;
* thay đổi mô hình 4 AI Coaches;
* thay thế kiến trúc Microservices bằng Monolith.

Nếu Blueprint chưa đặc tả đủ để đưa ra quyết định kỹ thuật:

```text
SPEC GAP: [Nội dung chưa được Blueprint đặc tả]
```

Phải được ghi nhận và dừng quyết định tại đó, không tự suy diễn.

**Blueprint References:**

* Section 01 — Vision & Product Strategy
* Section 05 — Domain Architecture
* Section 06 — System Architecture
* Section 07 — Database Design
* Section 08 — API Specification
* Section 09 — AI Coach Framework
* Section 17 — Deployment Architecture

---

## 2. Project Objective

AI Debate Master được định vị là một:

* **AI Cognitive Coach**
* **Thinking OS**
* **AI Sparring Partner**

Mục tiêu của hệ thống là chuyển trải nghiệm tương tác với AI từ mô hình chatbot thông thường sang mô hình **huấn luyện tư duy thông qua đối luyện tranh luận**.

Hệ thống phải hỗ trợ người học:

* luyện tranh luận;
* phát triển tư duy phản biện;
* xây dựng và bảo vệ quan điểm;
* nhận diện giả định;
* nhận diện lỗi ngụy biện;
* phát triển khả năng nghe và phản hồi;
* rèn luyện kỹ năng nói;
* phát triển khả năng tư duy đa chiều;
* học cách tôn trọng sự khác biệt và thấu cảm.

AI đóng vai trò **sparring partner**, liên tục chất vấn, đặt câu hỏi Socratic và buộc người học bảo vệ hoặc thay đổi quan điểm.

Blueprint xác định đây là một hệ thống rèn luyện toàn diện các kỹ năng **Nghe — Nói — Đọc — Viết** ở mức độ cao.

**Blueprint Reference:**

* Section 01 — Vision & Product Strategy
* Project Abstract
* Section 03 — Learning Science Framework
* Section 04 — Debate Pedagogy

---

## 3. Mandatory Business Domains

Hệ thống bắt buộc có 5 Domain nghiệp vụ chính.

### 3.1. Auth Domain

Chức năng được Blueprint quy định:

* Apple Login;
* Delete Account;
* bảo vệ dữ liệu người dùng, đặc biệt đối với trẻ em dưới 15 tuổi.

Domain này liên quan trực tiếp đến cơ chế xác thực và yêu cầu bảo vệ quyền riêng tư.

**Blueprint Reference:**

* Section 05 — Domain Architecture
* Section 16 — Security & Privacy

---

### 3.2. User & Subscription Domain

Chức năng được Blueprint quy định:

* quản lý người dùng;
* quản lý gói đăng ký;
* các tier:

  * Basic
  * Standard
  * Premium
* phân quyền tính năng theo gói;
* cấu hình ngôn ngữ;
* hỗ trợ cấu hình đa ngôn ngữ.

Blueprint mô tả hệ thống hỗ trợ 15 ngôn ngữ.

**Blueprint Reference:**

* Section 05 — Domain Architecture
* Section 07 — Database Design

---

### 3.3. Arena Domain

Đây là Domain đấu luyện chính.

Chức năng được Blueprint quy định:

* AI Sparring;
* lựa chọn nhân vật đối thủ AI;
* lựa chọn phe tranh luận;
* lựa chọn chế độ Voice/Text;
* tương tác giọng nói thời gian thực;
* tương tác văn bản.

Arena Domain là Domain sử dụng trực tiếp hệ thống Multi-Agent AI Coach và Real-time Audio WebSocket.

**Blueprint Reference:**

* Section 05 — Domain Architecture
* Section 08 — API Specification
* Section 09 — AI Coach Framework
* Section 14 — Voice Analysis Engine

---

### 3.4. Assistant Domain

Chức năng được Blueprint quy định:

* tạo bản thảo bài phát biểu;
* tạo dàn ý từ ý tưởng thô;
* tạo báo cáo phân tích chủ đề kiến nghị;
* cung cấp các góc nhìn đa chiều;
* hỗ trợ người học chuẩn bị tài liệu.

**Blueprint Reference:**

* Section 05 — Domain Architecture
* Section 08 — API Specification

---

### 3.5. Plaza Domain

Chức năng được Blueprint quy định:

* Plaza Feed;
* hiển thị các bài đấu luyện xuất sắc được công khai;
* Like;
* Favorite;
* lưu trữ bài tranh luận yêu thích;
* phục vụ học hỏi và nghiên cứu.

**Blueprint Reference:**

* Section 05 — Domain Architecture

---

## 4. Mandatory System Architecture

Hệ thống phải sử dụng kiến trúc:

```text
Microservices
    +
Multi-Agent Orchestrator
    +
Session Memory
    +
Real-time Voice Analysis
```

Blueprint mô tả hệ thống là **Microservices phân tán**, được điều phối bởi một **Multi-Agent Orchestrator** trung tâm.

Không được triển khai hệ thống cuối cùng theo kiến trúc Monolith.

**Blueprint Reference:**

* Section 06 — System Architecture
* Section 17 — Deployment Architecture

---

## 5. Core Technology Requirements

### 5.1. Backend

**Technology: FastAPI**

Blueprint chỉ rõ FastAPI/Nginx ở lớp API Gateway.

FastAPI chịu trách nhiệm phục vụ các yêu cầu RESTful API và là thành phần API Gateway trong kiến trúc triển khai.

**Blueprint Reference:**

* Section 17 — Deployment Architecture
* Section 08 — API Specification

---

### 5.2. Database

**Technology: PostgreSQL**

Blueprint quy định Database là PostgreSQL.

PostgreSQL được sử dụng để lưu trữ dữ liệu quan hệ của hệ thống, bao gồm dữ liệu người dùng, phiên tranh biện và dữ liệu liên quan.

Không sử dụng SQLite cho kiến trúc của hệ thống này.

**Blueprint Reference:**

* Section 07 — Database Design
* Section 17 — Deployment Architecture

---

### 5.3. Cache / Session Context

**Technology: Redis**

Redis được Blueprint quy định để:

* lưu trữ tạm thời session context;
* lưu thông tin tóm tắt các lượt nói;
* hỗ trợ truy cập nhanh.

Blueprint đặt mục tiêu truy cập cache dưới 10ms.

Redis cũng phục vụ cơ chế Session Memory nhằm giảm lượng context phải gửi lại cho LLM.

**Blueprint Reference:**

* Section 06 — System Architecture
* Section 17 — Deployment Architecture

---

### 5.4. Real-time Communication

**Technology: WebSocket**

WebSocket là kênh giao tiếp thời gian thực cho Debate Arena.

Endpoint được Blueprint quy định:

```text
WS /api/v1/debates/{id}/stream
```

Client gửi audio chunk dạng PCM/Opus.

Server trả về:

* transcript tức thời;
* chỉ số nhịp nói thời gian thực.

Blueprint đặt mục tiêu Audio Latency dưới 500ms.

**Blueprint Reference:**

* Section 08 — API Specification
* Section 17 — Deployment Architecture

---

## 6. Mandatory AI Architecture

Hệ thống phải sử dụng mô hình **4 AI Coaches độc lập**, chạy song song và đảm nhiệm các khía cạnh khác nhau của phân tích.

### 6.1. Logic Coach

Phân tích:

* cấu trúc lập luận;
* ngụy biện;
* dẫn chứng;
* tính logic;
* Knowledge Graph của luận điểm;
* mâu thuẫn ẩn;
* lỗ hổng tiền đề.

**Blueprint Reference:**

* Section 09 — AI Coach Framework

---

### 6.2. Voice Coach

Phân tích:

* WPM;
* cao độ;
* nhịp thở;
* khoảng lặng;
* từ đệm;
* đặc trưng giọng nói.

Voice Coach xử lý luồng âm thanh và các đặc trưng Audio DSP được Blueprint quy định.

**Blueprint Reference:**

* Section 09 — AI Coach Framework
* Section 14 — Voice Analysis Engine

---

### 6.3. Interaction Coach

Phân tích:

* active listening;
* mức độ bám sát trọng tâm đối thủ;
* thời điểm chất vấn POI;
* mức độ tương tác trực tiếp;
* mức độ né tránh câu hỏi.

**Blueprint Reference:**

* Section 09 — AI Coach Framework

---

### 6.4. Psychology Coach

Phân tích:

* mức độ bình tĩnh;
* sự linh hoạt tư duy;
* kiểm soát cảm xúc;
* tránh công kích;
* các tín hiệu liên quan đến trạng thái cảm xúc.

**Blueprint Reference:**

* Section 09 — AI Coach Framework

---

## 7. Session Memory Requirement

Hệ thống phải sử dụng cơ chế Session Memory để tối ưu hóa context gửi tới LLM.

Blueprint quy định:

```text
Raw Debate History
        |
        v
Background Summarizer
        |
        v
Logic Summary
        +
5 gần nhất
        |
        v
LLM
```

Thay vì gửi toàn bộ lịch sử thô của phiên tranh luận kéo dài 20–30 phút, hệ thống sử dụng Summary kết hợp với 5 lượt chat gần nhất.

Mục tiêu được Blueprint nêu là giảm đáng kể chi phí token, tới mức khoảng 80%.

**Blueprint Reference:**

* Section 06 — System Architecture

---

## 8. Separated Storage Requirement

Dữ liệu của một phiên đấu luyện phải được tách thành các lớp độc lập theo Blueprint:

1. Metadata
2. Transcript
3. Audio
4. AI Analysis
5. Embedding Vector

Blueprint quy định:

* Audio sử dụng Opus 24kbps;
* thời lượng khoảng 20 phút chiếm khoảng 3–4MB;
* Embedding vector có 1536 dimensions.

**Blueprint Reference:**

* Section 06 — System Architecture
* Section 07 — Database Design
* Section 15 — Replay Engine

---

## 9. Database Baseline

Database phải được xây dựng trên PostgreSQL.

Blueprint đã đặc tả tối thiểu các thực thể:

### users

```text
id
apple_id
display_name
selected_lang
tier
created_at
```

### debate_sessions

```text
id
user_id
character_id
topic_title
user_side
input_mode
score_content
score_style
score_strategy
score_total
```

### debate_transcripts

```text
id
session_id
speaker_type
turn_number
text_content
audio_path
fallacies_detected
evidence_star
```

Các schema chi tiết hơn phải được xây dựng trong:

```text
03_DATABASE_SPEC.md
```

và phải đối chiếu trực tiếp với Section 07 của Blueprint.

**Blueprint Reference:**

* Section 07 — Database Design

---

## 10. API Baseline

Blueprint đã đặc tả các API chính:

```text
POST /api/v1/auth/apple

GET /api/v1/users/me/profile
PUT /api/v1/users/me/profile

POST /api/v1/debates

WS /api/v1/debates/{id}/stream

POST /api/v1/speeches/draft

POST /api/v1/reports/analyze
```

API contract chi tiết không được tự thiết kế trong file này.

Chi tiết phải được đặc tả trong:

```text
04_API_SPEC.md
```

**Blueprint Reference:**

* Section 08 — API Specification

---

## 11. Core Operating Principles

### 11.1. Blueprint Compliance

Blueprint v3.0.0 là Source of Truth tuyệt đối.

Mọi implementation phải được đối chiếu với Blueprint trước khi triển khai.

---

### 11.2. No SQLite

SQLite không được sử dụng làm Database của kiến trúc hệ thống này.

Database bắt buộc:

```text
PostgreSQL
```

---

### 11.3. No Monolith

Hệ thống phải tuân thủ kiến trúc:

```text
Microservices
```

Không thay thế bằng một Monolith duy nhất.

---

### 11.4. No Unauthorized Inference

Nếu Blueprint chưa quy định:

```text
SPEC GAP: [Nội dung chưa được đặc tả]
```

Không tự ý quyết định implementation.

---

### 11.5. AI Coach Separation

Bốn AI Coach phải được duy trì như các năng lực phân tích độc lập:

```text
Logic Coach
Voice Coach
Interaction Coach
Psychology Coach
```

Không gộp toàn bộ thành một AI Coach duy nhất.

---

### 11.6. Real-time Requirement

Các chức năng âm thanh thời gian thực phải sử dụng WebSocket theo API specification của Blueprint.

---

## 12. Technology Decisions Explicitly Supported by Blueprint

| Thành phần          | Công nghệ / Kiến trúc      | Trạng thái                                          |
| ------------------- | -------------------------- | --------------------------------------------------- |
| API Gateway         | FastAPI / Nginx            | Bắt buộc theo Blueprint                             |
| Backend API         | FastAPI                    | Được Blueprint chỉ định tại Deployment Architecture |
| Database            | PostgreSQL                 | Bắt buộc                                            |
| Cache               | Redis                      | Bắt buộc                                            |
| Real-time Audio     | WebSocket                  | Bắt buộc                                            |
| Speech-to-Text      | Whisper-compatible API     | Được Blueprint chỉ định                             |
| Audio Storage       | Hot / Warm / Cold Storage  | Được Blueprint chỉ định                             |
| AI Architecture     | Multi-Agent / 4 AI Coaches | Bắt buộc                                            |
| System Architecture | Microservices              | Bắt buộc                                            |

**Blueprint Reference:**

* Section 06 — System Architecture
* Section 07 — Database Design
* Section 08 — API Specification
* Section 09 — AI Coach Framework
* Section 17 — Deployment Architecture

---

## 13. Explicit Constraints

Các quy tắc sau là ràng buộc của dự án:

```text
Source of Truth
        |
        v
Blueprint v3.0.0
        |
        +-- Microservices
        |
        +-- PostgreSQL
        |
        +-- Redis
        |
        +-- WebSocket
        |
        +-- Multi-Agent
        |
        +-- 4 AI Coaches
        |
        +-- Session Memory
        |
        +-- Voice Analysis
```

Không được thay thế các thành phần trên bằng các lựa chọn đơn giản hơn chỉ nhằm giảm độ phức tạp triển khai.

---

## 14. Specification Gaps

### SPEC GAP 001 — Chi tiết phân ranh giới Microservices

Blueprint xác định kiến trúc Microservices nhưng trong các phần được đặc tả chưa cung cấp đầy đủ danh sách service, ownership của từng service, boundary, communication contract nội bộ và deployment unit cụ thể.

**Không tự suy diễn tại Master Specification.**

Sẽ được xử lý tại:

```text
01_ARCHITECTURE.md
```

nếu Blueprint cung cấp đủ thông tin; nếu không, tiếp tục ghi nhận `SPEC GAP`.

---

### SPEC GAP 002 — Frontend Technology

Blueprint xác định các API, UI/domain và kiến trúc hệ thống nhưng không chỉ rõ framework frontend cụ thể trong các phần được tham chiếu tại Master Specification.

**Không tự chọn React, Vue, Angular hoặc framework khác tại đây.**

---

### SPEC GAP 003 — Internal Service Communication

Blueprint quy định RESTful API và WebSocket ở lớp giao tiếp client/server, nhưng chưa đặc tả đầy đủ cơ chế giao tiếp nội bộ giữa các Microservices.

**Không tự chọn REST, gRPC, message broker hoặc cơ chế khác tại Master Specification.**

---

### SPEC GAP 004 — AI Model Provider

Blueprint quy định Multi-Agent LLM và Whisper-compatible API nhưng chưa khóa một nhà cung cấp/model LLM cụ thể trong Master Specification.

**Không tự chỉ định model/provider cụ thể tại đây.**

---

## 15. Next Specification Layer

Sau Master Specification, tài liệu sẽ được triển khai theo thứ tự:

```text
00_MASTER_SPEC.md
        |
        v
01_ARCHITECTURE.md
        |
        v
02_DOMAIN_SPEC.md
        |
        v
03_DATABASE_SPEC.md
        |
        v
04_API_SPEC.md
        |
        v
05_AI_COACH_SPEC.md
        |
        v
06_SKILL_TREE_SPEC.md
        |
        v
07_SCORING_SPEC.md
        |
        v
08_VOICE_ENGINE_SPEC.md
        |
        v
09_REPLAY_SPEC.md
        |
        v
10_SECURITY_SPEC.md
        |
        v
11_DEPLOYMENT_SPEC.md
        |
        v
12_TESTING_SPEC.md
```

Mỗi tầng phải kế thừa các ràng buộc của `00_MASTER_SPEC.md` và đối chiếu ngược với `ai-debate-master-blueprint-v3.pdf`.

---

## 16. Master Specification Status

```text
Source of Truth: ai-debate-master-blueprint-v3.pdf
Blueprint Version: 3.0.0

Master Specification:
DEFINED

Architecture:
MICROSERVICES

Database:
POSTGRESQL

Cache:
REDIS

Real-time Communication:
WEBSOCKET

AI Architecture:
4 AI COACHES

SQLite:
PROHIBITED

Monolith:
PROHIBITED

Unspecified technical decisions:
MUST BE MARKED AS SPEC GAP
```
