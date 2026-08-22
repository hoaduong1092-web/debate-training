/**
 * Domain Types for Voice Session Lifecycle & Entitlement Engine.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * Phase: B5 — Server-Side 15-Minute Cap & Boundary Guards
 */

export type VoiceSessionStatus =
  | 'CREATED'
  | 'ACTIVE'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'ABORTED'
  | 'TIMEOUT'
  | 'FAILED';

export type VoiceEntitlementMode = 'TIME_UNLIMITED' | 'QUOTA';

export type VoiceEntitlementSource = 'VIP' | 'SUBSCRIPTION' | 'ADD_ON' | 'TRIAL' | null;

export interface VoiceEntitlementBreakdown {
  subscriptionMinutes: number;
  addonMinutes: number;
  trialMinutes: number;
  vipPassCode: string | null;
  activePacks?: Array<{
    packId: string;
    packCode: string;
    remainingUnits: number;
    expiresAt: Date;
  }>;
  activeTrial?: {
    trialId: string;
    voiceMinsRemaining: number;
    expiresAt: Date;
  } | null;
}

export interface VoiceEntitlementResult {
  allowed: boolean;
  mode: VoiceEntitlementMode;
  source: VoiceEntitlementSource;
  availableMinutes: number | null;
  maxAllowedMs: number;
  breakdown?: VoiceEntitlementBreakdown;
  reason?: string;
}

export interface CreateVoiceSessionInput {
  userId: string;
  debateSessionId?: string;
}

export type VoiceFinalizeReason =
  | 'NORMAL'
  | 'TIMEOUT'
  | 'DISCONNECT'
  | 'USER_STOP'
  | 'SERVER_CUTOFF'
  | 'CLIENT_DISCONNECT';

export interface FinalizeVoiceSessionInput {
  voiceSessionId: string;
  userId: string;
  actualDurationMs?: number | any; // Untrusted client payload (sanitized server-side)
  reason?: VoiceFinalizeReason | string;
}

export interface AbortVoiceSessionInput {
  voiceSessionId: string;
  userId: string;
  reason?: string;
}

export interface VoiceSessionDTO {
  id: string;
  userId: string;
  debateSessionId: string | null;
  status: VoiceSessionStatus;
  startedAt: string;
  endedAt: string | null;
  maxAllowedMs: number;
  actualDurationMs: number;
  billableMinutes: number;
  consumedSubMins: number;
  consumedAddonMins: number;
  consumptionDetails?: any;
  isFinalized: boolean;
  finalizedAt: string | null;
  createdAt: string;
}

/** WebSocket outgoing message frame emitted 30s before session cap */
export interface VoiceSessionExpiringSoonMessage {
  type: 'VOICE_SESSION_EXPIRING_SOON';
  voiceSessionId: string;
  maxAllowedMs: number;
  remainingMs: number;
}

/** WebSocket outgoing message frame emitted when server cap / quota limit is reached */
export interface VoiceSessionCapReachedMessage {
  type: 'VOICE_SESSION_CAP_REACHED';
  voiceSessionId: string;
  maxAllowedMs: number;
  reason: 'TECHNICAL_15M_CAP' | 'ENTITLEMENT_EXHAUSTED';
}
