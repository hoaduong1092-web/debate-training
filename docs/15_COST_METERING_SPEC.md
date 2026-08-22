# 15_COST_METERING_SPEC — ĐO LƯỜNG CHI PHÍ TOKEN & TELEMETRY
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Cơ Chế Telemetry Đo Lường Token Theo Từng Turn

Hệ thống ghi nhận chính xác lượng Input Token và Output Token cho từng lượt gọi LLM để tính toán chi phí vận hành:

```json
{
  "sessionId": "deb_sess_178720",
  "turnNumber": 1,
  "model": "gemini-2.5-flash",
  "usage": {
    "promptTokens": 450,
    "completionTokens": 380,
    "totalTokens": 830
  },
  "costUsd": 0.00012,
  "latencyMs": 850
}
```

---

## 2. Ngưỡng Cảnh Báo & Tối Ưu Hóa Chi Phí (Cost Control Gates)

1. **Max Token Cap:** Giới hạn `max_tokens` ở mức 600 cho Opponent và 500 cho Logic Coach.
2. **Short-Circuit Empty Turns:** Nếu người học gửi nội dung rỗng hoặc không có ý nghĩa tranh biện, hệ thống từ chối ngay tại tầng Validation, không gọi LLM để tránh hao phí token.
3. **Daily Budget Alert:** Cảnh báo tự động nếu tổng chi phí token trong ngày của toàn hệ thống vượt ngưỡng định mức (Threshold Alert).