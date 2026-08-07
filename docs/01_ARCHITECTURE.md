# AI Debate Master — System Architecture

**Document:** `01_ARCHITECTURE.md`  
**Project:** AI Debate Master — Thinking OS  
**Blueprint:** `ai-debate-master-blueprint-v3.pdf`  
**Blueprint Version:** `3.0.0`  
**Status:** Technical Specification  
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`

---

# 1. Purpose

Tài liệu này đặc tả kiến trúc hệ thống của AI Debate Master dựa trực tiếp trên:

- Section 06 — System Architecture
- Section 17 — Deployment Architecture

Các nội dung liên quan đến 4 AI Coaches được đối chiếu thêm với:

- Section 09 — AI Coach Framework

Tài liệu này chỉ ghi nhận những thành phần và quan hệ kiến trúc mà Blueprint đã đặc tả.

Nếu Blueprint chưa cung cấp đủ thông tin để quyết định một chi tiết triển khai, phải ghi:

`SPEC GAP: [Nội dung chưa được Blueprint đặc tả]`

và không tự suy diễn.

---

# 2. System Overview

AI Debate Master vận hành theo kiến trúc **Microservices phân tán**, được điều phối bởi một **Multi-Agent Orchestrator** trung tâm.

Multi-Agent Orchestrator có nhiệm vụ điều phối các năng lực AI để phân tích đa chiều dữ liệu đầu vào theo thời gian thực.

Kiến trúc hệ thống bao gồm các lớp chính:

1. Client
2. API Gateway
3. Microservices
4. Multi-Agent Orchestrator
5. 4 AI Coaches
6. PostgreSQL
7. Redis
8. Storage Tiers

### Logical Topology

    ┌───────────────────────────────┐
    │            CLIENT             │
    │                               │
    │       Web Application         │
    │                               │
    │     Text / Voice Debate       │
    └───────────────┬───────────────┘
                    │
                    │ HTTPS / WebSocket
                    ▼
    ┌────────────────────────────────────┐
    │         API GATEWAY LAYER           │
    │                                    │
    │       Nginx / FastAPI              │
    │                                    │
    │  REST API + Real-time WebSocket    │
    └────────────────┬───────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────┐
    │       DISTRIBUTED MICROSERVICES     │
    │                                    │
    │        Application Services         │
    └────────────────┬───────────────────┘
                     │
                     ├──────────────────────┐
                     │                      │
                     ▼                      ▼
    ┌────────────────────────┐   ┌─────────────────────────┐
    │ Multi-Agent             │   │       Data Layer        │
    │ Orchestrator            │   │                         │
    │                         │   │ PostgreSQL              │
    │                         │   │ Redis                   │
    └───────────┬─────────────┘   │ Storage Tiers           │
                │                 └─────────────────────────┘
                │
                ├────────────────┐
                │                │
                ▼                ▼
    ┌────────────────┐  ┌────────────────┐
    │  Logic Coach   │  │  Voice Coach   │
    └────────────────┘  └────────────────┘

                │
                ├─────────────────────────┐
                │                         │
                ▼                         ▼
    ┌────────────────────┐    ┌────────────────────┐
    │ Interaction Coach  │    │ Psychology Coach   │
    └────────────────────┘    └────────────────────┘

Sơ đồ trên là sơ đồ logic tổng hợp từ các thành phần được Blueprint quy định.

Blueprint chưa đặc tả danh sách Microservice cụ thể hoặc topology triển khai chi tiết giữa từng service.

**SPEC GAP:** Ranh giới và topology chính xác của từng Microservice chưa được Blueprint đặc tả.

**Blueprint Reference:**

- Section 06 — System Architecture
- Section 17 — Deployment Architecture

---

# 3. Architecture Principles

## 3.1. Distributed Microservices

Hệ thống bắt buộc sử dụng kiến trúc:

`Distributed Microservices`

Không triển khai hệ thống cuối cùng dưới dạng Monolith.

Blueprint mô tả hệ thống là kiến trúc Microservices phân tán, được điều phối bởi Multi-Agent Orchestrator.

## 3.2. Central Multi-Agent Orchestrator

Các năng lực AI được điều phối bởi:

`Multi-Agent Orchestrator`

Orchestrator là bộ điều phối AI trung tâm phục vụ việc phân tích đa chiều dữ liệu đầu vào thời gian thực.

## 3.3. Session Memory

Hệ thống phải sử dụng Session Memory để giảm lượng context phải gửi tới LLM trong các phiên tranh luận dài.

Blueprint đặt mục tiêu giảm tới 80% chi phí API thông qua cơ chế này.

## 3.4. Separated Storage

Dữ liệu của một phiên tranh luận được phân tách thành 5 lớp dữ liệu độc lập:

1. Metadata
2. Transcript
3. Audio
4. AI Analysis
5. Embedding

Mục tiêu của chiến lược này là tối ưu dung lượng và chi phí lưu trữ.

---

# 4. API Gateway & Routing Layer

## 4.1. Nginx / FastAPI

Blueprint quy định tầng API Gateway sử dụng:

`FastAPI / Nginx`

Vai trò:

- định tuyến các yêu cầu RESTful;
- hỗ trợ cân bằng tải;
- hỗ trợ bảo mật luồng dữ liệu API.

**Blueprint Reference:**

- Section 17 — Deployment Architecture

## 4.2. REST API

Các yêu cầu API thông thường được định tuyến qua API Gateway.

Kiến trúc tổng quát:

    Client
      │
      ▼
    Nginx / FastAPI
      │
      ▼
    Microservices

**SPEC GAP:** Chưa có đặc tả chi tiết về bảng routing giữa từng REST endpoint và từng Microservice cụ thể.

## 4.3. Real-time WebSocket

Real-time Audio sử dụng:

`WebSocket`

Endpoint được Blueprint quy định:

`WS /api/v1/debates/{id}/stream`

WebSocket phục vụ kết nối real-time cho luồng âm thanh của phiên tranh luận.

Blueprint đặt yêu cầu:

`Audio latency < 500ms`

Kiến trúc logic:

    Client
       │
       │ WebSocket
       │
       ▼
    Nginx / FastAPI
       │
       ▼
    Debate / Real-time Processing
       │
       ▼
    AI / Voice Processing

**SPEC GAP:** Chưa đặc tả WebSocket message contract, frame schema, connection lifecycle và cơ chế routing WebSocket nội bộ giữa các Microservices.

**Blueprint Reference:**

- Section 08 — API Specification
- Section 17 — Deployment Architecture

---

# 5. Multi-Agent Orchestrator

## 5.1. Role

Multi-Agent Orchestrator là bộ điều phối AI trung tâm.

Nó phối hợp các AI Coach độc lập để phân tích nhiều khía cạnh khác nhau của dữ liệu tranh luận.

Blueprint mô tả các AI Coach là các trợ lý AI độc lập chạy song song.

## 5.2. Logical Interaction

                        ┌──────────────────────┐
                        │ Multi-Agent          │
                        │ Orchestrator         │
                        └──────────┬───────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
           Logic Coach       Voice Coach     Interaction Coach
                  │                │                │
                  └────────────────┼────────────────┘
                                   │
                                   ▼
                         Psychology Coach

Sơ đồ trên thể hiện vai trò của Orchestrator và 4 Coach.

Blueprint không đặc tả rằng các Coach phải giao tiếp với nhau theo một giao thức nội bộ cụ thể.

**SPEC GAP:** Chưa đặc tả cơ chế IPC/message protocol giữa Multi-Agent Orchestrator và từng AI Coach.

---

# 6. AI Coach Services

## 6.1. Logic Coach

Logic Coach phụ trách:

- cấu trúc lập luận;
- ngụy biện;
- dẫn chứng;
- tính logic hệ thống.

Blueprint mô tả quá trình xử lý bao gồm:

- chuyển âm thanh thành transcript;
- xây dựng Knowledge Graph của luận điểm;
- tìm kiếm mâu thuẫn ẩn;
- tìm kiếm lỗ hổng tiền đề.

**Blueprint Reference:**

- Section 09 — AI Coach Framework

## 6.2. Voice Coach

Voice Coach phụ trách:

- tốc độ phát âm WPM;
- cao độ giọng nói;
- nhịp thở;
- độ dài khoảng lặng;
- từ đệm.

Blueprint mô tả Voice Coach xử lý trực tiếp luồng tín hiệu âm thanh bằng Audio DSP để trích xuất đặc trưng giọng nói và đo khoảng lặng phi ngôn ngữ.

**Blueprint Reference:**

- Section 09 — AI Coach Framework
- Section 14 — Voice Analysis Engine

## 6.3. Interaction Coach

Interaction Coach phụ trách:

- lắng nghe chủ động;
- mức độ bám sát trọng tâm đối thủ;
- thời điểm chất vấn POI;
- mức độ tương tác trực tiếp;
- mức độ né tránh câu hỏi.

Blueprint mô tả việc phân tích giao thoa ngữ nghĩa giữa bài nói của hai bên.

**Blueprint Reference:**

- Section 09 — AI Coach Framework

## 6.4. Psychology Coach

Psychology Coach phụ trách:

- mức độ bình tĩnh;
- sự linh hoạt tư duy;
- kiểm soát cảm xúc;
- tránh công kích.

Blueprint mô tả việc sử dụng:

- Sentiment Analysis;
- phân tích biến thiên âm tần;

để phát hiện các trạng thái như:

- nóng giận;
- lo lắng;
- tự tin.

**Blueprint Reference:**

- Section 09 — AI Coach Framework

---

# 7. Data Storage Strategy

Blueprint quy định chiến lược **Separated Storage Strategy** với 5 lớp dữ liệu.

    Debate Session
          │
          ├── Metadata
          │
          ├── Transcript
          │
          ├── Audio
          │
          ├── AI Analysis
          │
          └── Embedding

## 7.1. Metadata

Metadata là lớp dữ liệu nhẹ nhất của phiên tranh luận.

Blueprint không đặc tả đầy đủ schema metadata trong Section 06.

**SPEC GAP:** Section 06 chưa đặc tả đầy đủ schema và storage implementation của Metadata.

## 7.2. Transcript

Transcript chứa dữ liệu văn bản được tạo từ quá trình chuyển đổi lời nói thành văn bản.

Transcript là một trong 5 lớp dữ liệu độc lập của phiên tranh luận.

**SPEC GAP:** Section 06 chưa đặc tả đầy đủ schema, indexing và lifecycle policy riêng của Transcript.

## 7.3. Audio

Audio là lớp lưu trữ âm thanh của phiên tranh luận.

Blueprint quy định:

- Codec: Opus
- Bitrate: 24kbps

Dung lượng tham chiếu:

`20 phút ≈ 3–4 MB`

**Blueprint Reference:**

- Section 06 — System Architecture

## 7.4. AI Analysis

AI Analysis là lớp lưu kết quả phân tích của hệ thống AI.

Blueprint xác định dạng dữ liệu:

`AI Analysis → JSON result`

Các nội dung phân tích được tạo bởi các AI Coach.

**SPEC GAP:** Blueprint chưa đặc tả JSON Schema chính thức của AI Analysis và chưa xác định schema/versioning của kết quả phân tích.

## 7.5. Embedding

Embedding là lớp dữ liệu vector được sử dụng cho tìm kiếm ngữ nghĩa.

Blueprint quy định:

`1536 dimensions`

Mục đích:

`Semantic Search`

**SPEC GAP:** Blueprint chưa đặc tả nơi lưu trữ Embedding, vector index technology và cơ chế truy vấn vector.

Không tự chọn Vector Database hoặc công nghệ vector cụ thể tại tài liệu này.

---

# 8. Storage Tiers

Deployment Architecture quy định ba tầng lưu trữ:

- Hot
- Warm
- Cold

## 8.1. Hot Storage

Thời gian:

`0–30 ngày`

Dữ liệu:

`Đầy đủ dữ liệu`

## 8.2. Warm Storage

Thời gian:

`31–180 ngày`

Dữ liệu:

`Chỉ nén lưu Audio và Transcript`

## 8.3. Cold Storage

Thời gian:

`> 180 ngày`

Dữ liệu chỉ giữ:

- Score
- Thinking DNA

## 8.4. Storage Transition

Logical lifecycle:

             0–30 ngày
                 │
                 ▼
               HOT
                 │
                 ▼
            31–180 ngày
                 │
                 ▼
              WARM
                 │
                 ▼
              >180 ngày
                 │
                 ▼
               COLD

**SPEC GAP:** Chưa đặc tả cơ chế migration/transition tự động giữa Hot, Warm và Cold Storage.

**Blueprint Reference:**

- Section 17 — Deployment Architecture

---

# 9. PostgreSQL

PostgreSQL là relational database của hệ thống.

Database Design của Blueprint xác định:

`PostgreSQL Database`

Database lưu trữ dữ liệu quan hệ của hệ thống.

Kiến trúc logic:

    Microservices
          │
          ▼
    PostgreSQL

Chi tiết schema không thuộc phạm vi của tài liệu Architecture này và phải được đặc tả tại:

`docs/03_DATABASE_SPEC.md`

**Blueprint Reference:**

- Section 07 — Database Design

---

# 10. Redis

Redis được Blueprint quy định tại Deployment Architecture với vai trò:

- lưu trữ tạm thời Session Context;
- lưu thông tin tóm tắt lượt nói;
- hỗ trợ truy cập nhanh.

Mục tiêu truy cập:

`< 10ms`

Kiến trúc logic:

    Session Memory
          │
          ▼
        Redis

Blueprint không đặc tả:

- Redis data structures;
- key naming;
- TTL cụ thể;
- Redis Cluster;
- persistence mode.

**SPEC GAP:** Chưa đặc tả Redis data model, key schema, TTL và deployment topology.

**Blueprint Reference:**

- Section 06 — System Architecture
- Section 17 — Deployment Architecture

---

# 11. Session Memory Architecture

## 11.1. Problem

Một phiên tranh luận kéo dài 20–30 phút có thể tạo ra context rất lớn.

Việc gửi toàn bộ lịch sử thô tới LLM làm tăng chi phí API.

## 11.2. Background Summarizer

Blueprint quy định một mô hình nén chạy nền:

`Background Summarizer`

Nó tóm tắt các lượt đấu trước thành các nút thông tin logic tinh gọn.

## 11.3. Context Construction

Thay vì gửi toàn bộ lịch sử:

    Raw Debate History
            │
            ▼
    Background Summarizer
            │
            ▼
    Logic Summary
            +
    5 lượt chat gần nhất
            │
            ▼
           LLM

LLM nhận:

`Summary + 5 most recent turns`

thay vì toàn bộ lịch sử thô.

Blueprint nêu mục tiêu tiết kiệm khoảng 80% chi phí vận hành/API.

## 11.4. Session Memory Storage

Redis được Blueprint chỉ định để lưu:

- session context;
- thông tin tóm tắt lượt nói.

    Debate Session
          │
          ▼
    Background Summarizer
          │
          ▼
    Logic Summary
          │
          ▼
        Redis
          │
          ├── Summary
          │
          └── Session Context

**SPEC GAP:** Blueprint chưa đặc tả chính xác thời điểm kích hoạt Background Summarizer, thuật toán summarization, schema của Logic Summary và chính sách đồng bộ Summary.

**Blueprint Reference:**

- Section 06 — System Architecture
- Section 17 — Deployment Architecture

---

# 12. End-to-End Logical Flow

Luồng kiến trúc tổng quát:

    ┌──────────────┐
    │    Client    │
    └──────┬───────┘
           │
           │ REST / WebSocket
           ▼
    ┌─────────────────────┐
    │ Nginx / FastAPI     │
    │ API Gateway         │
    └─────────┬───────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Distributed         │
    │ Microservices       │
    └─────────┬───────────┘
              │
              ▼
    ┌────────────────────────────┐
    │ Multi-Agent Orchestrator   │
    └─────────────┬──────────────┘
                  │
           ┌──────┼──────┬──────┐
           │      │      │      │
           ▼      ▼      ▼      ▼
        Logic   Voice Interaction Psychology
        Coach   Coach    Coach      Coach
           │      │      │      │
           └──────┼──────┼──────┘
                  │
                  ▼
           AI Analysis / Result
                  │
           ┌──────┴───────────┐
           │                  │
           ▼                  ▼
      PostgreSQL            Redis
           │                  │
           └────────┬─────────┘
                    │
                    ▼
              Storage Tiers
           Hot / Warm / Cold

Đây là **logical architecture**, không phải deployment topology chi tiết của từng Microservice.

---

# 13. Architecture Boundaries

Các thành phần sau được Blueprint xác định trực tiếp:

| Thành phần | Trạng thái |
|---|---|
| Distributed Microservices | Bắt buộc |
| Multi-Agent Orchestrator | Bắt buộc |
| 4 AI Coaches | Bắt buộc |
| FastAPI / Nginx API Gateway | Bắt buộc |
| WebSocket | Bắt buộc cho Real-time Audio |
| PostgreSQL | Bắt buộc |
| Redis | Bắt buộc |
| Session Memory | Bắt buộc |
| 5-layer Storage Strategy | Bắt buộc |
| Hot / Warm / Cold Storage | Bắt buộc |

---

# 14. Explicit Specification Gaps

## SPEC GAP 001 — Microservice Boundaries

Blueprint xác định kiến trúc Microservices nhưng chưa cung cấp danh sách đầy đủ từng Microservice, ownership và boundary của từng service.

`SPEC GAP: Ranh giới chính xác của từng Microservice chưa được Blueprint đặc tả.`

## SPEC GAP 002 — Internal IPC

Blueprint chưa đặc tả cơ chế giao tiếp nội bộ giữa các Microservices.

`SPEC GAP: Chưa xác định REST, gRPC, message queue hoặc cơ chế IPC nội bộ khác.`

Không tự chọn công nghệ.

## SPEC GAP 003 — Orchestrator-to-Coach Protocol

Blueprint xác định Multi-Agent Orchestrator và 4 AI Coaches nhưng chưa đặc tả protocol/message contract giữa Orchestrator và từng Coach.

`SPEC GAP: Chưa có đặc tả communication contract giữa Multi-Agent Orchestrator và các AI Coaches.`

## SPEC GAP 004 — WebSocket Internal Routing

Blueprint xác định:

`WS /api/v1/debates/{id}/stream`

nhưng chưa đặc tả cách WebSocket được route tới Microservice xử lý tương ứng.

`SPEC GAP: Chưa đặc tả WebSocket internal routing.`

## SPEC GAP 005 — AI Analysis Schema

Blueprint xác định AI Analysis là JSON nhưng chưa cung cấp JSON Schema đầy đủ.

`SPEC GAP: Chưa có schema/versioning chính thức cho AI Analysis JSON.`

## SPEC GAP 006 — Embedding Storage

Blueprint xác định Embedding:

`1536 dimensions`

nhưng chưa xác định hệ thống lưu trữ vector cụ thể.

`SPEC GAP: Chưa đặc tả công nghệ lưu trữ, index và query mechanism cho Embedding.`

## SPEC GAP 007 — Storage Migration

Blueprint xác định:

`Hot → Warm → Cold`

nhưng chưa đặc tả cơ chế tự động chuyển dữ liệu.

`SPEC GAP: Chưa đặc tả migration mechanism giữa các Storage Tiers.`

## SPEC GAP 008 — Redis Data Model

Blueprint xác định Redis dùng cho Session Context và thông tin tóm tắt lượt nói nhưng chưa đặc tả data model.

`SPEC GAP: Chưa đặc tả Redis key schema, TTL và persistence policy.`

## SPEC GAP 009 — Session Summarization Algorithm

Blueprint xác định:

    Background Summarizer
            ↓
    Logic Summary
            +
    5 recent turns

nhưng chưa đặc tả model, prompt, trigger hoặc schema của Summary.

`SPEC GAP: Chưa đặc tả implementation details của Background Summarizer.`

## SPEC GAP 010 — Frontend Architecture

Blueprint xác định Client/Web Application ở cấp sản phẩm và các API cần thiết nhưng không khóa framework frontend cụ thể trong Section 06 và Section 17.

`SPEC GAP: Chưa đặc tả frontend framework, frontend module boundaries và client-side state architecture.`

---

# 15. Prohibited Inferences

Tài liệu này không được tự động suy ra các thành phần sau khi Blueprint chưa quy định:

- Kubernetes
- Docker
- Kafka
- RabbitMQ
- gRPC
- GraphQL
- Vector Database cụ thể
- Cloud provider cụ thể
- CDN
- Service Mesh
- API management platform
- một framework frontend cụ thể

Việc một công nghệ có thể phù hợp về mặt kỹ thuật **không có nghĩa công nghệ đó được phép đưa vào kiến trúc**.

Mọi quyết định chưa được Blueprint hỗ trợ phải được đánh dấu:

`SPEC GAP`

---

# 16. Architecture Compliance Checklist

Trước khi một implementation được xem là phù hợp với Architecture Specification, phải kiểm tra:

- [ ] Hệ thống sử dụng Distributed Microservices.
- [ ] Không triển khai thành Monolith.
- [ ] Có Multi-Agent Orchestrator.
- [ ] Có Logic Coach.
- [ ] Có Voice Coach.
- [ ] Có Interaction Coach.
- [ ] Có Psychology Coach.
- [ ] API Gateway sử dụng FastAPI / Nginx theo Blueprint.
- [ ] Real-time Audio sử dụng WebSocket.
- [ ] Endpoint WebSocket là `/api/v1/debates/{id}/stream`.
- [ ] Relational Database là PostgreSQL.
- [ ] Redis được sử dụng cho Session Context / summary theo Blueprint.
- [ ] Session Memory sử dụng Background Summarizer.
- [ ] LLM context gồm Summary + 5 lượt gần nhất.
- [ ] Session data được phân tách thành 5 lớp.
- [ ] Audio sử dụng Opus 24kbps.
- [ ] Embedding có 1536 dimensions.
- [ ] Storage lifecycle có Hot / Warm / Cold.
- [ ] Không tự thêm công nghệ cho các phần đang là SPEC GAP.

---

# 17. Blueprint References

Tài liệu này được xây dựng và đối chiếu trực tiếp với:

## Primary References

### Section 06 — System Architecture

- Distributed Microservices
- Multi-Agent Orchestrator
- Session Memory
- Background Summarizer
- 5-layer Separated Storage Strategy

### Section 17 — Deployment Architecture

- FastAPI / Nginx API Gateway
- Real-time Audio WebSockets
- Redis
- Hot / Warm / Cold Storage
- Audio latency requirement

## Supporting References

### Section 09 — AI Coach Framework

- Logic Coach
- Voice Coach
- Interaction Coach
- Psychology Coach

### Section 07 — Database Design

- PostgreSQL Database

### Section 08 — API Specification

- WebSocket endpoint `/api/v1/debates/{id}/stream`

---

# 18. Document Status

    Architecture Model:        DEFINED
    System Style:              DISTRIBUTED MICROSERVICES
    AI Coordination:           MULTI-AGENT ORCHESTRATOR
    AI Coaches:                4
    API Gateway:               FASTAPI / NGINX
    Real-time Communication:   WEBSOCKET
    Relational Database:       POSTGRESQL
    Session Cache:             REDIS
    Session Memory:            REQUIRED
    Storage Strategy:          5-LAYER SEPARATED STORAGE
    Storage Lifecycle:         HOT / WARM / COLD

    Unspecified Decisions:     MUST BE MARKED SPEC GAP
    Unauthorized Inference:    PROHIBITED