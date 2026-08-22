# 14_SCHOOL_NETWORK_SPEC — MẠNG LƯỚI TRƯỜNG HỌC B2B & TOURNAMENT HUB
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟡 PHASE 3 EXPANSION (SPEC RESERVED)
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Định Vị Phân Kỳ (Phase 3 Roadmap)

> [!NOTE]
> Tính năng School Network & Inter-school Tournament Hub thuộc **Phase 3 (Mở rộng hệ sinh thái)**, được kích hoạt sau khi toàn bộ Vòng lặp đối luyện cốt lõi (Core Practice Loop P0-P1) đã vận hành ổn định trên môi trường Production.

---

## 2. Khung Kiến Trúc B2B Multi-Tenant Dự Kiến

```mermaid
graph TD
    SchoolOrg[Trường Học / CLB Tranh Biện B2B] --> AdminPortal[Cổng Quản Trị Giáo Viên]
    AdminPortal --> ClassBatch[Quản Lý Danh Sách Lớp & Team Pass]
    ClassBatch --> QuotaPool[Hồ Hạn Ngạch Tập Trung (Shared Quota Pool)]
    QuotaPool --> Student1[Học Sinh A]
    QuotaPool --> Student2[Học Sinh B]

    AdminPortal --> TourneyHub[Giải Đấu Trực Tuyến Liên Trường]
```

- **Team Pass & License Pool:** Quản lý gói cước số lượng lớn dành riêng cho các trường THPT / Đại học.
- **Teacher Analytics Dashboard:** Báo cáo tiến độ phát triển tư duy phản biện của học sinh theo từng lớp học.
