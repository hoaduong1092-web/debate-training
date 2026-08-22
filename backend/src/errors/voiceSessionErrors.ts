/**
 * Standardized Domain Errors for Voice Session Lifecycle.
 * Spec: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 */

export class VoiceSessionDomainError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, any>;

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, any>) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class VoiceQuotaExceededError extends VoiceSessionDomainError {
  constructor(message = 'Voice AI quota exceeded. Requires at least 1 minute.', details?: Record<string, any>) {
    super('VOICE_QUOTA_EXCEEDED', message, 403, details);
  }
}

export class VoiceSessionAlreadyActiveError extends VoiceSessionDomainError {
  constructor(message = 'User already has an active Voice session in progress.', details?: Record<string, any>) {
    super('VOICE_SESSION_ALREADY_ACTIVE', message, 409, details);
  }
}

export class VoiceSessionNotFoundError extends VoiceSessionDomainError {
  constructor(message = 'Voice session not found.', details?: Record<string, any>) {
    super('VOICE_SESSION_NOT_FOUND', message, 404, details);
  }
}

export class VoiceSessionInvalidStateError extends VoiceSessionDomainError {
  constructor(message = 'Invalid Voice session state transition.', details?: Record<string, any>) {
    super('VOICE_SESSION_INVALID_STATE', message, 400, details);
  }
}

export class VoiceSessionAlreadyFinalizedError extends VoiceSessionDomainError {
  constructor(message = 'Voice session is already finalized.', details?: Record<string, any>) {
    super('VOICE_SESSION_ALREADY_FINALIZED', message, 400, details);
  }
}

export class VoiceSessionNotOwnerError extends VoiceSessionDomainError {
  constructor(message = 'Forbidden: You do not own this voice session.', details?: Record<string, any>) {
    super('VOICE_SESSION_NOT_OWNER', message, 403, details);
  }
}

export class VoiceEntitlementUnavailableError extends VoiceSessionDomainError {
  constructor(message = 'Voice entitlement could not be resolved.', details?: Record<string, any>) {
    super('VOICE_ENTITLEMENT_UNAVAILABLE', message, 500, details);
  }
}
