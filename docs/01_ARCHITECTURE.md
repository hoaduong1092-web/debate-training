# 01_ARCHITECTURE — KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ LÕI
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Mô Hình Kiến Trúc: Logical Microservices trên nền Modular Monolith

Hệ thống triển khai theo mô hình **Modular Monolith** viết bằng TypeScript (Node.js / Express + Prisma ORM) nhằm tối ưu hiệu năng I/O, thời gian khởi động, chia sẻ bộ nhớ phiên, và giảm thiểu độ phức tạp vận hành so với phân tán microservices vật lý:

```mermaid
graph TD
    Client[Web & Mobile Client (React + Tailwind)] -->|HTTPS / WSS| Gateway[Reverse Proxy / SSL Termination]
    Gateway --> App[Node.js Express TypeScript App Shell]

    subgraph "Logical Core Domains (In-Process Modules)"
        Auth[Auth Domain: Phone E.164 + Session Eviction]
        Quota[Quota & Billing: Atomic Transactions]
        Arena[Arena Engine: Rule State Machine + POI Safety]
        DSP[Audio DSP Engine: Deterministic WPM & Fillers]
        Coach[Logic Coach: Structured C-R-E Prompt Contract]
        Assistant[Deep Prep Assistant Room]
        Plaza[Plaza Feed (MVP Reserved)]
    end

    App --> Auth
    App --> Quota
    App --> Arena
    App --> DSP
    App --> Coach
    App --> Assistant
    App --> Plaza

    Auth & Quota & Arena & Assistant & Plaza --> DB[(PostgreSQL + Prisma ORM)]
    App --> Cache[(In-Memory / Redis Session Registry)]
    Coach & Assistant --> LLMGateway[LLM Provider: Gemini 2.5 Flash / Pro]
```

---

## 2. Ngăn Xếp Công Nghệ Chuẩn Hóa (Technology Stack)

| Tầng | Công nghệ | Vai trò & Đặc tả kỹ thuật |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + Tailwind CSS | Cyber-Academic Dark Theme, Single App Shell, 2-Column Studio Grid, Web Audio API |
| **Backend Runtime** | Node.js (v20+) + TypeScript | Express REST API + WebSocket Server |
| **Database** | PostgreSQL (Supabase / Self-hosted) | Row-level Locking, UUID Primary Keys, Prisma ORM Client v6 |
| **Caching & Real-time** | In-Memory Registry + Redis Optional | Session ID Mapping, OTP HMAC-SHA256, WebSocket Connection Registry |
| **Audio Processing** | Web Audio API + Local DSP Pipeline | Deterministic Acoustic Telemetry (WPM, Silence, Fillers) |
| **AI LLM Engine** | Google Gemini (2.5 Flash / Pro) | Strict JSON Structured Output for Argumentation & C-R-E Diagnostics |

---

## 3. Quản Lý Phiên Làm Việc (Single Active Session & Gentle Eviction)

1. **Khởi tạo:** Khi người dùng xác thực thành công qua SMS OTP, Backend phát hành `jwt_token` và một `session_id` độc bản được lưu trong `SessionRegistry`.
2. **Kiểm tra va chạm:** Nếu phát hiện `user_id` đã có phiên đăng nhập trên thiết bị khác:
   - Phiên cũ bị đánh dấu hủy kích hoạt trong Registry.
   - Gửi WebSocket event `SESSION_REPLACED` tới kết nối cũ.
   - Client cũ hiển thị `GentleEvictionModal` ("Phiên làm việc đã thay đổi") và tự động dọn dẹp LocalStorage.
3. **Fail-safe API:** Mọi API yêu cầu xác thực (`/arena/*`, `/users/*`) kiểm tra song song JWT signature và tính hợp lệ của `sessionId` trong Registry.