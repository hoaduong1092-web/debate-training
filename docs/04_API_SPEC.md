# 04_API_SPEC — CHUẨN GIAO TIẾP RESTful API & JSON CONTRACTS
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Danh Mục Endpoints Chính (v15.0.0)

| Nhóm | Method | Đường dẫn | Chức năng | Yêu cầu Auth |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/send-otp` | Gửi mã OTP SMS qua E.164 | Không |
| **Auth** | `POST` | `/api/v1/auth/verify-otp` | Xác thực OTP, phát hành JWT & Session | Không |
| **Auth** | `GET` | `/api/v1/auth/me` | Lấy thông tin user hiện tại & quota | Có (Bearer) |
| **Arena** | `POST` | `/api/v1/arena/sessions` | Khởi tạo phiên tranh biện mới | Có (Bearer) |
| **Arena** | `POST` | `/api/v1/arena/sessions/:id/message` | Gửi lượt tranh biện & nhận phản hồi C-R-E | Có (Bearer) |
| **Arena** | `PUT` | `/api/v1/arena/sessions/:id/complete` | Kết thúc và khóa phiên tranh biện | Có (Bearer) |
| **Plans** | `GET` | `/api/v1/plans` | Danh mục gói cước động từ DB | Có (Bearer) |

---

## 2. Chuẩn Contract Phản Hồi C-R-E & AI Opponent

### `POST /api/v1/arena/sessions/:id/message`

**Request Payload:**
```json
{
  "userId": "22222222-2222-2222-2222-222222222222",
  "content": "AI không thể thay thế giáo viên vì giáo dục cần sự thấu cảm và truyền cảm hứng nhân văn.",
  "stance": "AFFIRMATIVE",
  "topic": "Trí tuệ nhân tạo sẽ thay thế giáo viên trong tương lai",
  "voiceMetrics": {
    "wpm": 142,
    "fillerCount": 1,
    "durationMs": 8500
  }
}
```

**Response Payload (Strict JSON):**
```json
{
  "success": true,
  "data": {
    "opponent_response": {
      "text": "Tuy nhiên, AI thế hệ mới có thể cá nhân hóa lộ trình học tập cho từng học sinh với độ kiên nhẫn vô hạn mà một giáo viên khó lòng đáp ứng cho cả lớp 40 học sinh.",
      "stance": "NEGATIVE"
    },
    "coach_feedback": {
      "score": 8.2,
      "cre_analysis": {
        "claim": "Khẳng định AI thiếu khả năng thấu cảm và truyền cảm hứng nhân văn.",
        "reasoning": "Lập luận chỉ ra vai trò đặc thù của người thầy trong phát triển tâm lý học sinh.",
        "evidence": "Cần bổ sung dẫn chứng từ các nghiên cứu tâm lý học giáo dục để tăng sức thuyết phục."
      },
      "fallacies_detected": [],
      "strengths": [
        "Định vị đúng trọng tâm giá trị nhân văn",
        "Luận điểm rõ ràng, lập trường kiên định"
      ],
      "weaknesses": [
        "Chưa so sánh tác động với năng lực cá nhân hóa của AI"
      ],
      "actionable_suggestions": [
        "Sử dụng thêm phương pháp So sánh Tác động (Impact Weighing) ở lượt tiếp theo"
      ]
    },
    "voice_telemetry": {
      "wpm": 142,
      "filler_count": 1,
      "pace_status": "OPTIMAL"
    }
  }
}
```