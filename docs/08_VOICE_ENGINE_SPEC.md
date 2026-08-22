# 08_VOICE_ENGINE_SPEC — ĐẶC TẢ AUDIO DSP ENGINE & LOẠI BỎ VOICE CLONING
> **Source of Truth:** Master Blueprint V15.0 (`ai-debate-master-blueprint-v15.pdf`)
> **Trạng thái:** 🟢 PRODUCTION-ALIGNED / HARDENED
> **Phiên bản:** 15.0.0 (Cập nhật ngày 20/08/2026)
> **Phạm vi:** Core Practice Loop & Thinking OS Architecture

---

## 1. Quyết Định Kiến Trúc Cốt Lõi: Loại Bỏ Hoàn Toàn Voice Cloning

- **Lý do an toàn:** Voice Cloning tiềm ẩn nguy cơ bảo mật sinh trắc học và vi phạm quyền riêng tư của trẻ vị thành niên theo chuẩn COPPA và Nghị định 13/2023/NĐ-CP.
- **Tiết kiệm chi phí:** Không phát sinh chi phí duy trì GPU server cho các model cloning (như F5-TTS, XTTS).
- **Hệ thống TTS:** Sử dụng Standard Web Speech API (Client-side) hoặc Google Cloud TTS Standard giọng đọc chất lượng cao.

---

## 2. Deterministic Audio DSP Engine (No-LLM Telemetry)

Toàn bộ chỉ số âm học được tính toán hoàn toàn bằng thuật toán DSP xác định (Zero LLM Tokens):

```mermaid
graph LR
    AudioStream[Ghi Âm Thoại] --> VAD[WebRTC VAD / Energy Detector]
    AudioStream --> STT[Whisper / Web Speech API + Timestamps]

    VAD --> SilenceCalc[Tính Khoảng Lặng (Pauses > 1.2s)]
    STT --> WPMCalc[Tính Tốc Độ WPM: WordCount / Minutes]
    STT --> FillerRegex[Regex Pattern: ừm, à, thì, kiểu như...]

    SilenceCalc & WPMCalc & FillerRegex --> TelemetryPayload[Telemetry JSON: wpm, fillers, pauses]
```

### Tiêu Chuẩn Tốc Độ Nói (WPM Benchmark):
- `< 110 WPM`: Tốc độ chậm, thiếu tính thuyết phục và năng lượng.
- `120 - 160 WPM`: **Chuẩn Tốc Độ (Optimal)** — rõ ràng, dễ tiếp thu trong tranh biện.
- `> 180 WPM`: Quá nhanh, nguy cơ nuốt chữ và giảm khả năng theo dõi của giám khảo.