/**
 * DATASET INTAKE VALIDATOR TOOL (STANDALONE VALIDATION UTILITY)
 * Project: AI Debate Master — Thinking OS
 * Path: docs/calibration/field/tools/dataset_intake_validator.ts
 *
 * PURPOSE:
 * Strict schema and integrity validation for incoming real calibration speech records.
 * 
 * STRICT INVARIANTS:
 * - Read-only validation.
 * - NEVER generates missing data or metadata.
 * - NEVER fabricates hashes, timestamps, or consent.
 * - Returns detailed VALIDATION ERRORS on any missing or invalid field.
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  sample_id?: string;
  errors: ValidationError[];
  warnings: string[];
}

export class DatasetIntakeValidator {
  private static readonly SAMPLE_ID_REGEX = /^CAL-SPEECH-2026-\d{3}$/;
  private static readonly SPEAKER_ID_REGEX = /^SPK-ANON-[A-Za-z0-9]{4,8}$/;
  private static readonly SHA256_REGEX = /^[a-f0-9]{64}$/i;
  private static readonly VALID_DOMAINS = ["POLITICS", "ECONOMICS", "ETHICS", "EDUCATION", "ENVIRONMENT", "TECHNOLOGY"];
  private static readonly VALID_SIDES = ["AFFIRMATIVE", "NEGATIVE"];
  private static readonly VALID_ROLES = ["1ST_SPEAKER", "2ND_SPEAKER", "3RD_SPEAKER", "REPLY_SPEAKER"];

  /**
   * Validate a single incoming sample record against CALIBRATION_DATASET_SCHEMA_v1
   */
  public static validateSampleRecord(sample: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!sample || typeof sample !== "object") {
      return {
        valid: false,
        errors: [{ field: "root", message: "Sample record must be a valid non-null object", code: "ERR_ROOT_INVALID" }],
        warnings: []
      };
    }

    // 1. Metadata Validation
    if (!sample.sample_id || !this.SAMPLE_ID_REGEX.test(sample.sample_id)) {
      errors.push({
        field: "sample_id",
        message: `sample_id must match format CAL-SPEECH-2026-XXX (received: ${sample.sample_id})`,
        code: "ERR_SAMPLE_ID_INVALID"
      });
    }

    if (sample.dataset_version !== "CALIBRATION-WSDC-v1.0.0") {
      errors.push({
        field: "dataset_version",
        message: `dataset_version must be 'CALIBRATION-WSDC-v1.0.0' (received: ${sample.dataset_version})`,
        code: "ERR_DATASET_VERSION_INVALID"
      });
    }

    if (!sample.speaker_id || !this.SPEAKER_ID_REGEX.test(sample.speaker_id)) {
      errors.push({
        field: "speaker_id",
        message: `speaker_id must match pseudonymous format SPK-ANON-XXXX (received: ${sample.speaker_id})`,
        code: "ERR_SPEAKER_ID_INVALID"
      });
    }

    if (sample.speech_type !== "VOICE" && sample.speech_type !== "TEXT") {
      errors.push({
        field: "speech_type",
        message: "speech_type must be either 'VOICE' or 'TEXT'",
        code: "ERR_SPEECH_TYPE_INVALID"
      });
    }

    if (!sample.motion_topic || typeof sample.motion_topic !== "string" || sample.motion_topic.trim().length < 5) {
      errors.push({
        field: "motion_topic",
        message: "motion_topic must be a non-empty string with at least 5 characters",
        code: "ERR_MOTION_TOPIC_INVALID"
      });
    }

    if (!this.VALID_DOMAINS.includes(sample.motion_domain)) {
      errors.push({
        field: "motion_domain",
        message: `motion_domain must be one of: ${this.VALID_DOMAINS.join(", ")}`,
        code: "ERR_MOTION_DOMAIN_INVALID"
      });
    }

    if (!this.VALID_SIDES.includes(sample.side)) {
      errors.push({
        field: "side",
        message: "side must be 'AFFIRMATIVE' or 'NEGATIVE'",
        code: "ERR_SIDE_INVALID"
      });
    }

    if (!this.VALID_ROLES.includes(sample.speaker_role)) {
      errors.push({
        field: "speaker_role",
        message: `speaker_role must be one of: ${this.VALID_ROLES.join(", ")}`,
        code: "ERR_SPEAKER_ROLE_INVALID"
      });
    }

    if (typeof sample.duration_seconds !== "number" || sample.duration_seconds < 60 || sample.duration_seconds > 480) {
      errors.push({
        field: "duration_seconds",
        message: `duration_seconds must be a number between 60s and 480s (received: ${sample.duration_seconds})`,
        code: "ERR_DURATION_OUT_OF_BOUNDS"
      });
    }

    // 2. Audio Reference Validation (Required for VOICE)
    if (sample.speech_type === "VOICE") {
      if (!sample.audio_reference || typeof sample.audio_reference !== "object") {
        errors.push({
          field: "audio_reference",
          message: "audio_reference object is mandatory for VOICE speech_type",
          code: "ERR_AUDIO_REFERENCE_MISSING"
        });
      } else {
        if (!sample.audio_reference.file_path || typeof sample.audio_reference.file_path !== "string") {
          errors.push({
            field: "audio_reference.file_path",
            message: "audio_reference.file_path is required",
            code: "ERR_AUDIO_PATH_MISSING"
          });
        }
        if (!sample.audio_reference.file_checksum_sha256 || !this.SHA256_REGEX.test(sample.audio_reference.file_checksum_sha256)) {
          errors.push({
            field: "audio_reference.file_checksum_sha256",
            message: "audio_reference.file_checksum_sha256 must be a valid 64-char hex string",
            code: "ERR_AUDIO_SHA256_INVALID"
          });
        }
        if (typeof sample.audio_reference.sample_rate_hz !== "number" || sample.audio_reference.sample_rate_hz < 16000) {
          errors.push({
            field: "audio_reference.sample_rate_hz",
            message: `sample_rate_hz must be >= 16000 Hz (received: ${sample.audio_reference.sample_rate_hz})`,
            code: "ERR_SAMPLE_RATE_TOO_LOW"
          });
        }
        if (typeof sample.audio_reference.snr_db !== "number" || sample.audio_reference.snr_db < 15.0) {
          warnings.push(`audio_reference.snr_db is ${sample.audio_reference.snr_db}dB (minimum recommended: 15.0dB)`);
        }
      }
    }

    // 3. Transcript Reference Validation
    if (!sample.transcript_reference || typeof sample.transcript_reference !== "object") {
      errors.push({
        field: "transcript_reference",
        message: "transcript_reference object is mandatory",
        code: "ERR_TRANSCRIPT_REFERENCE_MISSING"
      });
    } else {
      if (!sample.transcript_reference.file_path) {
        errors.push({
          field: "transcript_reference.file_path",
          message: "transcript_reference.file_path is required",
          code: "ERR_TRANSCRIPT_PATH_MISSING"
        });
      }
      if (!sample.transcript_reference.transcript_checksum_sha256 || !this.SHA256_REGEX.test(sample.transcript_reference.transcript_checksum_sha256)) {
        errors.push({
          field: "transcript_reference.transcript_checksum_sha256",
          message: "transcript_reference.transcript_checksum_sha256 must be a valid 64-char hex string",
          code: "ERR_TRANSCRIPT_SHA256_INVALID"
        });
      }
      if (typeof sample.transcript_reference.word_count !== "number" || sample.transcript_reference.word_count <= 0) {
        errors.push({
          field: "transcript_reference.word_count",
          message: "transcript_reference.word_count must be a positive integer",
          code: "ERR_WORD_COUNT_INVALID"
        });
      }
      if (sample.transcript_reference.vietnamese_diacritics_valid !== true) {
        errors.push({
          field: "transcript_reference.vietnamese_diacritics_valid",
          message: "transcript_reference.vietnamese_diacritics_valid must be explicitly true",
          code: "ERR_DIACRITICS_INVALID"
        });
      }
    }

    // 4. Audit & Legal Consent Validation
    if (!sample.audit || typeof sample.audit !== "object") {
      errors.push({
        field: "audit",
        message: "audit object is mandatory",
        code: "ERR_AUDIT_OBJECT_MISSING"
      });
    } else {
      if (sample.audit.is_synthetic !== false) {
        errors.push({
          field: "audit.is_synthetic",
          message: "CRITICAL: audit.is_synthetic MUST be false for real calibration data",
          code: "ERR_SYNTHETIC_DATA_PROHIBITED"
        });
      }
      if (!sample.audit.consent_form_id || typeof sample.audit.consent_form_id !== "string") {
        errors.push({
          field: "audit.consent_form_id",
          message: "audit.consent_form_id is required to link legal consent form",
          code: "ERR_CONSENT_ID_MISSING"
        });
      }
    }

    return {
      valid: errors.length === 0,
      sample_id: sample.sample_id,
      errors,
      warnings
    };
  }

  /**
   * Validate a collection of 50 samples for duplicate IDs and hashes
   */
  public static validateBatchIntegrity(samples: any[]): { valid: boolean; duplicate_ids: string[]; duplicate_hashes: string[] } {
    const idSet = new Set<string>();
    const hashSet = new Set<string>();
    const duplicate_ids: string[] = [];
    const duplicate_hashes: string[] = [];

    for (const sample of samples) {
      if (sample && sample.sample_id) {
        if (idSet.has(sample.sample_id)) {
          duplicate_ids.push(sample.sample_id);
        } else {
          idSet.add(sample.sample_id);
        }
      }

      if (sample && sample.audio_reference && sample.audio_reference.file_checksum_sha256) {
        const hash = sample.audio_reference.file_checksum_sha256;
        if (hashSet.has(hash)) {
          duplicate_hashes.push(hash);
        } else {
          hashSet.add(hash);
        }
      }
    }

    return {
      valid: duplicate_ids.length === 0 && duplicate_hashes.length === 0,
      duplicate_ids,
      duplicate_hashes
    };
  }
}
