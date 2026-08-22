# 10_SECURITY_SPEC — BẢO MẬT & BẢO VỆ DỮ LIỆU NGƯỜI HỌC (COPPA & NGHỊ ĐỊNH 13)
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Chính Sách Bảo Vệ Dữ Liệu Học Sinh (< 15 Tuổi)

Hệ thống tuân thủ chặt chẽ các quy định pháp luật về bảo vệ dữ liệu cá nhân của trẻ em:
- **Nghị định 13/2023/NĐ-CP** (Bảo vệ dữ liệu cá nhân tại Việt Nam).
- **COPPA Principles** (Children's Online Privacy Protection Act).

---

## 2. Các Cam Kết Bảo Mật Bất Biến

1. **Không Fine-tuning Trái Phép:** Tuyệt đối không sử dụng dữ liệu giọng nói, file âm thanh, hoặc transcript đối thoại của học sinh để huấn luyện hoặc fine-tune các mô hình AI của bên thứ ba.
2. **Parental Consent (Đồng thuận của Phụ huynh):** Với các tài khoản học sinh dưới 15 tuổi, hệ thống cung cấp luồng xác thực số điện thoại phụ huynh để kích hoạt tài khoản.
3. **Quyền Được Quên (Right to Erasure):** Cung cấp API `DELETE /api/v1/users/me/data` cho phép người dùng hoặc phụ huynh xóa vĩnh viễn toàn bộ lịch sử tranh biện và file audio ghi âm bất kỳ lúc nào.
4. **Mã Hóa Lưu Trữ & Đường Truyền:**
   - Dữ liệu đường truyền bắt buộc sử dụng TLS 1.3 (HTTPS / WSS).
   - Dữ liệu nhạy cảm (Số điện thoại, OTP hashes) được mã hóa HMAC-SHA256 và lưu trữ an toàn trong PostgreSQL.