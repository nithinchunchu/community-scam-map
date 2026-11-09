import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api, LicenseStatus, VisionStatusResponse } from '../api/client';
import {
  Settings,
  X,
  ShieldAlert,
  Database,
  Lock,
  Globe,
  MapPin,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Key,
  Clock,
  AlertTriangle,
  Cpu,
  ArrowRight
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { lang, setLang, currentPincode, areas, autoDetectAndLock, isDetectingLocation } = useApp();
  const currentArea = areas.find((a) => a.pincode === currentPincode);

  // API Details & Telemetry State
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [visionStatus, setVisionStatus] = useState<VisionStatusResponse | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState<boolean>(false);
  const [probingLLM, setProbingLLM] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingTelemetry(true);

    Promise.allSettled([api.getLicense(), api.getVisionStatus()]).then(([licRes, visRes]) => {
      if (!isMounted) return;
      if (licRes.status === 'fulfilled') setLicense(licRes.value);
      if (visRes.status === 'fulfilled') setVisionStatus(visRes.value);
      setLoadingTelemetry(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleProbeLLM = async () => {
    setProbingLLM(true);
    try {
      const res = await api.getVisionStatus();
      setVisionStatus(res);
    } catch {
      // offline fallback
    } finally {
      setProbingLLM(false);
    }
  };

  const handleOpenAdmin = (tab: 'database' | 'vision' | 'license' = 'database') => {
    onClose();
    navigate('/admin', { state: { tab } });
  };

  const formatRemaining = (seconds?: number) => {
    if (seconds === undefined) return 'Checking...';
    if (seconds <= 0) return 'Expired';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h remaining`;
    if (h > 0) return `${h}h ${m}m remaining`;
    return `${m}m remaining`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal/10 text-teal flex items-center justify-center font-bold">
              <Settings className="w-4 h-4 text-teal" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {lang === 'hi' ? 'सेटिंग्स और सिस्टम' : 'Settings & System'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {lang === 'hi' ? 'सिस्टम कॉन्फ़िगरेशन और एडमिनिस्ट्रेटर विकल्प' : 'System configuration & administrator tools'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Administrator / Judge Console Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-navy text-white shadow-md space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal/20 text-teal flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-teal" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Judge &amp; Admin Console
                  </h3>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-teal/30 text-teal-200 border border-teal/40">
                    Administrator Access
                  </span>
                </div>
              </div>
              <span className="p-1 rounded-md bg-white/10 text-slate-300">
                <Lock className="w-3.5 h-3.5" />
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Inspect live database tables, check reported fraud records, monitor server telemetry &amp; clock guards, verify Ed25519 licences, and test the Multimodal Vision LLM.
            </p>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenAdmin('database')}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-teal hover:bg-teal-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Check Database</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAdmin('vision')}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer border border-purple-400/40"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>LLM-api</span>
              </button>
            </div>
          </div>

          {/* API Details & Expiry Section (For Admin) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Key className="w-3.5 h-3.5 text-teal" />
                API Details &amp; Expiry (Admin Telemetry)
              </span>
              <button
                type="button"
                onClick={handleProbeLLM}
                disabled={probingLLM}
                className="p-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Refresh API telemetry"
              >
                <RefreshCw className={`w-3 h-3 ${probingLLM ? 'animate-spin text-teal' : ''}`} />
                <span>Probe</span>
              </button>
            </div>

            {/* 1. Ed25519 Licence Details & Expiry */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Ed25519 Signed Licence
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  license?.status === 'valid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {license?.status === 'valid' ? 'ACTIVE & VALID' : 'EXPIRED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Licensee:</span>
                  <span className="font-mono font-bold text-slate-800">{license?.licensee || 'Judges / Admin'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Time Remaining:</span>
                  <span className="font-mono font-bold text-teal flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {license ? formatRemaining(license.seconds_remaining) : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Expires At:</span>
                <span className="font-mono text-slate-700">{license?.expires_at ? license.expires_at.slice(0, 19).replace('T', ' ') : 'N/A'}</span>
              </div>
            </div>

            {/* 2. Multimodal Vision LLM API Details & Info */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-slate-800">LLM-API (Multimodal Vision)</span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  visionStatus?.status === 'ONLINE_ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${visionStatus?.status === 'ONLINE_ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {visionStatus?.status === 'ONLINE_ACTIVE' ? 'Google Gemini Live' : 'Offline Fail-Safe Active'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Model:</span>
                  <span className="font-mono font-bold text-slate-800">gemini-flash-latest</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">API Endpoint:</span>
                  <span className="font-mono text-slate-700 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">POST /scan-screenshot</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Auth Header:</span>
                  <span className="font-mono text-slate-700 text-[10px]">X-goog-api-key (.env)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">API Expiry / Quota:</span>
                  <span className="font-mono text-slate-800 font-semibold text-[10px]">Perpetual Tier (15 RPM / 1M TPM)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fail-Safe Protocol:</span>
                  <span className="text-emerald-700 font-bold text-[10px]">Auto-switches to Offline Heuristic LLM</span>
                </div>
              </div>

              {/* Info About API */}
              <div className="text-[11px] text-slate-600 leading-relaxed bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 space-y-1">
                <span className="font-bold text-purple-900 block">ℹ️ Info About LLM-api:</span>
                <p>
                  Multimodal computer vision pipeline connecting user evidence (WhatsApp chats, fake court FIRs, UPI receipts, power cut SMS) to Google Gemini Flash. Extracts suspicious numbers/UPIs, measures urgency levels, and detects digital editing artifacts.
                </p>
              </div>

              {/* LLM-api Button */}
              <button
                type="button"
                onClick={() => handleOpenAdmin('vision')}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center justify-between cursor-pointer group shadow-sm active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
                  <span>Open LLM-api</span>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase">
                  <span>LLM-api Console</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>

          {/* Location Centroid Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal" />
                {lang === 'hi' ? 'सुरक्षित नगरपालिका क्षेत्र' : 'Safe Municipal Centroid'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-md border border-teal/20">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            </div>

            <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200">
              <div>
                <p className="font-semibold text-slate-900">
                  {currentArea ? `${currentArea.locality}, ${currentArea.city}` : currentPincode}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">PIN: {currentPincode}</p>
              </div>
              <button
                onClick={autoDetectAndLock}
                disabled={isDetectingLocation}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin text-teal' : ''}`} />
                <span>{isDetectingLocation ? 'Detecting...' : 'Re-detect'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Location is permanently locked to verified postal centroids to eliminate GPS spoofing and protect reporter privacy.
            </p>
          </div>

          {/* Language Selection */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {lang === 'hi' ? 'भाषा (Language)' : 'Display Language'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'hi' ? 'हिंदी या अंग्रेजी चुनें' : 'Choose English or Hindi'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  lang === 'en' ? 'bg-teal text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  lang === 'hi' ? 'bg-teal text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>

          {/* Privacy & Anti-Spoofing Status */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Multi-Layer Anti-Spoofing Protection Active</span>
            </div>
            <ul className="text-[11px] text-emerald-700 space-y-0.5 pl-5 list-disc">
              <li>Layer 1: Simulated mock location &amp; accuracy check</li>
              <li>Layer 2: IP subnet /24 HMAC clustering</li>
              <li>Layer 3: Client-side EXIF &amp; GPS purging on screenshots</li>
              <li>Layer 4: Velocity travel guard (&gt;600 km/h impossible travel check)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> System Online
          </span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
