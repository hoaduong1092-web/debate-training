# SỔ TAY ÁNH XẠ 25 CA KIỂM CHUẨN (CALIBRATION CASEBOOK v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-CASEBOOK-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/SCORING_FORMULA_CONTRACT_v1.md` (Mục 9) & `docs/SCORING_CONTRACT_FINAL_PRECALIBRATION_AUDIT.md`  
> **Mục Tiêu:** Định vị chính xác mục tiêu thu thập mẫu thực tế cho 25 kịch bản kiểm thử trong tập $N = 50$ bài phát biểu.  
> **Trạng Thái Thẩm Quyền:** 🟢 **CASEBOOK SPECIFICATION — APPROVED**

---

# 1. NGUYÊN TẮC QUẢN TRỊ THẨM QUYỀN TRONG CASEBOOK

> ### ⚠️ CẢNH BÁO TƯỜNG LỬA THẨM QUYỀN:
> 1. **Phân biệt Kịch bản Quy chuẩn vs Điểm số Chấp nhận:**
>    * **Kịch bản được phê duyệt (`Authorized Scenario`):** Là tình huống tranh biện có cơ sở văn bản từ Master Blueprint v16.
>    * **Khoảng điểm kiểm chuẩn (`Calibration Target Range`):** Là vùng điểm kỳ vọng phục vụ đối soát sai số, **TUYỆT ĐỐI KHÔNG PHẢI LÀ TIÊU CHUẨN NGHIỆM THU CỨNG (DETERMINISTIC ORACLE)**.
> 2. **Không Tạo Synthetic Ground Truth:** Mọi kịch bản trong Casebook phải được thu thập từ bài phát biểu của người thật, không dùng kịch bản dựng sẵn hay AI sinh mẫu.

---

# 2. BẢNG ÁNH XẠ CHI TIẾT 25 CA KIỂM CHUẨN VÀO TẬP MẪU N=50

| Case ID | Miền | Tên Kịch Bản & Đặc Trưng Sư Phạm | Phân Loại Thẩm Quyền | Trạng Thái Công Thức | Kỳ Vọng Đầu Ra Hệ Thống | Bản Chất Đầu Ra (Output Nature) | Mục Tiêu Phân Bổ Mẫu (Sample Target) |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **TC-01** | Content | Hoàn toàn không có dẫn chứng ($E=0$) | 🟢 AUTHORIZED | 🟢 FROZEN | $E_{\text{contrib}} = 0$ | 🟢 DETERMINISTIC GATE | `CAL-SPEECH-001`, `CAL-SPEECH-002` |
| **TC-02** | Content | Dẫn chứng 1★ nguồn yếu (Trải nghiệm cá nhân) | 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [6.0, 6.5]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-003`, `CAL-SPEECH-004` |
| **TC-03** | Content | Dẫn chứng 3★ chuẩn mực (Báo chí chính thống) | 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [7.5, 8.2]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-005`, `CAL-SPEECH-006` |
| **TC-04** | Content | Dẫn chứng 5★ xuất sắc (Nghiên cứu khoa học) | 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [9.0, 9.8]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-007`, `CAL-SPEECH-008` |
| **TC-05** | Content | Dẫn chứng 5★ nhưng Lạc đề hoàn toàn | 🟢 AUTHORIZED | 🟢 FROZEN | $E_{\text{contrib}} = 0$ | 🟢 DETERMINISTIC GATE | `CAL-SPEECH-009`, `CAL-SPEECH-010` |
| **TC-06** | Content | Dẫn chứng đúng nhưng chưa đủ bao quát | 🔵 PROPOSED | 🔵 CANDIDATE | Content $\in [6.8, 7.4]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-011`, `CAL-SPEECH-012` |
| **TC-07** | Content | Cấu trúc C-R-E Hoàn chỉnh, lập luận sâu | 🟢 AUTHORIZED | 🔷 CONFIRMED | Content $\in [9.5, 10.0]$| 🔴 CALIBRATION TARGET | `CAL-SPEECH-013`, `CAL-SPEECH-014` |
| **TC-08** | Content | Chỉ có Luận điểm (Claim only, thiếu Reason) | 🟢 AUTHORIZED | 🔷 CONFIRMED | Content $\le 3.0$ | 🟢 STRUCTURAL GATE | `CAL-SPEECH-015`, `CAL-SPEECH-016` |
| **TC-09** | Content | Claim + Reason đầy đủ nhưng thiếu Evidence | 🔷 DERIVED | 🔵 CANDIDATE | Content $\in [6.5, 7.2]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-017`, `CAL-SPEECH-018` |
| **TC-10** | Content | Đưa chuỗi dẫn chứng nhưng không giải thích | 🔵 PROPOSED | 🔵 CANDIDATE | Content $\in [3.5, 4.5]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-019`, `CAL-SPEECH-020` |
| **TC-11** | Content | Mắc 2 lỗi ngụy biện (Fallacy) | 🟢 AUTHORIZED | 🟢 FROZEN (Rule)| Trừ đúng $3.0$đ | 🟢 DETERMINISTIC PENALTY | `CAL-SPEECH-021`, `CAL-SPEECH-022` |
| **TC-12** | Content | Tiền đề tự mâu thuẫn trực tiếp (Contradiction)| 🟢 AUTHORIZED | 🟢 FROZEN | $\text{Logic} \le 3.0$ | 🟢 DETERMINISTIC HARD CAP | `CAL-SPEECH-023`, `CAL-SPEECH-024` |
| **TC-13** | Strategy| Bám sát Core Clash xuất sắc | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.8, 9.5]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-025`, `CAL-SPEECH-026` |
| **TC-14** | Strategy| Nói nhiều ý phụ, né tránh Core Clash | 🟢 AUTHORIZED | 🟢 FROZEN | $\text{Strategy} \le 3.0$ | 🟢 DETERMINISTIC HARD CAP | `CAL-SPEECH-027`, `CAL-SPEECH-028` |
| **TC-15** | Strategy| Phản biện trực diện luận điểm đối thủ | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.5, 9.2]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-029`, `CAL-SPEECH-030` |
| **TC-16** | Strategy| Đọc văn mẫu chuẩn bị sẵn (Scripted) | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [3.5, 4.5]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-031`, `CAL-SPEECH-032` |
| **TC-17** | Strategy| Phản xạ thích ứng linh hoạt trước bẫy tranh biện| 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.5, 9.2]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-033`, `CAL-SPEECH-034` |
| **TC-18** | Strategy| Xử lý POI $\le 15$s sắc bén, đúng quy định | 🟢 AUTHORIZED | 🟢 FROZEN | POI Gate Passed | 🟢 DETERMINISTIC GATE | `CAL-SPEECH-035`, `CAL-SPEECH-036` |
| **TC-19** | Strategy| Phân bổ thời lượng chuẩn theo tầm quan trọng | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [8.5, 9.5]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-037`, `CAL-SPEECH-038` |
| **TC-20** | Strategy| Cháy giáo án / Phân bổ thời lượng lệch nặng | 🔵 PROPOSED | 🔵 CANDIDATE | Strategy $\in [4.0, 5.0]$ | 🔴 CALIBRATION TARGET | `CAL-SPEECH-039`, `CAL-SPEECH-040` |
| **TC-21** | Style | Tốc độ phát biểu quá chậm ($<100$ WPM) | 🟢 AUTHORIZED | 🟢 FROZEN | Xếp vùng SLOW | 🟢 DETERMINISTIC ZONE | `CAL-SPEECH-041`, `CAL-SPEECH-042` |
| **TC-22** | Style | Tốc độ phát biểu tối ưu ($120 - 150$ WPM) | 🟢 AUTHORIZED | 🟢 FROZEN | Xếp vùng OPTIMAL | 🟢 DETERMINISTIC ZONE | `CAL-SPEECH-043`, `CAL-SPEECH-044` |
| **TC-23** | Style | Hội chứng Máy xay gió (Windmiller: $>170$ WPM, $<10\%$ Pause) | 🟢 AUTHORIZED | 🟢 FROZEN Trig | Trigger Phạt Pace | 🔴 CALIBRATION CURVE | `CAL-SPEECH-045`, `CAL-SPEECH-046` |
| **TC-24** | Style | Lạm dụng từ đệm dày đặc ($>4$ từ/phút) | 🔵 PROPOSED | 🔵 CANDIDATE | Phân tầng $F_3$ | 🔴 CALIBRATION CURVE | `CAL-SPEECH-047`, `CAL-SPEECH-048` |
| **TC-25** | Style | Giọng Nghệ An chuẩn phát âm và ngắt nghỉ | 🟢 AUTHORIZED | 🟢 FROZEN Pol | $\text{Style} \ge 8.5$ | 🟢 FAIRNESS BENCHMARK | `CAL-SPEECH-049`, `CAL-SPEECH-050` |

---

# 3. HƯỚNG DẪN THU THẬP VÀ ĐỐI SOÁT MẪU

1. **Nguyên tắc ghép mẫu đa thuộc tính:** Mỗi bài phát biểu thực tế có thể đại diện cho nhiều hơn một ca kiểm thử (ví dụ: một bài vừa có dẫn chứng 3★ vừa có tốc độ 135 WPM), nhưng mỗi kịch bản kiểm thử trong 25 ca bắt buộc phải có ít nhất **2 bài phát biểu thực tế đại diện độc lập**.
2. **Xác nhận không giả định:** Toàn bộ 50 mã mẫu `CAL-SPEECH-001` đến `CAL-SPEECH-050` trong bảng trên đang ở trạng thái **`PENDING ACQUISITION`** (Chờ thu thập thực tế).
