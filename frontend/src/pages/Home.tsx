import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { autoDetectIdentifierType, IdentifierType } from '../utils/detector';
import { apiRequest } from '../api/client';
import { Search, ShieldAlert, AlertTriangle, ArrowRight, MapPin, ExternalLink, HelpCircle, Lock, ShieldCheck, Layers, Sparkles, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AlertItem {
  type: string;
  pincode: string;
  scam_type?: string;
  count?: number;
  baseline_per_day?: number;
}

export const Home: React.FC = () => {
  const { t, currentPincode, areas } = useApp();
  const navigate = useNavigate();

  const [inputVal, setInputVal] = useState('');
  const [detectedType, setDetectedType] = useState<IdentifierType>('phone');
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const selectedAreaObj = areas.find((a) => a.pincode === currentPincode) || areas[0];

  useEffect(() => {
    if (!inputVal.trim()) {
      setDetectedType('phone');
      return;
    }
    setDetectedType(autoDetectIdentifierType(inputVal));
  }, [inputVal]);

  useEffect(() => {
    if (!currentPincode) return;
    setLoadingAlerts(true);
    apiRequest<{ alerts: AlertItem[] }>(`/alerts?pincode=${currentPincode}`)
      .then((res) => {
        setActiveAlerts(res.alerts || []);
      })
      .catch(() => {
        setActiveAlerts([]);
      })
      .finally(() => setLoadingAlerts(false));
  }, [currentPincode]);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const type = autoDetectIdentifierType(inputVal);
    navigate(`/result?type=${encodeURIComponent(type)}&value=${encodeURIComponent(inputVal.trim())}`);
  };

  const handleReportClick = () => {
    navigate('/report', { state: { initialValue: inputVal.trim() } });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Automatically Locked Area Banner */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-slate-700 min-w-0">
          <MapPin className="w-4 h-4 text-teal flex-shrink-0" />
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Your Area:</span>
          <span className="text-xs font-bold text-navy bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            {selectedAreaObj ? `${selectedAreaObj.locality}, ${selectedAreaObj.city} (${selectedAreaObj.pincode})` : currentPincode}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20">
            <Lock className="w-2.5 h-2.5" /> Auto-Locked Centroid
          </span>
        </div>
        <Link to="/map" className="text-xs text-teal font-semibold hover:underline flex-shrink-0 flex items-center gap-1">
          <span>Explore Heatmap</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Local Alert Banner (if any) */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-3 shadow-sm animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                {t.savedAreaAlertTitle} • {selectedAreaObj?.locality}
              </h4>
              {activeAlerts.map((alt, idx) => (
                <p key={idx} className="text-xs text-amber-800 mt-0.5">
                  {alt.type === 'SPIKE'
                    ? t.spikeDescription
                    : `${t.newTypeDescription} (${t.scamTypes[alt.scam_type || ''] || alt.scam_type})`}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Search Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-md">
        <label htmlFor="search-input" className="block text-sm font-semibold text-slate-800 mb-2">
          {t.appName}: {t.searchPlaceholder.split('...')[0]}
        </label>

        <form onSubmit={handleCheck} className="space-y-3">
          <div className="relative">
            <input
              id="search-input"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-4 pr-24 py-3.5 text-base text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-all"
              autoFocus
            />
            {inputVal.trim() && (
              <span className="absolute right-2.5 top-2.5 px-2 py-1 rounded-md bg-teal/10 text-teal text-[11px] font-semibold tracking-wide uppercase">
                {t.autoDetectType[detectedType]}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              className="min-h-[48px] w-full flex items-center justify-center gap-2 rounded-xl bg-teal hover:bg-teal-dark active:scale-[0.98] text-white font-semibold text-sm shadow-md transition-all"
            >
              <Search className="w-4 h-4" />
              <span>{t.checkBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleReportClick}
              className="min-h-[48px] w-full flex items-center justify-center gap-2 rounded-xl bg-navy hover:bg-navy-light active:scale-[0.98] text-white font-semibold text-sm shadow-md transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>{t.reportBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* AI Multimodal Vision Instant Scan Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-teal/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal/20 text-teal flex items-center justify-center shrink-0 border border-teal/40 shadow-inner">
            <Sparkles className="w-5 h-5 text-teal" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                Multimodal Vision AI Scanner
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal/30 text-teal-200 border border-teal/40">
                Gemini Vision • OCR
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Have a screenshot of a suspicious WhatsApp message, fake police FIR, power cut SMS, or UPI receipt? Scan it with multimodal vision AI to extract entities, analyze urgency, and verify against community fraud records.
            </p>
          </div>
        </div>

        <Link
          to="/report"
          state={{ openScreenshot: true }}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-teal hover:bg-teal-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 active:scale-98 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Scan Screenshot with AI</span>
        </Link>
      </div>

      {/* Website Core Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-navy uppercase tracking-wide">Locked Municipal Zones</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Incident reports are strictly anchored to 27 pre-verified municipal centroids. Zero GPS tracking prevents fake location spoofing.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-navy uppercase tracking-wide">Anti-Sybil Trust Engine</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Burst attacks, copy-paste templated notes, and IP brigading are clustered and collapsed. Attack groups contribute zero to alerts.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-navy uppercase tracking-wide">Strict Privacy Architecture</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Victim numbers are masked until 3 independent reports near you. Zero raw notes, IPs, or reporter IDs exist in the database.
          </p>
        </div>
      </div>

      {/* Verified Helplines Card */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
        <div>
          <span className="inline-block px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase mb-1">
            Official Protection
          </span>
          <h4 className="text-xs font-bold text-emerald-950">National Cybercrime Helpline</h4>
          <p className="text-[11px] text-emerald-800">Dial 1930 immediately if money was deducted.</p>
        </div>
        <a
          href="tel:1930"
          className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
        >
          <span>Call 1930</span>
        </a>
      </div>

      {/* Quick Links & Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-2">
        <Link to="/dispute" className="hover:text-slate-800 underline flex items-center gap-1">
          <span>{t.disputeTitle}</span>
        </Link>
        <Link to="/privacy" className="hover:text-slate-800 underline flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{t.privacyTab}</span>
        </Link>
        <a
          href="https://cybercrime.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-800 underline flex items-center gap-1"
        >
          <span>cybercrime.gov.in</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
