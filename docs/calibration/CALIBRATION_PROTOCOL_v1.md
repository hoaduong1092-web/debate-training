# QUY TRÌNH KIỂM CHUẨN ĐIỂM SỐ v1 (CALIBRATION PROTOCOL v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-PROTO-v1.0.0`  
> **Source of Truth Thẩm Quyền:** Master Blueprint v16.x & `docs/SCORING_FORMULA_CONTRACT_v1.md`  
> **Trạng Thái Quản Trị:** 🟡 **CALIBRATION PROTOCOL SPECIFICATION — APPROVED DRAFT**  
> **Áp Dụng Cho:** Đợt kiểm chuẩn tập mẫu thực tế $N = 50$ bài phát biểu & Hội đồng 3 Giám khảo WSDC Độc lập  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. MỤC TIÊU VÀ PHẠM VI KIỂM CHUẨN (OBJECTIVES & SCOPE)

### 1.1. Mục Tiêu Cốt Lõi:
1. **Thiết lập Human Ground Truth Độc Lập:** Thu thập điểm số và nhận xét định tính từ 3 giám khảo tranh biện con người độc lập đạt chuẩn WSDC đối với $N = 50$ bài phát biểu tranh biện thực tế của học sinh Việt Nam.
2. **Đánh Giá & Tinh Chỉnh Candidate Scoring Formulas:** So sánh đầu ra của 9 công thức ứng viên ($C_{\text{raw}}, S, Style, E_{\text{quality}}, R, Prosody, \dots$) với điểm số của trọng tài con người nhằm xác định độ lệch, sai số hệ thống (*Systematic Bias*), và kiểm tra tính công bằng vùng miền (*Regional Fairness*).
3. **Chuẩn Bị Điều Kiện Cho Formula Promotion:** Cung cấp đầy đủ bằng chứng thực nghiệm (**Calibration Evidence**) làm căn cứ để Product / Domain Owner xem xét phê duyệt chuyển trạng thái công thức từ `CANDIDATE` sang `FROZEN`.

### 1.2. Hàng Rào Thẩm Quyền Bất Biến:
* **`INVARIANT-SCORE-01 (No Implicit Promotion)`:** Quy trình này KHÔNG tự động biến Candidate thành Frozen.
* **`INVARIANT-SCORE-02 (No Synthetic Ground Truth)`:** Nghiêm cấm sử dụng dữ liệu AI tự tạo hay kết quả Unit Test làm Ground Truth.

---

# 2. ĐỊNH NGHĨA QUẦN THỂ & TIÊU CHUẨN MẪU (POPULATION & CRITERIA)

### 2.1. Quần Thể Mục Tiêu (Target Population):
Học sinh, sinh viên Việt Nam (độ tuổi 12–22) tham gia tranh biện theo định dạng WSDC (World Schools Debating Championships) hoặc AP/BP (Asian Parliamentary / British Parliamentary) bằng Tiếng Việt hoặc Song ngữ, bao gồm cả hình thức Text Debate và Voice Debate.

### 2.2. Tiêu Chuẩn Lựa Chọn (Inclusion Criteria):
* Mẫu phát biểu có độ dài thực tế từ $60$ giây đến $480$ giây (1 đến 8 phút).
* Tệp âm thanh đạt chuẩn kỹ thuật: Tần số lấy mẫu $\ge 16\text{kHz}$, định dạng WAV/MP3/M4A không nén quá mức, tỷ lệ tín hiệu trên nhiễu (SNR) $\ge 15\text{dB}$.
* Bản gỡ băng (Transcript) đầy đủ, trung thực, có gắn nhãn dấu thời gian từ ngữ (*Word-level timestamps*).
* Đầy đủ thông tin kiến nghị (*Motion*), vai trò người nói (*Speaker Role: 1st/2nd/3rd/Reply*), và phe tham gia (*Affirmative / Negative*).
* Người nói (hoặc người giám hộ hợp pháp) đã ký văn bản đồng thuận tham gia nghiên cứu và ẩn danh hóa dữ liệu (*Informed Consent Form*).

### 2.3. Tiêu Chuẩn Loại Trừ (Exclusion Criteria):
* Tệp âm thanh bị méo tiếng nghiêm trọng, mất tiếng ngắt quãng $\ge 5$ giây, hoặc có tiếng người khác nói đè liên tục không thể tách kênh.
* Bài nói đọc lại hoàn toàn văn bản có bản quyền của bên thứ ba mà không có tính tranh biện tương tác.
* Bài nói vi phạm các chuẩn mực an toàn nội dung nghiêm trọng (thù ghét, bạo lực, công kích cá nhân ngoài khuôn khổ tranh biện).
* Dữ liệu giả lập bằng công cụ Text-to-Speech (TTS) hoặc sinh tự động bởi LLM.

---

# 3. CHIẾN LƯỢC PHÂN TẦNG LẤY MẪU (SAMPLING STRATEGY — N=50)

Tập mẫu $N = 50$ bài phát biểu thực tế được phân bổ theo ma trận 4 chiều:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PHÂN BỔ THEO HÌNH THỨC TRANH BIỆN:                                      │
│    • Voice Debate (Bản ghi âm thực tế):       35 mẫu (70%)                  │
│    • Text Debate (Bản phát biểu văn bản):     15 mẫu (30%)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. PHÂN BỔ THEO VÙNG MIỀN (GIỌNG NÓI):                                      │
│    • Giọng Miền Bắc (Hà Nội, Đông/Tây Bắc):   15 mẫu (30%)                  │
│    • Giọng Miền Trung (Nghệ An, Huế, ĐN):     17 mẫu (34% - Ưu tiên kiểm toán)│
│    • Giọng Miền Nam (TP.HCM, Tây Nam Bộ):     18 mẫu (36%)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. PHÂN BỔ THEO TRÌNH ĐỘ NGƯỜI NÓI:                                         │
│    • Novice / Beginner (Level 1 - Level 2):   15 mẫu (30%)                  │
│    • Intermediate (Level 3 - Level 4):        20 mẫu (40%)                  │
│    • Advanced / Competitive (Level 5 - L7):   15 mẫu (30%)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. PHÂN BỔ THEO ĐẶC ĐIỂM BIÊN (25 CALIBRATION CASES COVERAGE):              │
│    • Nhóm Nội dung (Dẫn chứng yếu, mạnh, lạc đề, ngụy biện, mâu thuẫn): 15 mẫu │
│    • Nhóm Chiến thuật (Né Core Clash, bám sát, đọc script, POI, time):  15 mẫu │
│    • Nhóm Phong cách (Nói chậm, tối ưu, máy xay gió, từ đệm, giọng vùng): 20 mẫu│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. QUY TRÌNH CHẤM ĐIỂM MÙ ĐỘC LẬP (BLIND ADJUDICATION PROTOCOL)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: ẨN DANH HÓA BÀI NÓI (Pseudonymization & ID Generation)             │
│         Mã hóa mẫu: SAMPLE-001 -> SAMPLE-050. Gỡ bỏ PII người nói.         │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 2: TÁCH BIỆT HỆ THỐNG ĐIỂM AI (Complete AI Score Isolation)           │
│         Giám khảo tuyệt đối KHÔNG ĐƯỢC THẤY điểm hoặc telemetry của AI.    │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 3: CHẤM ĐIỂM ĐỘC LẬP TỪNG GIÁM KHẢO (Independent Scoring)             │
│         Judge A, Judge B, Judge C chấm độc lập, không trao đổi.             │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 4: THU THẬP BIÊN BẢN CHẤM (Template Submission)                       │
│         Nộp phiếu chấm và phần giải trình định tính (Rationale).           │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 5: ĐỐI SOÁT ĐỘ ĐỒNG THUẬN (Inter-Rater Reliability Check)             │
│         Nếu chênh lệch giữa 2 giám khảo bất kỳ > 1.5/10.0 -> Kích hoạt     │
│         Hội nghị Trọng tài Phân xử (Adjudication Conference).              │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 6: TỔNG HỢP HUMAN GROUND TRUTH CHÍNH THỨC                            │
│         Xác lập điểm chuẩn con người cho từng chiều của 50 mẫu.            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

# 5. ĐỐI SOÁT ĐỘ ĐỒNG THUẬN VÀ PHÂN XỬ (INTER-RATER AGREEMENT & CONFLICTS)

1. **Chỉ số kiểm toán độ đồng thuận (Analytical Metrics):**
   * Sử dụng hệ số tương quan nội nhóm $ICC(2, k)$ (Two-way random effects, absolute agreement) và Fleiss' Kappa / Cohen's Kappa đối với các phân tầng nhãn rời rạc.
   * Tính toán sai số trung bình tuyệt đối giữa các giám khảo: $MAD_{\text{Judges}} = \frac{1}{3}\sum |J_i - J_j|$.
2. **Quy tắc phân xử khi có bất đồng lớn ($\Delta > 1.5$ điểm):**
   * Nếu có một giám khảo lệch $> 1.5$ điểm so với trung bình của 2 giám khảo còn lại, trưởng ban trọng tài (*Chief Adjudicator*) sẽ chủ trì phiên thảo luận kín.
   * Nếu không đạt được sự đồng thuận sau 15 phút, điểm Ground Truth sẽ được tính theo trung vị (*Median*) và mẫu sẽ được đánh dấu cờ `HIGH_VARIANCE_SAMPLE`.

---

# 6. QUY TRÌNH SO SÁNH MÔ HÌNH VỚI CON NGƯỜI (MODEL VS HUMAN EVALUATION)

Sau khi Human Ground Truth được xác lập độc lập và niêm phong, hệ thống sẽ thực hiện:
1. **Thực thi Scoring Engine ở chế độ quan sát (*Observer Mode*):** Chạy 50 mẫu qua DSP Telemetry, C-R-E Parser và 9 Candidate Formulas để thu được điểm $\text{CandidateScore}_i$.
2. **Đo lường sai số định lượng:**
   * Sai số tuyệt đối trung bình: $MAE = \frac{1}{50}\sum |\text{CandidateScore}_i - \text{HumanGroundTruth}_i|$.
   * Hệ số tương quan Pearson ($r$) và tương quan thứ hạng Spearman ($\rho$).
   * Kiểm toán sai số theo vùng miền: $\Delta MAE_{\text{North-Central-South}} = |MAE_{\text{Central}} - MAE_{\text{North}}|$.
3. **Phân tích sai số định tính (*Error Diagnosis*):** Đối soát các mẫu có sai số lớn nhất ($Top\ 5\ Outliers$) để tìm nguyên nhân: do trọng số Candidate Formula, do chất lượng ASR/DSP, hay do đặc trưng ngôn ngữ học.

---

# 7. QUYỀN RIÊNG TƯ, BẢO VỆ DỮ LIỆU & AUDIT TRAIL

* **Tuân thủ pháp lý:** Tuân thủ triệt để Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân tại Việt Nam và nguyên tắc đạo đức AI trong giáo dục.
* **Quy trình ẩn danh hóa:** Tất cả tệp âm thanh được gán mã ngẫu nhiên dạng `CAL-SPEECH-2026-XXXX`. Tên thật của học sinh, trường học, và địa chỉ được bóc tách hoàn toàn khỏi transcript và metadata công khai.
* **Nhật ký truy vết (Audit Trail):** Mọi hành động chấm điểm, tính toán, và sửa đổi trạng thái kiểm chuẩn đều được lưu log kèm dấu thời gian ISO 8601, SHA-256 checksum của tệp âm thanh và phiên bản `formula_version`.
