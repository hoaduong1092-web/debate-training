# HƯỚNG DẪN KỸ THUẬT CHẤM ĐIỂM MÙ DÀNH CHO GIÁM KHẢO (BLIND SCORING GUIDE v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `GUI-CAL-BLIND-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/HUMAN_GROUND_TRUTH_PROTOCOL_v1.md`  
> **Mục Đích:** Hướng dẫn chi tiết các thao tác kỹ thuật và nguyên tắc trong từng phiên chấm điểm bài nói.

---

# 1. NGUYÊN TẮC THAO TÁC TRONG PHIÊN CHẤM MÙ

1. **Môi Trường Chấm:**
   * Sử dụng tai nghe chụp tai chất lượng tốt (*Over-ear Headphones*) trong không gian yên tĩnh.
   * Đăng nhập cổng Web Portal chấm mù bằng tài khoản cá nhân được cấp (`JUDGE-WSDC-XX`).
2. **Quy Trình Nghe & Đọc (Listening & Review Protocol):**
   * **Lần nghe 1 (Toàn diện):** Nghe trọn vẹn bài phát biểu từ đầu đến cuối không dừng để nắm bắt dòng suy nghĩ, cấu trúc luận điểm chính và cảm nhận phong cách truyền đạt.
   * **Lần nghe 2 (Chi tiết & Đối soát):** Vừa nghe vừa đối chiếu bản transcript để phát hiện các lỗi logic, ngụy biện, mâu thuẫn tiền đề hoặc việc bỏ qua Core Clash.
   * **Định hình điểm số & Ghi nhận xét:** Điền điểm số 3 miền và trích dẫn các câu nói then chốt làm minh chứng.

---

# 2. QUY ĐỊNH VỀ THANG ĐIỂM VÀ LÀM TRÒN

* **Thang điểm chấm:** Chấm trên thang $[0.0, 10.0]$ cho từng miền (Content, Strategy, Style).
* **Độ chính xác bước điểm:** Bước nhảy $0.1$ điểm (ví dụ: $7.2, 7.3, 8.5$). Không dùng các phân số lẻ ngoài bước 0.1.
* **Điểm tổng hợp:** Điểm tổng hợp được tự động tính theo công thức:
  $$\text{Score}_{\text{Total}} = 0.40 \times \text{Content} + 0.20 \times \text{Strategy} + 0.40 \times \text{Style}$$
  *Làm tròn 1 chữ số thập phân (`toFixed(1)`).*

---

# 3. NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG LÀM TRONG KHI CHẤM

- ❌ **KHÔNG** tìm kiếm thông tin về thí sinh hoặc đề tài trên Internet trong khi chấm để tránh thiên kiến.
- ❌ **KHÔNG** chụp ảnh màn hình bài chấm gửi cho giám khảo khác hoặc đăng tải công khai.
- ❌ **KHÔNG** cố tình chấm điểm "dồn về mức trung bình" (ví dụ: bài nào cũng cho 7.0) nếu chất lượng bài nói thực tế quá xuất sắc hoặc quá yếu kém.
- ❌ **KHÔNG** để điểm phong cách (Style) bị chi phối bởi việc bài nói có giọng địa phương miền Trung hay miền Nam.
