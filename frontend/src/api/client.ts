export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(typeof data?.error === 'string' ? data.error : 'API request failed');
    this.status = status;
    this.data = data;
  }
}

export interface LicenseStatus {
  licensee: string | null;
  expires_at: string | null;
  status: 'valid' | 'expired';
  seconds_remaining: number;
  reason?: string;
}

export interface AlertItem {
  pincode: string;
  type?: 'SPIKE' | 'NEW_TYPE';
  alert_type?: 'SPIKE' | 'NEW_TYPE';
  locality?: string;
  city?: string;
  scam_type?: string;
  count?: number;
  baseline_per_day?: number;
  created_at?: string;
}

export interface EvidenceItem {
  occurred_at: string;
  channel: string;
  scam_type: string;
  pincode: string;
}

export interface LookupResponse {
  verdict: 'KNOWN_SCAM' | 'SUSPICIOUS' | 'NO_REPORTS' | 'VERIFIED_BUSINESS';
  report_count: number;
  distinct_reporters: number;
  first_seen: string | null;
  last_seen: string | null;
  scam_type: string | null;
  display_value: string;
  evidence: EvidenceItem[];
  challenged: boolean;
  verified_name?: string | null;
}

export interface MapAreaItem {
  pincode: string;
  locality: string;
  city: string;
  lat: number;
  lng: number;
  count: number;
  severity: 'CRIT' | 'HIGH' | 'MED';
  top_scam_type: string | null;
}

export interface ReportPayload {
  report_id: string;
  occurred_at: string;
  reported_at: string;
  reporter_id?: string;
  ip_prefix?: string;
  channel: string;
  scam_type: string;
  identifier_type: string;
  identifier_value: string;
  pincode: string;
  locality: string;
  city: string;
  note?: string;
  has_screenshot?: boolean;
  amount_lost_inr?: number;
}

export interface ChallengePayload {
  identifier_type: string;
  identifier_value: string;
  claimant_name: string;
  contact_email: string;
  reason: string;
}

let licenseExpiredCallback: ((expired: boolean) => void) | null = null;
let licensePollingTimer: any = null;

export function registerLicenseListener(callback: (expired: boolean) => void) {
  licenseExpiredCallback = callback;
}

export function startLicensePolling() {
  if (licensePollingTimer) return;
  licensePollingTimer = setInterval(async () => {
    try {
      const res = await fetch('/license');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'valid') {
          if (licenseExpiredCallback) licenseExpiredCallback(false);
          clearInterval(licensePollingTimer);
          licensePollingTimer = null;
        }
      }
    } catch {
      // Still waiting
    }
  }, 15000);
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (res.status === 403) {
      try {
        const errorData = await res.clone().json();
        if (errorData?.error === 'LICENSE_EXPIRED') {
          if (licenseExpiredCallback) licenseExpiredCallback(true);
          startLicensePolling();
        }
      } catch {
        // Non JSON
      }
    }

    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch {
        errBody = { error: res.statusText };
      }
      throw new ApiError(res.status, errBody);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, { error: 'Network error or server unreachable. Please check connection.' });
  }
}

export interface DbReportItem {
  report_id: string;
  case_id: string;
  identifier_type: string;
  identifier_value: string;
  scam_type: string;
  channel: string;
  pincode: string;
  locality: string;
  city: string;
  occurred_at: string | null;
  reported_at: string | null;
  has_screenshot: boolean;
  amount_lost_inr: number;
}

export interface DbChallengeItem {
  challenge_id: string;
  identifier_type: string;
  identifier_value: string;
  claimant_name: string;
  status: string;
  created_at: string | null;
}

export interface DbVerifiedItem {
  identifier_type: string;
  identifier_value: string;
  owner_name: string;
}

export interface DatabaseInspectResponse {
  summary: {
    total_reports: number;
    total_challenges: number;
    total_verified: number;
    total_areas: number;
  };
  recent_reports: DbReportItem[];
  challenges: DbChallengeItem[];
  verified_identifiers: DbVerifiedItem[];
}

export interface ScreenshotScanResult {
  ok: boolean;
  verdict: 'KNOWN_SCAM' | 'SUSPICIOUS' | 'NO_REPORTS' | 'VERIFIED_BUSINESS' | 'POTENTIAL_SCAM';
  risk_score: number;
  confidence: number;
  scam_type: string;
  detected_identifier: string | null;
  detected_identifier_type: 'phone' | 'upi' | 'url' | 'sender_id';
  display_identifier: string;
  urgency_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  artifacts_detected: string[];
  scam_intent: string;
  community_data: {
    report_count: number;
    distinct_reporters: number;
    challenged: boolean;
  };
  summary: string;
  vision_engine?: string;
  fallback_notice?: string | null;
}

export interface VisionStatusResponse {
  status: 'ONLINE_ACTIVE' | 'API_KEY_EXPIRED' | 'QUOTA_EXCEEDED' | 'NETWORK_UNREACHABLE' | 'OFFLINE_FALLBACK_READY' | 'TEST_MODE' | 'ONLINE_UNAVAILABLE';
  active_engine: string;
  has_api_key: boolean;
  cloud_provider: string;
  message: string;
  hint: string;
}

export const api = {
  getHealth: () => apiRequest<{ ok: boolean }>('/health'),
  getVisionStatus: () => apiRequest<VisionStatusResponse>('/scan-screenshot/status'),
  getLicense: () => apiRequest<LicenseStatus>('/license'),
  uploadLicense: (payload: any) =>
    apiRequest<{ ok: boolean; message: string }>('/license', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  adminReset: () =>
    apiRequest<{ ok: boolean }>('/admin/reset', {
      method: 'POST'
    }),
  inspectDatabase: (limit: number = 100) =>
    apiRequest<DatabaseInspectResponse>(`/admin/db-inspect?limit=${limit}`),
  scanScreenshot: (payload: { image?: string; image_base64?: string; filename?: string }) =>
    apiRequest<ScreenshotScanResult>('/scan-screenshot', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getAlerts: async (pincode?: string): Promise<AlertItem[]> => {
    const url = pincode ? `/alerts?pincode=${encodeURIComponent(pincode)}` : '/alerts';
    const res = await apiRequest<any>(url);
    if (Array.isArray(res)) return res;
    return res?.alerts || [];
  },
  getMap: (days: number = 7) => apiRequest<MapAreaItem[]>(`/map?days=${days}`),
  lookup: (type: string, value: string) =>
    apiRequest<LookupResponse>(`/lookup?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`),
  submitReport: (report: ReportPayload) =>
    apiRequest<{ report_id: string; case_id: string; merged: boolean }>('/reports', {
      method: 'POST',
      body: JSON.stringify(report)
    }),
  createChallenge: (challenge: ChallengePayload) =>
    apiRequest<{ challenge_id: string; status: string; challenged: boolean }>('/challenges', {
      method: 'POST',
      body: JSON.stringify(challenge)
    })
};
