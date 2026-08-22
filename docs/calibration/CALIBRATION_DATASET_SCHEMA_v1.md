# CẤU TRÚC LƯỢC ĐỒ TẬP DỮ LIỆU KIỂM CHUẨN v1 (CALIBRATION DATASET SCHEMA v1)
## DỰ ÁN: AI DEBATE MASTER — THINKING OS

> **Mã Tài Liệu:** `DOC-CAL-SCHEMA-v1.0.0`  
> **Source of Truth Thẩm Quyền:** `docs/SCORING_FORMULA_CONTRACT_v1.md` & `docs/calibration/CALIBRATION_PROTOCOL_v1.md`  
> **Trạng Thái Quản Trị:** 🟡 **SCHEMA SPECIFICATION — APPROVED DRAFT**  
> **Ngày Ban Hành:** 21/08/2026

---

# 1. TỔNG QUAN KIẾN TRÚC DỮ LIỆU KIỂM CHUẨN

Lược đồ dữ liệu kiểm chuẩn được thiết kế để chứa thông tin đầy đủ của $N = 50$ bài phát biểu tranh biện thực tế, cho phép ghi nhận song song:
1. **Dữ liệu thô và Telemetry xác định (Layer 1 Raw Measurements)** — Zero LLM Tokens.
2. **Điểm số độc lập từ 3 Giám khảo con người (Human Ground Truth 3-Judge Panel)**.
3. **Đầu ra quan sát của 9 Công thức Chấm điểm Ứng viên (Candidate Formula Outputs)**.
4. **Nhật ký truy vết và toàn vẹn dữ liệu (Audit & Provenance Metadata)**.

---

# 2. ĐỊNH NGHĨA LƯỢC ĐỒ CHI TIẾT (TYPESCRIPT & JSON SCHEMA SPECIFICATION)

```typescript
export interface CalibrationSample {
  // 1. SAMPLE METADATA & CONTEXT
  sample_id: string;                    // e.g. "CAL-SPEECH-2026-001"
  dataset_version: string;              // e.g. "CALIBRATION-WSDC-v1.0.0"
  speaker_id: string;                  // Pseudonymous e.g. "SPK-ANON-7842"
  speech_type: "VOICE" | "TEXT";
  motion_topic: string;                 // e.g. "THW ban animal testing for cosmetics"
  motion_domain: "POLITICS" | "ECONOMICS" | "ETHICS" | "EDUCATION" | "ENVIRONMENT" | "TECHNOLOGY";
  side: "AFFIRMATIVE" | "NEGATIVE";
  speaker_role: "1ST_SPEAKER" | "2ND_SPEAKER" | "3RD_SPEAKER" | "REPLY_SPEAKER";
  duration_seconds: number;             // Thực tế thời lượng phát biểu
  audio_reference?: {
    file_path: string;                  // URI lưu trữ tệp WAV/MP3 an toàn
    file_checksum_sha256: string;       // Bắt buộc để đảm bảo tính bất biến của âm thanh
    sample_rate_hz: number;             // e.g. 16000, 44100
    snr_db: number;                     // Signal-to-noise ratio
    accent_detected?: "NORTHERN" | "CENTRAL" | "SOUTHERN" | "OTHER";
  };
  transcript_reference: {
    file_path: string;                  // URI tệp transcript có gắn word timestamps
    transcript_checksum_sha256: string;
    word_count: number;
    vietnamese_diacritics_valid: boolean;
  };

  // 2. LAYER 1 — DETERMINISTIC RAW MEASUREMENTS (ZERO LLM TOKENS)
  raw_measurements: {
    telemetry_pipeline_version: string;
    calculated_at: string;              // ISO 8601 Timestamp
    wpm_raw: number;                    // WordCount / (DurationSeconds / 60)
    pause_count_total: number;
    pause_duration_total_seconds: number;
    pause_ratio_percent: number;        // (PauseDuration / TotalDuration) * 100
    pauses_ge_1_2s_count: number;       // Số khoảng lặng >= 1.2s
    filler_raw_count: number;           // Số từ đệm bắt được theo DSP regex
    poi_count: number;                  // Số lượt chất vấn POI
    poi_duration_seconds_array: number[]; // Mảng thời lượng từng lượt POI
    protected_time_violations: boolean; // Vi phạm chất vấn trong phút đầu/cuối
    cre_blocks: {
      claim_present: boolean;
      reasoning_present: boolean;
      evidence_present: boolean;
      claim_text_snippet?: string;
      reasoning_text_snippet?: string;
      evidence_text_snippet?: string;
    };
    evidence_source_stars?: 1 | 2 | 3 | 4 | 5; // Đánh giá sao nguồn dẫn chứng
    fallacies_detected_deterministic: Array<{
      fallacy_type: string;
      line_reference?: number;
      quote_snippet?: string;
    }>;
  };

  // 3. HUMAN GROUND TRUTH (3 INDEPENDENT WSDC JUDGES)
  human_ground_truth: {
    adjudication_status: "PENDING_ANNOTATION" | "ANNOTATED_INDEPENDENT" | "ADJUDICATED_FINAL" | "REJECTED";
    judge_annotations: {
      judge_a: JudgeAnnotationRecord;
      judge_b: JudgeAnnotationRecord;
      judge_c: JudgeAnnotationRecord;
    };
    adjudicated_consensus?: {
      adjudicated_by: string;           // e.g. "CHIEF_ADJUDICATOR_PANEL"
      adjudicated_at: string;
      content_ground_truth: number;     // Thang [0.0, 10.0]
      strategy_ground_truth: number;    // Thang [0.0, 10.0]
      style_ground_truth: number;       // Thang [0.0, 10.0]
      total_ground_truth: number;       // Thang [0.0, 10.0] (0.4C + 0.2S + 0.4V)
      adjudication_rationale: string;
      variance_flag: "NORMAL" | "HIGH_VARIANCE_RESOLVED" | "OUTLIER_REMOVED";
    };
  };

  // 4. CANDIDATE FORMULA OUTPUTS (OBSERVER RUN ONLY — ZERO PRODUCTION MUTATION)
  candidate_outputs: {
    execution_engine_version: string;   // e.g. "calibration-engine-v16.0.0"
    formula_version: string;            // e.g. "16.0.0-candidate.1"
    executed_at: string;                // ISO 8601
    content_raw_score: number;          // Thang [0, 100] C_raw = 0.30L + 0.20E + ...
    content_score_clamped: number;      // Sau khi trừ Fallacy $1.5 \times N$ và clamp [0, 100]
    strategy_score: number;             // Thang [0, 100] S = 0.30I + 0.25E + ...
    style_score: number;                // Thang [0, 100] Style = 0.30C + 0.20P + ...
    total_score_computational: number;  // Thang [0, 100] Total = 0.40C + 0.20S + 0.40V
    total_score_display_10: number;     // Thang [0.0, 10.0] toFixed(1)
    sub_metrics: {
      evidence_quality_3d: number;      // E_quality
      reflex_adaptation: number;        // R
      prosody_variation: number;        // Prosody
      pace_score: number;               // Pace từ đường cong WPM
      pause_stability_score: number;    // Pause stability
    };
    hard_caps_triggered: {
      logic_contradiction_cap_applied: boolean; // Logic <= 30
      core_clash_failure_cap_applied: boolean;  // Strategy <= 30
      windmiller_trigger_activated: boolean;    // WPM>170 & Pause<10%
    };
  };

  // 5. AUDIT, PROVENANCE & GOVERNANCE
  audit: {
    created_at: string;
    created_by: string;
    is_synthetic: boolean;              // BẮT BUỘC FALSE cho Calibration Data
    consent_form_id: string;            // Mã số văn bản đồng thuận pháp lý
    data_retention_expiry_date: string;
    reviewer_status: "DRAFT" | "READY_FOR_EVALUATION" | "LOCKED_FOR_ANALYSIS";
    sha256_full_record: string;
  };
}

export interface JudgeAnnotationRecord {
  judge_id: string;                     // Pseudonymous e.g. "JUDGE-WSDC-01"
  annotated_at: string;
  is_blind_to_ai_scores: boolean;       // Bắt buộc TRUE
  scores: {
    content_score: number;              // Thang [0.0, 10.0]
    strategy_score: number;             // Thang [0.0, 10.0]
    style_score: number;                // Thang [0.0, 10.0]
    total_score: number;                // Thang [0.0, 10.0]
  };
  sub_observations: {
    reasoning_depth_rating: "POOR" | "ADEQUATE" | "STRONG" | "EXCEPTIONAL";
    evidence_reliability_rating: "WEAK" | "ACCEPTABLE" | "HIGHLY_CREDIBLE";
    core_clash_engagement: "MISSED" | "PERIPHERAL" | "DIRECT_ENGAGEMENT";
    pace_fluency_rating: "RUSHED_WINDMILLER" | "OPTIMAL" | "TOO_SLOW" | "DISRUPTIVE_FILLERS";
    regional_accent_fairness_confirmed: boolean; // Xác nhận không trừ điểm giọng địa phương
  };
  qualitative_rationale: string;        // Lời giải trình sư phạm chi tiết
  confidence_level: "LOW" | "MEDIUM" | "HIGH";
}
```

---

# 3. NGUYÊN TẮC BẤT BIẾN KHI LƯU TRỮ VÀ XỬ LÝ (DATA INTEGRITY RULES)

1. **Cấm Hard-code Điểm Dự Kiến:** Schema không được phép gán sẵn bất kỳ điểm Human Ground Truth giả lập nào khi chưa có biên bản chấm thực tế.
2. **Tính Bất Biến Của Mẫu Gốc:** Tệp âm thanh và transcript sau khi được nạp vào kho lưu trữ kiểm chuẩn phải được tạo mã băm SHA-256 và chuyển sang chế độ chỉ đọc (*Read-Only*).
3. **Cô Lập Tuyệt Đối Điểm AI:** Cấu trúc bảng lưu trữ cho Human Judges hoàn toàn độc lập và không có quyền truy cập trường `candidate_outputs`.
