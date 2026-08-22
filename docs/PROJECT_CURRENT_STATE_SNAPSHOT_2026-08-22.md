# AI DEBATE MASTER — PROJECT CURRENT STATE SNAPSHOT
## TOÀN BỘ HIỆN TRẠNG HỆ THỐNG GÓI CƯỚC, QUOTA, THANH TOÁN & USER JOURNEY
**Ngày lập báo cáo:** 22/08/2026  
**Phạm vi:** Toàn bộ Architecture, Database, Backend, Frontend, Payment Providers, Quota Engine & User Journey.  
**Mục đích:** Xác định chính xác "Chúng ta thực sự đang ở đâu" — Phân biệt rạch ròi giữa Contract/Test Complete vs. Business/Product Operational.

---

## 1. WHERE WE ARE (BỨC TRANH TOÀN CẢNH)

> **Hiện tại project đang ở trạng thái: CORE DOMAIN ENGINE & COMMERCE CONTRACTS HOÀN THIỆN TRÊN CODE & TEST, NHƯNG CHƯA PHẢI LÀ MỘT HỆ THỐNG SAAS VẬN HÀNH THƯƠNG MẠI HOÀN CHỈNH (COMMERCIAL SAAS OPERATION).**

Cụ thể:
- **Những gì ĐÃ XONG (Contract & Engine Complete):** Toàn bộ logic nghiệp vụ cốt lõi (Core Business Logic) về Trừ hạn ngạch 3 chiều nguyên tử (Text / Voice / Assistant), Động cơ FEFO nạp lẻ (Credit Packs), Thứ tự ưu tiên quyền lợi (VIP $\to$ Sub $\to$ Add-on $\to$ Trial $\to$ Block), Khóa trần kỹ thuật 15 phút đàm thoại Voice AI, Bộ chuyển đổi chữ ký mật mã Webhook (VNPay HMAC-SHA512, MoMo HMAC-SHA256, SePAY VietQR), và Giao diện chọn gói/quét mã QR đã được viết và kiểm chứng qua 23 test suites (734+ test assertions xanh 100%).
- **Những gì CHƯA XONG (Commercial Product Missing):** Chưa có cơ chế Tự động gia hạn định kỳ (Recurring Billing), chưa có Quản lý lịch sử giao dịch (Transaction/Invoice History UI), chưa có luồng Hủy/Nâng cấp tính tiền bù trừ (Prorated Upgrade/Downgrade), chưa có Cổng mua VIP Pass / Team Pass trên giao diện, và chưa có Khóa API Merchant Thật (Real Merchant Credentials) từ các ngân hàng/cổng thanh toán để thu tiền thật ngoài đời thực.

---

## 2. WHAT IS ACTUALLY DONE (ĐÃ LÀM XONG THẬT TRÊN CODE & UI)

1. **Quota 3 chiều độc lập (Decoupled 3D Quotas):**
   - `textTurnsRemaining`: Trừ theo phiên tranh biện (tối đa 20 lượt CRE).
   - `voiceMinsRemaining`: Trừ theo phút phát biểu Voice AI thực tế (làm tròn trần $\lceil D/60\text{s} \rceil$, miễn phí $<3\text{s}$).
   - `assistantRemaining`: Trừ theo lượt tạo bản thảo / phân tích kiến nghị.
   - Thao tác trừ được bảo vệ bằng SQL nguyên tử (`WHERE balance >= :needed`), không bao giờ âm tiền, không trừ chéo chiều này sang chiều khác.
2. **Động cơ FEFO Nạp lẻ (Credit Pack Engine):**
   - 4 gói nạp chuẩn: `PACK_VOICE_15` (15k, 15m), `PACK_VOICE_60` (49k, 60m), `PACK_TEXT_10` (19k, 10 lượt), `PACK_ASST_5` (15k, 5 lượt).
   - Thời hạn 30 ngày. Khi tiêu thụ, hệ thống tự động lọc gói có ngày hết hạn gần nhất dùng trước (`orderBy: { expiresAt: 'asc' }`).
3. **Thứ bậc quyền hạn Voice AI (5-Tier Entitlement Precedence):**
   - `VoiceEntitlementResolver` đọc tuần tự: VIP (Miễn phí hoàn toàn) $\to$ Subscription $\to$ Add-on FEFO $\to$ Free Trial (5 phút) $\to$ Khóa 403 `QUOTA_EXCEEDED`.
4. **Khóa an toàn 15 phút (Server-Side 15m Technical Cap):**
   - Server sở hữu thời gian phiên, ép trần kỹ thuật `maxAllowedMs <= 900,000ms`, client không thể can thiệp thời lượng.
5. **Giao diện Nạp tiền & Xem gói (`PricingModal.tsx` & `ProfileTab.tsx`):**
   - Xem 6 gói thuê bao (Monthly / Yearly toggle tiết kiệm 25%).
   - Xem 4 gói nạp lẻ (Add-on tab).
   - Bấm mua tạo đơn hàng `PENDING` từ server.
   - Hiển thị VietQR kèm mã chuyển khoản tự động điền memo và nút sao chép.
   - Có nút mô phỏng Sandbox để test luồng hoàn tất ngay lập tức.
   - Profile hiển thị thanh đo Quota và thẻ phân tích nguồn quyền hạn (Precedence Card) không bị `NaN` hay `undefined`.
6. **Bộ đệm và bộ xử lý Webhook (Payment Controllers & Crypto):**
   - Thuật toán băm kiểm tra chữ ký chuẩn VNPay, MoMo, SePAY.
   - Cơ chế atomic claim `UPDATE payment_orders SET status = 'PAID' WHERE status = 'PENDING'` chống race-condition 10 request đồng thời.
   - Lọc bỏ dữ liệu nhạy cảm (token, private key, card) trước khi ghi log webhook.

---

## 3. WHAT IS NOT DONE (NHỮNG GÌ CHƯA LÀM / CÒN THIẾU)

1. 🔴 **Chưa có Tự động trừ tiền định kỳ (Recurring Billing):**
   - Hiện tại mô hình thanh toán là **Thanh toán từng lần (One-off / Prepaid Top-up)**.
   - Hết 30 ngày hoặc hết năm, Subscription tự hết hạn trong DB, người dùng phải tự vào web bấm mua lại. Chưa có tokenization thẻ ngân hàng để tự động thu tiền hàng tháng.
2. 🔴 **Chưa có Lịch sử Giao dịch & Hóa đơn cho User (Transaction History UI):**
   - Bảng `payment_orders` lưu trong database nhưng **không có màn hình nào trên Frontend** cho User xem danh sách các đơn đã mua, trạng thái đơn, ngày giờ, số tiền và hóa đơn.
3. 🔴 **Chưa có Luồng Hủy / Chuyển đổi gói tính tiền bù trừ (Prorated Upgrade/Downgrade):**
   - Khi user đang có `BASIC_MONTHLY` (còn 15 ngày) mà bấm mua `PREMIUM_MONTHLY`, backend hiện tại gọi `replaceExisting: true` và ghi đè ngày mới, không có công thức tính hoàn tiền/bù trừ ngày cũ.
4. 🔴 **Chưa có Giao diện mua VIP Pass / Team Bundle:**
   - Model `UserVipPass` và gói đội nhóm có logic trong backend/test nhưng **chưa có nút mua / trang bán hàng** trên Frontend.
5. 🔴 **Chưa kết nối Cổng Thanh Toán Thật (Production Merchant Credentials):**
   - Tất cả mã kiểm tra hiện đang chạy với Test Secret / Sandbox Gateway (`sandbox.vnpayment.vn`, `test-payment.momo.vn`). Cần hợp đồng thương nhân thực tế để thu tiền thật.
6. 🔴 **Chưa có Background Worker tự động quét Dọn Hạn ngạch (Cron Expiration Worker):**
   - Việc hết hạn hiện tại được kiểm tra "lười" (Lazy evaluation: khi user gửi request thì query `WHERE expiresAt > NOW()`). Không có cron job chạy đêm để tự động đánh dấu `EXPIRED` hay gửi email/SMS thông báo sắp hết hạn trước 3 ngày.
7. 🔴 **Chưa có Trang Quản Trị Doanh Thu / Quota cho Admin (Admin Portal):**
   - Không có giao diện cho quản trị viên tra cứu đơn hàng, kích hoạt bù quota thủ công cho học sinh, hoặc xuất báo cáo doanh thu.

---

## 4. INVENTORY GÓI CƯỚC CHI TIẾT

### 4.1. Bảng 6 Gói Thuê Bao (Subscription Plans)

| Code | Tên Gói | Giá Niêm Yết | Chu Kỳ | Quota Text | Quota Voice | Quota Trợ Lý | Backend | Frontend | Thanh Toán | Kích Hoạt |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `BASIC_MONTHLY` | Cơ Bản (Khám Phá) | 49.000 đ | 30 ngày | 30 lượt | 15 phút | 10 câu | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `BASIC_YEARLY` | Cơ Bản (Khám Phá) | 490.000 đ | 365 ngày | 360 lượt | 180 phút | 120 câu | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `STANDARD_MONTHLY` | Tiêu Chuẩn (Rèn Luyện)| 129.000 đ | 30 ngày | 100 lượt | 60 phút | 50 câu | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `STANDARD_YEARLY` | Tiêu Chuẩn (Rèn Luyện)| 1.190.000 đ | 365 ngày | 1.200 lượt| 720 phút | 600 câu | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `PREMIUM_MONTHLY` | Cao Cấp (Bứt Phá) | 399.000 đ | 30 ngày | 500 lượt | 300 phút | 200 câu | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `PREMIUM_YEARLY` | Cao Cấp (Bứt Phá) | 3.590.000 đ | 365 ngày | 6.000 lượt| 3.600 phút| 2.400 câu| 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |

### 4.2. Bảng 4 Gói Nạp Lẻ (Credit Packs - FEFO)

| Pack Code | Tên Hiển Thị | Giá | Dimension | Đơn Vị Cộng | Hạn Dùng | Backend | Frontend | Thanh Toán | Kích Hoạt |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `PACK_VOICE_15` | Voice Boost 15 phút | 15.000 đ | `voice` | +15 phút | 30 ngày | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `PACK_VOICE_60` | Voice Boost 60 phút | 49.000 đ | `voice` | +60 phút | 30 ngày | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `PACK_TEXT_10` | Text Boost 10 phiên | 19.000 đ | `text` | +10 phiên | 30 ngày | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| `PACK_ASST_5` | Assistant Boost 5 câu | 15.000 đ | `assistant`| +5 lượt | 30 ngày | 🟢 Có | 🟢 Có | 🟢 Có | 🟢 Có |
| *`PACK_VOICE_5`* | *Legacy (Session cũ)* | — | `voice` | — | — | ❌ Loại | ❌ Loại | ❌ Loại | ❌ Loại |
| *`PACK_VOICE_10`*| *Legacy (Session cũ)* | — | `voice` | — | — | ❌ Loại | ❌ Loại | ❌ Loại | ❌ Loại |

---

## 5. USER BUYING JOURNEY REALITY CHECK

| Bước trong Hành trình | Trạng Thái | Thực Tế Triển Khai |
| :--- | :---: | :--- |
| **1. Xem danh sách gói** | 🟢 HOÀN CHỈNH | User mở `PricingModal` hoặc vào tab `ProfileTab`, thấy rõ giá, quyền lợi, toggle tháng/năm và tab Gói Nạp Lẻ. |
| **2. Chọn gói & Khởi tạo đơn** | 🟢 HOÀN CHỈNH | Bấm nút $\to$ gọi API `POST /api/v1/payments/checkout` $\to$ nhận mã `orderCode` và server-authoritative amount. |
| **3. Hiển thị phương thức trả tiền** | 🟢 HOÀN CHỈNH | Hiển thị 4 tab: SePAY VietQR (có mã QR Napas + memo + STK), VNPay, MoMo, Sandbox. |
| **4. Quét mã / Chuyển khoản** | 🟡 CÓ CODE / MOCK | SePAY tạo đúng chuẩn VietQR Napas247. VNPay/MoMo tạo đúng URL chuyển hướng sandbox. |
| **5. Tiếp nhận Webhook/IPN** | 🟢 HOÀN CHỈNH | Endpoint `/api/v1/payments/*` xác minh chữ ký HMAC/ApiKey và cập nhật DB tức thì. |
| **6. Kích hoạt quyền lợi (Provisioning)** | 🟢 HOÀN CHỈNH | Đơn hàng chuyển `PAID` $\to$ tạo dòng `user_credit_packs` hoặc cập nhật `user_subscriptions` & `user_quotas`. |
| **7. Cập nhật UI ngay sau mua** | 🟢 HOÀN CHỈNH | Frontend nhận callback / đóng modal $\to$ gọi `refreshUser()` $\to$ số dư trên top navbar và Profile nhảy số mới. |
| **8. Sử dụng dịch vụ trong Arena** | 🟢 HOÀN CHỈNH | Đấu văn bản trừ 1 text; Đấu giọng nói trừ số phút làm tròn trần; Hỏi trợ lý trừ 1 assistant credit. |
| **9. Khi hết hạn ngạch (Exceeded)** | 🟢 HOÀN CHỈNH | Arena hiển thị thông báo hết giờ thoại, chặn tạo phòng và có nút mở thẳng `PricingModal` để mua thêm. |
| **10. Tra cứu lịch sử thanh toán** | 🔴 CHƯA CÓ | User không có chỗ xem lại danh sách đơn hàng đã thanh toán trong quá khứ. |
| **11. Tự động trừ tiền chu kỳ sau** | 🔴 CHƯA CÓ | Không có cơ chế recurring token. User phải tự vào bấm mua lại khi hết hạn. |
| **12. Hóa đơn điện tử / Email xác nhận**| 🔴 CHƯA CÓ | Chưa có dịch vụ gửi email biên nhận hay xuất file PDF hóa đơn. |

---

## 6. PAYMENT GATEWAYS STATUS

| Cổng Thanh Toán | Adapter Code | Xác Thực Chữ Ký | Tạo Đơn Hàng | Webhook Handler | Trạng Thái Sandbox | Trạng Thái Production Thật |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **SePAY (VietQR)** | 🟢 Hoàn thành | 🟢 ApiKey Header | 🟢 QR Napas247 | 🟢 Tự động parsing | 🟢 Hoạt động tốt | 🟡 Cần STK ngân hàng thật của dự án |
| **VNPay** | 🟢 Hoàn thành | 🟢 HMAC-SHA512 | 🟢 Query Sort | 🟢 IPN Handler | 🟢 Hoạt động tốt | 🟡 Cần TMN_CODE & Secret thật |
| **MoMo** | 🟢 Hoàn thành | 🟢 HMAC-SHA256 | 🟢 Raw Signature | 🟢 IPN Handler | 🟢 Hoạt động tốt | 🟡 Cần Partner Code & Secret thật |
| **Sandbox Direct**| 🟢 Hoàn thành | 🟢 Dev Guard | 🟢 Kích hoạt tức thì | 🟢 Direct Upgrade | 🟢 Hoạt động tốt | ⚪ Tắt khi lên production |

---

## 7. DATABASE SCHEMA UTILIZATION AUDIT

```text
USER (Bảng người dùng duy nhất E.164)
 ├── UserQuota (🟢 ĐANG DÙNG: Ví số dư quota chính của gói thuê bao)
 ├── UserSubscription (🟢 ĐANG DÙNG: Lưu thông tin gói active, ngày bắt đầu, ngày hết hạn)
 ├── UserCreditPack (🟢 ĐANG DÙNG: Lưu các gói nạp lẻ FEFO, remainingUnits, expiresAt)
 ├── UserFreeTrial (🟢 ĐANG DÙNG: Lưu 3 ngày dùng thử 5 phút thoại chống lạm dụng số điện thoại)
 ├── PaymentOrder (🟢 ĐANG DÙNG: Lưu đơn hàng, orderCode, số tiền, trạng thái PENDING/PAID)
 ├── UserVipPass (🟡 CODE CÓ / CHƯA CÓ UI BÁN: Lưu quyền VIP Time-Unlimited)
 ├── DebateSession & Transcripts (🟢 ĐANG DÙNG: Lưu trận đấu và lượt thoại)
 └── SubscriptionPlan (🟢 ĐANG DÙNG: Bảng danh mục gói cước nạp động)
```

---

## 8. BẢNG SO SÁNH "CÁI TA MUỐN" VS "CÁI TA CÓ"

| Nghiệp Vụ Thương Mại | Mục Tiêu Thiết Kế | Hiện Trạng Trong Code | Đánh Giá Thực Tế |
| :--- | :--- | :--- | :---: |
| **Bán gói theo tháng/năm** | Cho phép học sinh mua gói học tập 30 ngày hoặc 365 ngày | Đã có 6 gói Dual-Cycle trên DB, API và UI | 🟢 **DONE** (Trả tiền từng lần) |
| **Bán gói nạp thêm giờ nói** | Cho phép nạp thêm 15m hoặc 60m khi hết giờ thoại giữa chừng | Đã có `PACK_VOICE_15` và `PACK_VOICE_60` | 🟢 **DONE** |
| **Bán gói nạp thêm lượt text/asst** | Nạp thêm 10 lượt text hoặc 5 câu hỏi cố vấn | Đã có `PACK_TEXT_10` và `PACK_ASST_5` | 🟢 **DONE** |
| **Ưu tiên gói hết hạn trước** | Tiêu gói sắp hết hạn trước (FEFO) để bảo vệ quyền lợi học sinh | Động cơ `orderBy: expiresAt ASC` hoạt động chuẩn | 🟢 **DONE** |
| **Bảo vệ không bị trừ lẹm** | Bị ngắt mạng, rớt mic, lỗi dưới 3s không bị trừ tiền | Bộ đệm $<3\text{s}$ miễn phí, trần 15m tối đa | 🟢 **DONE** |
| **Tự động gia hạn hàng tháng** | Tự động trừ tiền thẻ ngân hàng khi hết chu kỳ 30 ngày | Chưa có tokenization thẻ | 🔴 **CHƯA CÓ (One-off only)** |
| **Lịch sử thanh toán & Đơn hàng** | Học sinh/phụ huynh xem lại các lần nạp tiền và biên lai | Chưa có bảng/tab xem Orders trên UI | 🔴 **CHƯA CÓ UI** |
| **Mua VIP Pass ngắn hạn (1D/3D)** | Bán vé VIP sự kiện thi đấu không giới hạn số phút | Backend & Resolver có, UI chưa có nút mua | 🟡 **THIẾU UI BÁN HÀNG** |
| **Mua Gói Trường Học / Team Pass** | Bán gói sỉ cho CLB / Trường học | Spec có, Backend có endpoint thô, chưa có UI | 🟡 **THIẾU UI BÁN HÀNG** |
| **Thanh toán tiền thật ngoài đời** | Quét mã trả tiền thật nhận quota thật vào ví | Cần điền Merchant Key thật vào file `.env` | 🟡 **CHỜ THÔNG TIN NGÂN HÀNG** |

---

## 9. EXACT NEXT ACTIONS (DANH SÁCH VIỆC CẦN LÀM TIẾP THEO)

Theo thứ tự ưu tiên nghiệp vụ:

### Ưu tiên 1 (Product Completeness — Không cần sửa kiến trúc):
1. **Thêm UI "Lịch Sử Giao Dịch" (Transaction History):**  
   Tạo tab nhỏ hoặc modal trong `ProfileTab` hiển thị danh sách các `PaymentOrder` (Mã đơn, Gói đã mua, Số tiền, Cổng thanh toán, Ngày mua, Trạng thái `PAID`).
2. **Bổ sung Card mua "VIP Pass" trên PricingModal:**  
   Nếu muốn kinh doanh sản phẩm `VIP_3D` (Hero Campaign Product theo Quota Contract v1.0 §10), thêm tab hoặc card VIP vào `PricingModal` để kích hoạt dòng `UserVipPass`.

### Ưu tiên 2 (Operational & Merchant Onboarding):
3. **Cấu hình Merchant Credentials Thật:**  
   Đăng ký tài khoản doanh nghiệp / cá nhân với SePAY (MBBank VietQR), VNPay, hoặc MoMo để điền các biến môi trường thật vào `.env` production.

### Ưu tiên 3 (Advanced SaaS Automation — Khi có nhu cầu quy mô lớn):
4. **Cron Job Quét Hết Hạn & Thông Báo:**  
   Viết 1 background worker đơn giản quét các gói cước đã quá hạn `expiresAt` để chuyển trạng thái `EXPIRED` và ghi log kiểm toán.
5. **Cơ chế Hủy gói & Nâng cấp bù trừ (Proration Logic):**  
   Định nghĩa quy tắc toán học khi user đang ở giữa chu kỳ gói cũ mà nâng cấp lên gói cao hơn.
