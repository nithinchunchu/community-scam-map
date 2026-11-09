import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../api/client';
import {
  ShieldAlert,
  Eye,
  Search,
  BadgeCheck,
  AlertTriangle,
  PhoneCall,
  ExternalLink,
  Calendar,
  Lock,
  ArrowLeft,
  Share2,
  FileText
} from 'lucide-react';

interface LookupResponse {
  verdict: 'KNOWN_SCAM' | 'SUSPICIOUS' | 'NO_REPORTS' | 'VERIFIED_BUSINESS';
  report_count: number;
  distinct_reporters: number;
  first_seen: string | null;
  last_seen: string | null;
  scam_type: string | null;
  display_value: string;
  evidence: Array<{
    occurred_at: string;
    channel: string;
    scam_type: string;
    pincode: string;
  }>;
  challenged: boolean;
  verified_name?: string;
}

export const Result: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, currentPincode } = useApp();

  const type = searchParams.get('type') || 'phone';
  const rawValue = searchParams.get('value') || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<LookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawValue) {
      navigate('/');
      return;
    }

    setLoading(true);
    setError(null);

    apiRequest<LookupResponse>(`/lookup?type=${encodeURIComponent(type)}&value=${encodeURIComponent(rawValue)}`)
      .then((res) => {
        setData(res);
      })
      .catch((err: any) => {
        setError(err.data?.error || t.serverError);
      })
      .finally(() => setLoading(false));
  }, [type, rawValue]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-teal border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-medium tracking-wide">Checking community records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center shadow space-y-4 my-6">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Lookup Error</h3>
        <p className="text-xs text-slate-600">{error || 'Unable to check this value.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-navy text-white text-xs font-semibold"
        >
          Back to Search
        </button>
      </div>
    );
  }

  // Visual verdict mappings
  const verdictConfig = {
    KNOWN_SCAM: {
      bg: 'bg-red-50 border-red-300',
      badgeBg: 'bg-red-600',
      text: 'text-red-950',
      icon: ShieldAlert,
      iconColor: 'text-red-600',
      title: t.verdicts.knownScam,
      desc: data.distinct_reporters >= 1 ? t.reportedByNearYou.replace('{count}', String(data.distinct_reporters)) : ''
    },
    SUSPICIOUS: {
      bg: 'bg-amber-50 border-amber-300',
      badgeBg: 'bg-amber-600',
      text: 'text-amber-950',
      icon: Eye,
      iconColor: 'text-amber-600',
      title: t.verdicts.suspicious,
      desc: t.reportedByNearYou.replace('{count}', String(data.distinct_reporters))
    },
    NO_REPORTS: {
      bg: 'bg-slate-50 border-slate-300',
      badgeBg: 'bg-slate-600',
      text: 'text-slate-900',
      icon: Search,
      iconColor: 'text-slate-500',
      title: t.verdicts.noReports,
      desc: t.noReportsWarning
    },
    VERIFIED_BUSINESS: {
      bg: 'bg-emerald-50 border-emerald-300',
      badgeBg: 'bg-emerald-600',
      text: 'text-emerald-950',
      icon: BadgeCheck,
      iconColor: 'text-emerald-600',
      title: t.verdicts.verifiedBusiness,
      desc: data.verified_name || t.verifiedBadgeText
    }
  };

  const currentConfig = verdictConfig[data.verdict] || verdictConfig.NO_REPORTS;
  const VerdictIcon = currentConfig.icon;

  const safetyText = data.scam_type
    ? t.safetyAdvice[data.scam_type] || t.safetyAdvice['other']
    : t.safetyAdvice['other'];

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return '—';
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-navy font-semibold py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to search</span>
      </button>

      {/* Main Verdict Card */}
      <div className={`rounded-3xl p-5 border shadow-md space-y-4 ${currentConfig.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 ${currentConfig.iconColor}`}>
              <VerdictIcon className="w-7 h-7" />
            </div>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider ${currentConfig.badgeBg}`}>
                {currentConfig.title}
              </span>
              <h2 className={`text-xl font-bold tracking-tight mt-1 ${currentConfig.text}`}>
                {data.display_value}
              </h2>
            </div>
          </div>
        </div>

        {/* Careful legal / community summary text */}
        <p className={`text-xs leading-relaxed font-medium ${currentConfig.text}`}>
          {currentConfig.desc}
        </p>

        {data.challenged && (
          <div className="bg-amber-100 text-amber-900 text-xs px-3 py-2 rounded-xl border border-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>This number has an active dispute under review.</span>
          </div>
        )}

        {/* Distinct reporters badge & Masking info */}
        {data.distinct_reporters < 3 && data.verdict !== 'VERIFIED_BUSINESS' && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/70 px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.maskedExplanation}</span>
          </div>
        )}
      </div>

      {/* Timeline Card */}
      {data.verdict !== 'NO_REPORTS' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal" />
            <span>Timeline & Reports</span>
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t.firstSeen}</span>
              <span className="font-bold text-slate-800">{formatDate(data.first_seen)}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t.lastSeen}</span>
              <span className="font-bold text-slate-800">{formatDate(data.last_seen)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Safety Protocol Advice */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-teal" />
          <span>Safety Advice</span>
        </h4>
        <p className="text-xs text-slate-700 leading-relaxed bg-teal/5 p-3 rounded-xl border border-teal/10">
          {safetyText}
        </p>
      </div>

      {/* Emergency Helpline Direct Escalation */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div>
          <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Official Support</span>
          <h4 className="text-sm font-bold">Lost money or received threats?</h4>
          <p className="text-xs text-slate-300 mt-0.5">Call cyber police immediately to block unauthorized accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="tel:1930"
            className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Dial 1930</span>
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <span>cybercrime.gov.in</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          to={`/dispute?type=${encodeURIComponent(type)}&value=${encodeURIComponent(data.display_value)}`}
          className="text-xs text-slate-600 hover:text-navy underline flex items-center gap-1 font-medium"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.disputeButtonText}</span>
        </Link>

        <Link
          to="/report"
          state={{ initialValue: data.display_value }}
          className="text-xs text-teal hover:underline flex items-center gap-1 font-semibold"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{t.reportAgainButtonText}</span>
        </Link>
      </div>
    </div>
  );
};
