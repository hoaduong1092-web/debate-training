# 11_DEPLOYMENT_SPEC — KIẾN TRÚC TRIỂN KHAI & DOCKER INFRASTRUCTURE
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Kiến Trúc Máy Chủ Đơn Tối Ưu (Single-Node High-Density)

Nhằm tối ưu chi phí vận hành giai đoạn P0-P1, hệ thống đóng gói toàn bộ dịch vụ trong môi trường Docker Compose đa container:

```mermaid
graph TD
    Internet((Người Dùng)) -->|Cổng 80/443| Nginx[Nginx Reverse Proxy / SSL Termination]
    Nginx -->|Proxy Pass| Frontend[Frontend Container: Nginx Static Server]
    Nginx -->|API / WSS| Backend[Backend Container: Node.js v20 Express App]

    Backend --> Postgres[(PostgreSQL 16 Container)]
    Backend --> Redis[(Redis 7 Cache Container)]
```

---

## 2. Docker Compose Specification

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:secret@postgres:5432/debate_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your_super_jwt_secret_key
      - GEMINI_API_KEY=your_gemini_api_key
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    restart: always

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: debate_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    restart: always

volumes:
  pgdata:
  redisdata:
```
