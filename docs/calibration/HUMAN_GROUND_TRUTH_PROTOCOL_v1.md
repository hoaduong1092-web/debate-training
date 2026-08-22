# QUY TRÌNH THIẾT LẬP HUMAN GROUND TRUTH v1 (HUMAN GROUND TRUTH PROTOCOL v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-HGTP-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/CALIBRATION_PROTOCOL_v1.md` & `docs/calibration/HUMAN_JUDGE_RUBRIC_v1.md`  
> **Trạng Thái Quản Trị:** 🟢 **PROTOCOL SPECIFICATION — APPROVED**  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. QUY CHUẨN ĐỘC LẬP VÀ BẢO MẬT ĐIỂM SỐ (INDEPENDENCE & BLIND SCORING)

1. **Phân Quyền Chấm Điểm Độc Lập:**
   * Mỗi giám khảo (Judge A, Judge B, Judge C) được cấp một tài khoản riêng biệt trên hệ thống thu thập điểm kiểm chuẩn.
   * Giám khảo không thể xem danh tính thật của học sinh, trường học, hay điểm số do 2 giám khảo còn lại chấm.
2. **Cách Ly Tuyệt Đối Khỏi AI Scoring Engine:**
   * Giao diện chấm điểm của Giám khảo chỉ hiển thị duy nhất: Tệp phát âm thanh (Audio Player), Văn bản ghi âm (Transcript), Đề tài (Motion) và Vai trò người nói.
   * Toàn bộ các trường dữ liệu AI như WPM, Pause Ratio, Logic score, CRE analysis, và Candidate Formula scores bị chặn truy cập ở tầng mạng (*Network-level Data Sanitization*).

---

# 2. QUY TRÌNH XỬ LÝ BẤT ĐỒNG & HỘI NGHỊ PHÂN XỬ (DISAGREEMENT & ADJUDICATION)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ TÌNH HUỐNG 1: ĐỒNG THUẬN CAO (Delta <= 1.0 điểm giữa cả 3 giám khảo)       │
│ • Không cần họp hội đồng.                                                  │
│ • Ground Truth = Điểm Trung bình cộng của 3 Giám khảo: (J_A + J_B + J_C)/3.│
├────────────────────────────────────────────────────────────────────────────┤
│ TÌNH HUỐNG 2: BẤT ĐỒNG VỪA PHẢI (1.0 < Delta <= 1.5 điểm)                  │
│ • Hệ thống tự động gửi thông báo kiểm tra lại cho giám khảo có điểm lệch.  │
│ • Nếu các giám khảo giữ nguyên quan điểm: Ground Truth = Điểm Trung vị     │
│   (Median) của 3 giám khảo.                                                │
├────────────────────────────────────────────────────────────────────────────┤
│ TÌNH HUỐNG 3: BẤT ĐỒNG LỚN (Delta > 1.5 điểm giữa 2 giám khảo bất kỳ)      │
│ • Kích hoạt HỘI NGHỊ TRỌNG TÀI PHÂN XỬ (Adjudication Conference).          │
│ • Trưởng ban Giám khảo (Chief Adjudicator) chủ trì phiên thảo luận 15 phút.│
│ • Cho phép giám khảo điều chỉnh điểm nếu nhận ra lỗi bỏ sót lập luận.      │
│ • Nếu vẫn không đạt đồng thuận: Lấy Trung vị và gán cờ HIGH_VARIANCE.      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. QUY TRÌNH XỬ LÝ SỰ CỐ DỮ LIỆU & NHÂN SỰ (CONTINGENCY PROTOCOLS)

### 3.1. Xử Lý Mẫu Chấm Bị Thiếu / Chậm Trễ (Missing Annotation):
* Mỗi giám khảo có tối đa $72$ giờ để hoàn thành việc chấm một đợt 10 bài.
* Nếu sau 72 giờ giám khảo chưa nộp phiếu chấm, hệ thống tự động khóa phiên và chuyển giao bài cho Giám khảo Dự phòng (*Reserve Judge*).

### 3.2. Xử Lý Mẫu Không Hợp Lệ (Invalid Sample Disqualification):
* Nếu trong quá trình nghe, có ít nhất $2/3$ giám khảo đánh dấu tệp âm thanh bị lỗi kỹ thuật (tiếng ồn quá lớn không nghe rõ, bài nói bị cắt cụt, hoặc người nói bỏ cuộc giữa chừng):
  * Mẫu sẽ bị gắn nhãn `DISQUALIFIED_TECHNICAL_FAILURE`.
  * Ban Điều hành thu thập mẫu thay thế tương đương từ kho lưu trữ dự phòng.

### 3.3. Xử Lý Giám Khảo Rút Lui (Judge Withdrawal):
* Nếu một giám khảo rút lui giữa chừng:
  * Toàn bộ các bài chấm chưa hoàn thành của giám khảo đó sẽ bị hủy bỏ.
  * Giám khảo Dự phòng sẽ chấm lại toàn bộ các bài bị thiếu từ đầu nhằm đảm bảo tính nhất quán của phong cách chấm.

---

# 4. NHẬT KÝ TRUY VẾT & NIÊM PHONG GROUND TRUTH (AUDIT TRAIL & FREEZING)

1. **Niêm Phong Ground Truth Dataset:**
   * Sau khi toàn bộ 50 bài phát biểu đã có đủ 3 phiếu chấm hợp lệ và đã qua phân xử, tệp dữ liệu Human Ground Truth sẽ được xuất thành định dạng JSON không thể sửa đổi (*Immutable*).
   * Tạo mã băm SHA-256 niêm phong: `sha256_ground_truth_master`.
2. **Ký Duyệt Bàn Giao:**
   * Cả 3 Giám khảo và Trưởng ban Giám khảo ký biên bản bàn giao điện tử xác nhận tính trung thực của tập dữ liệu.
