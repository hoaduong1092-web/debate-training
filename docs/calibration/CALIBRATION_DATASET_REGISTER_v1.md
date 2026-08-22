# SỔ ĐĂNG KÝ TẬP DỮ LIỆU KIỂM CHUẨN v1 (CALIBRATION DATASET REGISTER v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tập Dữ Liệu:** `CALIBRATION-WSDC-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/calibration/CALIBRATION_PROTOCOL_v1.md` & `docs/calibration/CALIBRATION_CASEBOOK_v1.md`  
> **Trạng Thái Hiện Tại:** 🔴 **INITIAL REGISTRATION — PENDING DATA ACQUISITION**  
> **Ngày Khởi Tạo:** 21/08/2026

---

# 1. BẢNG TỔNG QUAN HIỆN TRẠNG TẬP DỮ LIỆU (DATASET DASHBOARD)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MÃ ĐỊNH DANH TẬP DỮ LIỆU:         CALIBRATION-WSDC-v1.0.0                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. MỤC TIÊU BÀI NÓI THỰC TẾ:          N = 50 bài phát biểu (Real Speeches)  │
│    • Số lượng bài đã thu thập:        0 / 50 (0.0%)                         │
│    • Tình trạng thu thập:             🔴 PENDING DATA ACQUISITION           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. MỤC TIÊU PHIẾU CHẤM CON NGƯỜI:     150 phiếu chấm (50 bài x 3 Giám khảo) │
│    • Số lượng phiếu đã hoàn thành:    0 / 150 (0.0%)                        │
│    • Tình trạng chấm điểm:            🔴 NOT STARTED                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. HỘI ĐỒNG GIÁM KHẢO CON NGƯỜI:      3 Giám khảo WSDC Độc lập              │
│    • Số lượng đã ký hợp đồng:         0 / 3                                 │
│    • Tình trạng hội đồng:             🔴 NOT ESTABLISHED                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. HUMAN GROUND TRUTH:                🔴 NOT AVAILABLE (CHƯA CÓ)            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. TIẾN TRÌNH FORMULA PROMOTION:      🔴 BLOCKED                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7. THAY ĐỔI MÃ NGUỒN PRODUCTION:      🚫 FORBIDDEN (NGHIÊM CẤM TUYỆT ĐỐI)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. DANH MỤC 50 MẪU KIỂM CHUẨN (MASTER 50-SAMPLE INVENTORY)

| Sample ID | Case Target | Speech Type | Target Domain | Target Region | Audio Ref | Transcript Ref | Judge A | Judge B | Judge C | Adjudication Status |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `CAL-SPEECH-001` | TC-01 (No Evidence) | VOICE | Ethics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-002` | TC-01 (No Evidence) | TEXT | Politics | South | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-003` | TC-02 (Weak 1★) | VOICE | Environment | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-004` | TC-02 (Weak 1★) | VOICE | Education | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-005` | TC-03 (Standard 3★)| VOICE | Technology | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-006` | TC-03 (Standard 3★)| TEXT | Economics | South | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-007` | TC-04 (Strong 5★) | VOICE | Science | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-008` | TC-04 (Strong 5★) | VOICE | Politics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-009` | TC-05 (Irrelevant) | VOICE | Ethics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-010` | TC-05 (Irrelevant) | TEXT | Environment | North | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-011` | TC-06 (Insufficient)| VOICE | Technology | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-012` | TC-06 (Insufficient)| VOICE | Education | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-013` | TC-07 (Complete CRE)| VOICE | Economics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-014` | TC-07 (Complete CRE)| VOICE | Politics | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-015` | TC-08 (Claim Only) | VOICE | Ethics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-016` | TC-08 (Claim Only) | TEXT | Education | North | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-017` | TC-09 (Claim+Reason)| VOICE | Technology | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-018` | TC-09 (Claim+Reason)| VOICE | Environment | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-019` | TC-10 (No Reason) | VOICE | Politics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-020` | TC-10 (No Reason) | TEXT | Ethics | Central | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-021` | TC-11 (2 Fallacies)| VOICE | Economics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-022` | TC-11 (2 Fallacies)| VOICE | Education | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-023` | TC-12 (Contradiction)| VOICE| Technology | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-024` | TC-12 (Contradiction)| TEXT | Politics | South | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-025` | TC-13 (Core Clash) | VOICE | Environment | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-026` | TC-13 (Core Clash) | VOICE | Ethics | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-027` | TC-14 (Miss Clash) | VOICE | Economics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-028` | TC-14 (Miss Clash) | TEXT | Education | North | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-029` | TC-15 (Direct Reb) | VOICE | Technology | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-030` | TC-15 (Direct Reb) | VOICE | Politics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-031` | TC-16 (Scripted) | VOICE | Ethics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-032` | TC-16 (Scripted) | TEXT | Environment | Central | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-033` | TC-17 (Reflex Adapt)| VOICE| Economics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-034` | TC-17 (Reflex Adapt)| VOICE| Education | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-035` | TC-18 (POI Mastery) | VOICE| Technology | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-036` | TC-18 (POI Mastery) | VOICE| Politics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-037` | TC-19 (Time Alloc) | VOICE | Ethics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-038` | TC-19 (Time Alloc) | TEXT | Economics | South | N/A | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-039` | TC-20 (Time Overrun)| VOICE| Environment | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-040` | TC-20 (Time Overrun)| VOICE| Education | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-041` | TC-21 (Slow WPM) | VOICE | Technology | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-042` | TC-21 (Slow WPM) | VOICE | Politics | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-043` | TC-22 (Optimal WPM)| VOICE | Ethics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-044` | TC-22 (Optimal WPM)| VOICE | Economics | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-045` | TC-23 (Windmiller) | VOICE | Environment | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-046` | TC-23 (Windmiller) | VOICE | Education | South | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-047` | TC-24 (Heavy Filler)| VOICE| Technology | Central | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-048` | TC-24 (Heavy Filler)| VOICE| Politics | North | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-049` | TC-25 (Accent Fair)| VOICE | Ethics | Central (Nghệ An) | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
| `CAL-SPEECH-050` | TC-25 (Accent Fair)| VOICE | Economics | Central (Huế/ĐN) | PENDING | PENDING | PENDING | PENDING | PENDING | 🔴 NOT_COLLECTED |
