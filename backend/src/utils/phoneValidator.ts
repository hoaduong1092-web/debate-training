export class PhoneValidator {
  /**
   * Normalizes Vietnamese and international numbers to E.164 standard.
   * Example: "0901234567" -> "+84901234567", "84901234567" -> "+84901234567"
   */
  static normalizeE164(phone: string): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '+84' + cleaned.substring(1);
    } else if (cleaned.startsWith('84') && !cleaned.startsWith('+84')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+84' + cleaned;
    }

    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(cleaned)) {
      return null;
    }
    return cleaned;
  }
}
