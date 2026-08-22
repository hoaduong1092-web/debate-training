# 07_SCORING_SPEC — THUẬT TOÁN CHẤM ĐIỂM C-R-E & PHÁT HIỆN NGỤY BIỆN
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Ma Trận Chấm Điểm Thang 100 (C-R-E Scoring Matrix)

Điểm số tổng quát của mỗi lượt tranh biện được tính theo công thức:

$$\text{Score}_{\text{Total}} = 0.35 \times \text{Claim} + 0.40 \times \text{Reasoning} + 0.25 \times \text{Evidence} - \text{FallacyPenalty}$$

| Thành phần | Trọng số | Tiêu chuẩn đánh giá | Thang điểm |
| :--- | :--- | :--- | :--- |
| **Claim (Luận điểm)** | 35% | Tính định vị lập trường, rõ ràng, không mâu thuẫn | 0 - 35 |
| **Reasoning (Lập luận)** | 40% | Tính liên kết nhân quả, chiều sâu giải thích giả định | 0 - 40 |
| **Evidence (Dẫn chứng)** | 25% | Độ xác thực của số liệu, ví dụ tương đương, tính cập nhật | 0 - 25 |
| **Trừ điểm Ngụy biện** | - | Trừ từ 5 đến 10 điểm cho mỗi lỗi ngụy biện phát hiện | -5 đến -20 |

---

## 2. Hệ Thống Nhận Diện Lỗi Ngụy Biện (Fallacy Detection Engine)

Engine tích hợp bộ lọc nhận diện 12 lỗi ngụy biện phổ biến trong tranh biện:

1. **Strawman (Người rơm):** Bóp méo luận điểm của đối phương để dễ dàng công kích.
2. **Ad Hominem (Công kích cá nhân):** Tấn công người nói thay vì phản biện lập luận.
3. **Slippery Slope (Dốc đứng trơn trượt):** Tự ý suy diễn chuỗi hậu quả tiêu cực không có căn cứ.
4. **False Dilemma (Nhị nguyên sai lầm):** Ép tình huống vào hai thái cực độc tôn.
5. **Appeal to Emotion (Lợi dụng cảm xúc):** Dùng cảm xúc thay cho logic chứng minh.
6. **Circular Reasoning (Lập luận vòng vo):** Lấy kết luận làm tiền đề chứng minh.