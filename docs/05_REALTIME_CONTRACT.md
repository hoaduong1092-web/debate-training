# 05_REALTIME_CONTRACT — ĐẶC TẢ GIAO THỨC WEBSOCKET & STREAMING
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Giao Thức WebSocket Real-Time

Mọi kết nối thời gian thực được định tuyến qua WebSocket Endpoint: `ws://localhost:3000/ws` hoặc `wss://api.thedebate.ai/ws`

### Header & Authentication:
- `Authorization: Bearer <JWT_TOKEN>`
- Query Param: `?sessionId=<SESSION_ID>&userId=<USER_ID>`

---

## 2. Danh Mục Sự Kiện WebSocket (Events Protocol)

| Tên Sự Kiện | Chiều gửi | Mục đích | Payload chính |
| :--- | :--- | :--- | :--- |
| `SESSION_REPLACED` | Server ➔ Client | Trục xuất phiên cũ khi phát hiện đăng nhập mới | `{ "reason": "NEW_LOGIN_DETECTED", "timestamp": "..." }` |
| `POI_REQUEST` | Client ➔ Server | Đề xuất xin chất vấn (POI) | `{ "turnNumber": 2, "timestamp": 120 }` |
| `POI_DECISION` | Server ➔ Client | Phản hồi chấp nhận/từ chối POI từ AI | `{ "status": "ACCEPTED", "durationLimit": 15 }` |
| `COACH_CHUNK` | Server ➔ Client | Truyền tải text streaming sub-300ms | `{ "delta": "Tuy nhiên...", "type": "opponent" }` |
| `DSP_METRICS` | Client ➔ Server | Đồng bộ telemetry âm học WPM | `{ "wpm": 145, "fillerCount": 2, "durationMs": 12000 }` |

---

## 3. Độ Trễ & Cơ Chế Chịu Lỗi (Sub-300ms Target)

- **Text Streaming:** Áp dụng Server-Sent Chunks qua WebSocket với độ trễ phản hồi ban đầu (TTFT) < 300ms.
- **Auto-reconnect:** Client tự động thử lại kết nối tối đa 5 lần với exponential backoff (1s, 2s, 4s, 8s, 16s).