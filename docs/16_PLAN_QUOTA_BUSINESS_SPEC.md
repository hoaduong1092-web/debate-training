# 16_PLAN_QUOTA_BUSINESS_SPEC — ĐẶC TẢ GÓI CƯỚC & HẠN MỨC ĐỘNG
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Nguyên Tắc Cấu Hình Động (Configurable Pricing)

Giá tiền và hạn mức của các gói cước **KHÔNG được hardcode** trong Business Logic của Arena Engine. Tất cả được nạp động từ bảng `subscription_plans`:

| Mã Gói | Tên Hiển Thị | Giá Niêm Yết | Quota Text | Quota Voice | Quota Trợ Lý |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PLAN_BASIC_49K` | Gói Cơ Bản (Khám Phá) | 49.000 VNĐ / tháng | 30 lượt | 15 phút | 10 câu hỏi |
| `PLAN_STD_129K` | Gói Tiêu Chuẩn (Rèn Luyện) | 129.000 VNĐ / tháng | 100 lượt | 60 phút | 50 câu hỏi |
| `PLAN_PRO_399K` | Gói Cao Cấp (Bứt Phá) | 399.000 VNĐ / tháng | 500 lượt | 300 phút | 200 câu hỏi |

---

## 2. Kiểm Soát Quota 3 Chiều Độc Lập

Mỗi tài khoản sở hữu 3 ví hạn mức tách biệt trong `user_quotas`:
1. `text_turns_remaining`: Số lượt tranh biện bằng văn bản.
2. `voice_mins_remaining`: Thời lượng tranh biện thoại (tính theo phút).
3. `assistant_remaining`: Số lượt yêu cầu cố vấn sâu trong Prep Room.

---

## 3. Giao Dịch Nguyên Tử (Atomic Transactions - Fail-Closed)

```sql
-- Trừ 1 lượt text với Row-Level Lock
UPDATE user_quotas
SET text_turns_remaining = text_turns_remaining - 1,
    updated_at = NOW()
WHERE user_id = $1 AND text_turns_remaining > 0
RETURNING text_turns_remaining;
```

Nếu số dư còn lại bằng 0 hoặc giao dịch gặp lỗi kết nối, hệ thống từ chối yêu cầu ngay lập tức với mã lỗi `INSUFFICIENT_QUOTA` mà không kích hoạt gọi AI.