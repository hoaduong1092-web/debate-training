# CỔNG PHÊ DUYỆT NÂNG CẤP CÔNG THỨC CHẤM ĐIỂM (FORMULA PROMOTION GATE v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-GATE-v1.0.0`  
> **Source of Truth Thẩm Quyền:** Master Blueprint v16.x & `docs/SCORING_FORMULA_CONTRACT_v1.md` (Mục 2 & Mục 10)  
> **Trạng Thái Quản Trị:** 🟢 **PROMOTION GATE GOVERNANCE SPECIFICATION — APPROVED**  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. HÀNG RÀO PHÂN ĐỊNH THẨM QUYỀN NÂNG CẤP (PROMOTION AUTHORITY FIREWALL)

> ### 🛡️ BẤT BIẾN INVARIANT-SCORE-01 (NO IMPLICIT PROMOTION):
> Tuyệt đối **KHÔNG CÓ CƠ CHẾ TỰ ĐỘNG THĂNG CẤP**. Một công thức mang trạng thái `formula_status: CANDIDATE` chỉ được phép chuyển trạng thái thành `FROZEN` khi thỏa mãn **đồng thời 4 điều kiện tiên quyết bắt buộc (Prerequisites)**:
> 
> 1. ✅ **Bằng Chứng Thực Nghiệm (Empirical Calibration Evidence):** Có báo cáo kết quả kiểm chuẩn trên tập $N = 50$ bài nói thật và đối soát với 3 giám khảo WSDC.
> 2. ✅ **Đăng Ký Phiên Bản Chính Thức (Official `formula_version` Registration):** Được cấp mã định danh phiên bản sản xuất (ví dụ: `v16.1.0-frozen`).
> 3. ✅ **Phê Duyệt Bằng Văn Bản Của Chủ Sở Hữu (Written Product / Domain Owner Approval):** Có chữ ký phê duyệt chính thức của Product Owner.
> 4. ✅ **Bộ Kiểm Thử Hồi Quy (Regression Suite Execution):** Toàn bộ bộ test hồi quy tự động đạt $100\%$ PASS đối với các kịch bản biên quy chuẩn.

---

# 2. MA TRẬN 3 CẤP ĐỘ TIÊU CHÍ XÉT DUYỆT (3-TIER CRITERIA MATRIX)

Để bảo vệ Tường lửa Thẩm quyền, tài liệu phân định rạch ròi 3 nhóm tiêu chí:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ CẤP 1: BẮT BUỘC BỞI QUY CHUẨN THẨM QUYỀN (REQUIRED BY AUTHORITY)            │
│ • Hoàn thành đợt kiểm chuẩn 50 bài nói thực tế.                             │
│ • Có đầy đủ chữ ký bàn giao của Hội đồng 3 Giám khảo WSDC.                  │
│ • Tuân thủ tuyệt đối các Hard Cap: Logic <= 3.0, Strategy <= 3.0.           │
│ • Bảo toàn 100% chính sách Accent Fairness (Zero penalty cho giọng vùng miền)│
│ • Không phát sinh lỗi chia cho 0, NaN hoặc vi phạm biên [0, 100].           │
├─────────────────────────────────────────────────────────────────────────────┤
│ CẤP 2: TIÊU CHÍ ĐỀ XUẤT PHÂN TÍCH (PROPOSED CALIBRATION CRITERIA)           │
│ • Đề xuất: Sai số tuyệt đối trung bình toàn hệ thống: MAE <= 0.8 / 10.0.    │
│ • Đề xuất: Hệ số tương quan thứ hạng Spearman: rho >= 0.80.                 │
│ • Đề xuất: Hệ số đồng thuận giám khảo con người: ICC(2, k) >= 0.75.         │
│ • Đề xuất: Độ lệch sai số giữa các miền: Delta MAE_Regional <= 0.3 điểm.     │
│ ➔ LƯU Ý: Đây là tiêu chuẩn tham khảo kỹ thuật, KHÔNG PHẢI LUẬT CỨNG.        │
├─────────────────────────────────────────────────────────────────────────────┤
│ CẤP 3: QUYẾT ĐỊNH CỦA PRODUCT OWNER (PO DECISION REQUIRED)                  │
│ • Phê duyệt chấp thuận hoặc yêu cầu hiệu chỉnh trọng số Candidate.         │
│ • Ký quyết định ban hành văn bản Freeze chính thức.                         │
│ • Cho phép chuyển sang giai đoạn sửa mã nguồn (Code Remediation Phase).     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. QUY TRÌNH 5 BƯỚC THĂNG CẤP CÔNG THỨC (5-STEP PROMOTION WORKFLOW)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: XUẤT BÁO CÁO TỔNG HỢP KIỂM CHUẨN (Calibration Synthesis Report)   │
│         Tổng hợp dữ liệu sai số MAE, RMSE, Pearson r, Spearman rho của 9   │
│         Candidate Formulas trên tập 50 bài nói thực tế.                    │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 2: HỘI NGHỊ THẨM ĐỊNH KỸ THUẬT (Technical Review Panel)              │
│         Hội đồng Kỹ sư Chấm điểm & Trọng tài WSDC xem xét báo cáo sai số,  │
│         đánh giá các ca biên (Edge cases) và kiểm toán công bằng vùng miền.│
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 3: TRÌNH HỒ SƠ LÊN PRODUCT OWNER (Dossier Submission)                 │
│         Trình hồ sơ gồm: Báo cáo kiểm chuẩn, Bảng tham số đề xuất Freeze,  │
│         và Biên bản đánh giá rủi ro sư phạm.                               │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 4: PRODUCT OWNER KÝ DUYỆT VĂN BẢN (Formal Owner Sign-off)             │
│         Product Owner ký ban hành Quyết định Freeze công thức.             │
├────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 5: CẬP NHẬT TRẠNG THÁI CONTRACT & CẤP PHÉP SỬA MÃ NGUỒN               │
│         Cập nhật SCORING_FORMULA_CONTRACT từ CANDIDATE -> FROZEN.          │
│         Cấp quyền: CODE CHANGE AUTHORIZED = YES (Cho đợt Remediation).     │
└────────────────────────────────────────────────────────────────────────────┘
```
