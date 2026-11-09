export type IdentifierType = 'phone' | 'upi' | 'url' | 'sender_id';

const UPI_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z][a-zA-Z0-9]+$/;
const SENDER_ID_REGEX = /^(?:[A-Z]{2}-?)?([A-Z0-9]{6})(?:-[A-Z])?$/i;

export function autoDetectIdentifierType(raw: string): IdentifierType {
  const cleaned = raw.trim();
  if (!cleaned) return 'phone';

  // Check UPI
  if (cleaned.includes('@') && UPI_REGEX.test(cleaned.replace(/\s+/g, ''))) {
    return 'upi';
  }

  // Check URL
  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('www.') ||
    (cleaned.includes('.') && (cleaned.includes('.in') || cleaned.includes('.com') || cleaned.includes('.org') || cleaned.includes('.net') || cleaned.includes('/')))
  ) {
    return 'url';
  }

  // Check SMS sender ID (e.g. AD-HDFCBK or HDFCBK)
  const lettersOnly = cleaned.replace(/[^a-zA-Z0-9-]/g, '');
  if (SENDER_ID_REGEX.test(lettersOnly) && lettersOnly.length <= 11 && !/^\d+$/.test(lettersOnly)) {
    return 'sender_id';
  }

  // Default to phone
  return 'phone';
}

export function getOrCreateReporterId(): string {
  const key = 'scammap_anonymous_reporter_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

export function getSavedArea(): string {
  return localStorage.getItem('scammap_saved_pincode') || '560102'; // default HSR Layout
}

export function setSavedArea(pincode: string): void {
  localStorage.setItem('scammap_saved_pincode', pincode);
}

export function getSavedLanguage(): 'en' | 'hi' {
  const saved = localStorage.getItem('scammap_language');
  return saved === 'hi' ? 'hi' : 'en';
}

export function setSavedLanguage(lang: 'en' | 'hi'): void {
  localStorage.setItem('scammap_language', lang);
}
