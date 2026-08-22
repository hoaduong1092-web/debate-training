# MẪU PHIẾU CHẤM ĐIỂM ĐỘC LẬP DÀNH CHO GIÁM KHẢO (JUDGE ANNOTATION TEMPLATE v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Biểu Mẫu:** `TMP-CAL-ANNOTATE-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/HUMAN_JUDGE_RUBRIC_v1.md`  
> **Quy Tắc Bắt Buộc:** Mỗi Giám khảo điền độc lập một phiếu riêng biệt cho từng bài nói. Không sao chép, không tham khảo điểm AI.

---

# BIỂU MẪU ĐÁNH GIÁ BÀI PHÁT BIỂU TRANH BIỆN (DEBATE SPEECH EVALUATION SHEET)

### PHẦN 1: THÔNG TIN MẪU & GIÁM KHẢO (SAMPLE & JUDGE METADATA)
* **Mã Bài Nói (Sample ID):** `CAL-SPEECH-2026-______`
* **Mã Giám Khảo (Judge ID):** `[ ] JUDGE-WSDC-01` | `[ ] JUDGE-WSDC-02` | `[ ] JUDGE-WSDC-03`
* **Thời Gian Bắt Đầu Chấm:** `____-__-__ __:__:__ (UTC+7)`
* **Thời Gian Nộp Phiếu:** `____-__-__ __:__:__ (UTC+7)`
* **Kiến Nghị (Motion):** ____________________________________________________________________
* **Phe & Vị Trí Người Nói:** `[ ] Ủng Hộ (Aff)` | `[ ] Phản Đối (Neg)` — `[ ] 1st` | `[ ] 2nd` | `[ ] 3rd` | `[ ] Reply`
* **Hình Thức:** `[ ] Voice Debate (Nghe bản ghi âm)` | `[ ] Text Debate (Đọc văn bản)`

---

### PHẦN 2: BẢNG ĐIỂM 3 MIỀN CHUYÊN MÔN (3-DOMAIN SCORES)

| Miền Đánh Giá (Domain) | Điểm Giám Khảo (Thang 0.0 - 10.0, bước 0.1) | Phân Loại Chuẩn | Ghi Nhận Hiện Diện Cấu Trúc / Hiện Tượng Đặc Biệt |
| :--- | :---: | :---: | :--- |
| **1. CONTENT (Nội dung & Lập luận)** | **`____ / 10.0`** | `[ ] Xuất sắc` `[ ] Tốt`<br>`[ ] Đạt yêu cầu`<br>`[ ] Yếu` `[ ] Rất yếu` | • Có C-R-E đầy đủ: `[ ] Có` `[ ] Không`<br>• Nguồn dẫn chứng: `[ ] 1★` `[ ] 3★` `[ ] 5★` `[ ] Không có`<br>• Mâu thuẫn Logic trực tiếp: `[ ] CÓ (Khóa trần <= 3.0)` `[ ] Không`<br>• Số lỗi ngụy biện phát hiện: `____ lỗi` |
| **2. STRATEGY (Chiến thuật & Phản xạ)** | **`____ / 10.0`** | `[ ] Xuất sắc` `[ ] Tốt`<br>`[ ] Đạt yêu cầu`<br>`[ ] Yếu` `[ ] Rất yếu` | • Bám sát Core Clash: `[ ] Trực diện` `[ ] Sơ sài` `[ ] Bỏ qua (Trần <= 3.0)`<br>• Phản biện đối thủ: `[ ] Sâu sắc` `[ ] Đọc văn mẫu (Scripted)`<br>• Xử lý POI: `[ ] Sắc bén (<=15s)` `[ ] Lúng túng` `[ ] Không có POI` |
| **3. STYLE (Phong cách & Giao tiếp)** | **`____ / 10.0`** | `[ ] Xuất sắc` `[ ] Tốt`<br>`[ ] Đạt yêu cầu`<br>`[ ] Yếu` `[ ] Rất yếu` | • Tốc độ nói: `[ ] Tối ưu (120-150)` `[ ] Quá chậm (<100)` `[ ] Quá nhanh (>170)`<br>• Ngắt nghỉ: `[ ] Hợp lý (10-25%)` `[ ] Máy xay gió (<10%)`<br>• Mật độ từ đệm: `[ ] Tự nhiên` `[ ] Dày đặc gây rối`<br>• Giọng vùng miền: `[ ] Bắc` `[ ] Trung` `[ ] Nam` |

$$\mathbf{ĐIỂM\ TỔNG\ HỢP\ (TỰ\ TÍNH):}\quad \text{Score}_{\text{Total}} = 0.40 \times \text{Content} + 0.20 \times \text{Strategy} + 0.40 \times \text{Style} = \mathbf{\_\_\_\_ / 10.0}$$

---

### PHẦN 3: GIẢI TRÌNH SƯ PHẠM ĐỊNH TÍNH (QUALITATIVE RATIONALE & EVIDENCE)

1. **Điểm mạnh cốt lõi của bài nói (Strengths):**  
   ____________________________________________________________________________________________________  
   ____________________________________________________________________________________________________

2. **Điểm yếu / Lỗi lập luận chính (Weaknesses & Logical Flaws):**  
   ____________________________________________________________________________________________________  
   ____________________________________________________________________________________________________

3. **Trích dẫn minh chứng từ bài nói (Quoted Evidence from Speech):**  
   * Dẫn chứng 1: "__________________________________________________________________________________"  
   * Dẫn chứng 2: "__________________________________________________________________________________"

---

### PHẦN 4: CAM KẾT & XÁC NHẬN CỦA GIÁM KHẢO (JUDGE DECLARATION)

* [x] **Xác nhận chấm mù:** Tôi xác nhận chấm điểm hoàn toàn độc lập, không nhìn thấy điểm số/đồ thị của AI và không trao đổi với giám khảo khác.
* [x] **Xác nhận công bằng vùng miền:** Tôi xác nhận KHÔNG trừ điểm người nói vì lý do giọng vùng miền/địa phương.
* **Mức độ tự tin của giám khảo đối với bài chấm này:** `[ ] Cao (High)` | `[ ] Trung bình (Medium)` | `[ ] Cần thảo luận hội đồng (Low)`

**Chữ ký điện tử của Giám khảo:** `__________________________________`  
**Mã băm SHA-256 xác thực phiếu:** `__________________________________`
