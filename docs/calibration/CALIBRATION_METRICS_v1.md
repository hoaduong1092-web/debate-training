# ĐẶC TẢ CÁC CHỈ SỐ TOÁN HỌC ĐO LƯỜNG KIỂM CHUẨN (CALIBRATION METRICS SPECIFICATION v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-METRICS-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/SCORING_FORMULA_CONTRACT_v1.md` & `docs/calibration/CALIBRATION_PROTOCOL_v1.md`  
> **Trạng Thái Quản Trị:** 🔷 **CONFIRMED ANALYTICAL METRICS SPECIFICATION**  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. NGUYÊN TẮC QUẢN TRỊ VỀ CHỈ SỐ THỐNG KÊ

> ### ⚠️ CẢNH BÁO THẨM QUYỀN VỀ NGƯỠNG THỐNG KÊ (NO INVENTED THRESHOLDS):
> * Các công thức toán học dưới đây là **Công Cụ Đo Lường Phân Tích (Analytical Metrics)** được công nhận chuẩn mực trong khoa học đo lường tâm lý học (*Psychometrics*) và kiểm chuẩn AI.
> * Tuyệt đối **KHÔNG TỰ Ý PHÁT MINH CÁC NGƯỠNG NGHIỆM THU CỨNG** (ví dụ: cấm tự ý tuyên bố "$MAE \le 0.5$ là bắt buộc để Freeze" khi Blueprint v16 chưa quy định). Mọi ngưỡng dung sai sai số cụ thể thuộc thẩm quyền phê duyệt của Product Owner cùng Hội đồng Chuyên môn.

---

# 2. CÁC CHỈ SỐ ĐO LƯỜNG ĐỘ ĐỒNG THUẬN GIỮA CÁC GIÁM KHẢO (INTER-RATER RELIABILITY)

### 2.1. Hệ Số Tương Quan Nội Nhóm (Intraclass Correlation Coefficient — ICC)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Đo lường mức độ đồng thuận tuyệt đối giữa 3 giám khảo chấm độc lập trên thang điểm liên tục.
* **Mô hình toán học:** $ICC(2, k)$ (Two-way random effects, absolute agreement, average measures):
  $$ICC(2, k) = \frac{MS_R - MS_E}{MS_R + \frac{MS_C - MS_E}{n}}$$
  * Trong đó: $MS_R$ là bình phương trung bình giữa các bài nói (Row), $MS_C$ là bình phương trung bình giữa các giám khảo (Column), $MS_E$ là bình phương trung bình sai số (Error), $n$ là số bài nói ($50$).

### 2.2. Hệ Số Đồng Thuận Phân Tầng (Fleiss' Kappa / Cohen's Kappa)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Đánh giá mức độ đồng thuận giữa các giám khảo đối với các nhãn phân loại rời rạc (ví dụ: Nhãn mức độ dẫn chứng 1★-5★, Nhãn lỗi ngụy biện, Nhãn Windmiller).
  $$\kappa = \frac{\bar{P} - \bar{P}_e}{1 - \bar{P}_e}$$

---

# 3. CÁC CHỈ SỐ ĐO LƯỜNG SAI SỐ GIỮA MÔ HÌNH VÀ CON NGƯỜI (MODEL VS HUMAN ERROR)

### 3.1. Sai Số Tuyệt Đối Trung Bình (Mean Absolute Error — MAE)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Đo khoảng cách điểm trung bình giữa Candidate Formula ($Y_i$) và Human Ground Truth ($X_i$) trên thang $[0.0, 10.0]$:
  $$MAE = \frac{1}{N} \sum_{i=1}^{N} |Y_i - X_i|$$

### 3.2. Sai Số Trung Vị Tuyệt Đối (Median Absolute Error — MedAE)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Đo khoảng cách điểm trung vị nhằm loại trừ ảnh hưởng của các điểm dị biệt ngoại lai (*Outliers*):
  $$MedAE = \text{median}(|Y_1 - X_1|, |Y_2 - X_2|, \dots, |Y_N - X_N|)$$

### 3.3. Căn Bậc Hai Sai Số Toàn Phương Trung Bình (Root Mean Square Error — RMSE)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Đánh giá độ nhạy cảm của mô hình đối với các sai số lớn:
  $$RMSE = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (Y_i - X_i)^2}$$

### 3.4. Độ Lệch Hệ Thống (Mean Signed Difference / Systematic Bias)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Xác định xem Candidate Formula có xu hướng chấm "quá hào phóng" ($Bias > 0$) hay "quá khắt khe" ($Bias < 0$) so với trọng tài con người:
  $$\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} (Y_i - X_i)$$

---

# 4. CÁC CHỈ SỐ TƯƠNG QUAN VÀ THỨ HẠNG (CORRELATION & RANKING METRICS)

### 4.1. Hệ Số Tương Quan Tuyến Tính Pearson ($r$)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Đo lường độ đồng biến tuyến tính giữa điểm AI và điểm Người:
  $$r = \frac{\sum (X_i - \bar{X})(Y_i - \bar{Y})}{\sqrt{\sum (X_i - \bar{X})^2 \sum (Y_i - \bar{Y})^2}}$$

### 4.2. Hệ Số Tương Quan Thứ Hạng Spearman ($\rho$)
* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Đo lường mức độ bảo toàn thứ tự xếp hạng thí sinh (Liệu AI có xếp đúng thứ hạng người nói từ giỏi nhất đến yếu nhất giống như trọng tài WSDC hay không):
  $$\rho = 1 - \frac{6 \sum d_i^2}{N(N^2 - 1)}$$
  * Trong đó: $d_i = \text{rank}(X_i) - \text{rank}(Y_i)$ là độ lệch thứ hạng của bài nói thứ $i$.

---

# 5. CHỈ SỐ KIỂM TOÁN CÔNG BẰNG VÙNG MIỀN (REGIONAL FAIRNESS METRIC)

* **Phân loại:** 🔷 `CONFIRMED ANALYTICAL METRIC`
* **Mục đích:** Kiểm toán độ chênh lệch sai số giữa các nhóm giọng vùng miền để đảm bảo không có sự phân biệt đối xử địa phương trong công thức Style:
  $$\Delta MAE_{\text{Regional}} = \max(MAE_{\text{Bắc}}, MAE_{\text{Trung}}, MAE_{\text{Nam}}) - \min(MAE_{\text{Bắc}}, MAE_{\text{Trung}}, MAE_{\text{Nam}})$$
  * **Quy chuẩn quản trị:** Giá trị $\Delta MAE_{\text{Regional}}$ càng tiệm cận $0$ càng chứng minh tính công bằng hoàn hảo của hệ thống.
