import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, LicenseStatus, DatabaseInspectResponse, DbReportItem, DbChallengeItem, DbVerifiedItem, ScreenshotScanResult, VisionStatusResponse } from '../api/client';
import {
  Server,
  Key,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Database,
  Search,
  FileText,
  Building2,
  MapPin,
  Sparkles,
  UploadCloud,
  X,
  Code,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertCircle
} from 'lucide-react';

const ADMIN_PASSWORDS = ['admin2026', 'judge2026', 'scammap2026'];

export const AdminPage: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('scammap_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const location = useLocation();

  // Active Console Tab
  const [activeTab, setActiveTab] = useState<'database' | 'vision' | 'license' | 'reset'>(() => {
    const requestedTab = (location.state as any)?.tab;
    if (requestedTab && ['database', 'vision', 'license', 'reset'].includes(requestedTab)) {
      return requestedTab;
    }
    return 'database';
  });

  // Multimodal Vision LLM State
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionFileName, setVisionFileName] = useState<string>('');
  const [visionScanning, setVisionScanning] = useState<boolean>(false);
  const [visionResult, setVisionResult] = useState<ScreenshotScanResult | null>(null);
  const [visionError, setVisionError] = useState<string>('');
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [visionStatus, setVisionStatus] = useState<VisionStatusResponse | null>(null);
  const [checkingVisionStatus, setCheckingVisionStatus] = useState<boolean>(false);

  const checkVisionConnection = async () => {
    setCheckingVisionStatus(true);
    try {
      const res = await api.getVisionStatus();
      setVisionStatus(res);
    } catch {
      // offline fallback
    } finally {
      setCheckingVisionStatus(false);
    }
  };

  const runVisionTest = async (dataBase64: string, filename: string) => {
    setVisionFileName(filename);
    setVisionScanning(true);
    setVisionError('');
    setVisionResult(null);
    try {
      const res = await api.scanScreenshot({
        image_base64: dataBase64,
        filename: filename
      });
      setVisionResult(res);
    } catch (err: any) {
      setVisionError(err?.message || 'Multimodal Vision scan failed.');
    } finally {
      setVisionScanning(false);
    }
  };

  const handleVisionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVisionFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setVisionImage(dataUrl);
      const b64 = dataUrl.split(',')[1] || '';
      runVisionTest(b64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const runPresetTest = (title: string, textLines: string[], filename: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(title, 24, 45);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px monospace';
      textLines.forEach((line, idx) => {
        ctx.fillText(line, 24, 90 + idx * 28);
      });

      const dataUrl = canvas.toDataURL('image/png');
      setVisionImage(dataUrl);
      const b64 = dataUrl.split(',')[1] || '';
      runVisionTest(b64, filename);
    }
  };

  // Database Inspection State
  const [dbData, setDbData] = useState<DatabaseInspectResponse | null>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(false);
  const [dbSubTab, setDbSubTab] = useState<'reports' | 'challenges' | 'verified'>('reports');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // License & Telemetry State
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loadingLicense, setLoadingLicense] = useState<boolean>(true);
  const [serverTime, setServerTime] = useState<string>(new Date().toISOString());
  const [healthStatus, setHealthStatus] = useState<string>('checking');

  // License uploader state
  const [jsonInput, setJsonInput] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Reset state
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (ADMIN_PASSWORDS.includes(passwordInput.trim())) {
      sessionStorage.setItem('scammap_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Incorrect administrator password. (Default passkey: admin2026)');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('scammap_admin_auth');
    setIsAuthenticated(false);
  };

  const fetchDatabase = async () => {
    setLoadingDb(true);
    try {
      const data = await api.inspectDatabase(200);
      setDbData(data);
    } catch {
      // Offline or network error
    } finally {
      setLoadingDb(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const h = await api.getHealth();
      setHealthStatus(h.ok ? 'healthy' : 'degraded');
    } catch {
      setHealthStatus('offline');
    }

    try {
      setLoadingLicense(true);
      const lic = await api.getLicense();
      setLicense(lic);
    } catch {
      // license error
    } finally {
      setLoadingLicense(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDatabase();
      fetchStatus();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setServerTime(new Date().toISOString());
      setLicense((prev) => {
        if (!prev || prev.status !== 'valid' || prev.seconds_remaining <= 0) return prev;
        return { ...prev, seconds_remaining: Math.max(0, prev.seconds_remaining - 1) };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUploadLicense = async () => {
    setUploadResult(null);
    try {
      const parsed = JSON.parse(jsonInput);
      setIsUploading(true);
      const res = await api.uploadLicense(parsed);
      setUploadResult({ ok: true, msg: res.message || 'Licence activated successfully!' });
      await fetchStatus();
    } catch (err: any) {
      setUploadResult({ ok: false, msg: err?.message || 'Invalid JSON format or bad signature' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDb = async () => {
    if (!window.confirm('Reset database? This clears all reports and disputes, keeping the active licence and re-seeding verified data.')) {
      return;
    }
    setIsResetting(true);
    try {
      await api.adminReset();
      setResetSuccess(true);
      await fetchDatabase();
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (err: any) {
      alert('Reset failed: ' + (err?.message || 'Server error'));
    } finally {
      setIsResetting(false);
    }
  };

  const formatRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Filtered Database Records
  const q = searchQuery.toLowerCase().trim();

  const filteredReports = (dbData?.recent_reports || []).filter((r: DbReportItem) => {
    if (!q) return true;
    return (
      r.identifier_value.toLowerCase().includes(q) ||
      r.report_id.toLowerCase().includes(q) ||
      r.scam_type.toLowerCase().includes(q) ||
      r.pincode.includes(q) ||
      r.locality.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.channel.toLowerCase().includes(q)
    );
  });

  const filteredChallenges = (dbData?.challenges || []).filter((c: DbChallengeItem) => {
    if (!q) return true;
    return (
      c.identifier_value.toLowerCase().includes(q) ||
      c.challenge_id.toLowerCase().includes(q) ||
      c.claimant_name.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
    );
  });

  const filteredVerified = (dbData?.verified_identifiers || []).filter((v: DbVerifiedItem) => {
    if (!q) return true;
    return (
      v.identifier_value.toLowerCase().includes(q) ||
      v.owner_name.toLowerCase().includes(q) ||
      v.identifier_type.toLowerCase().includes(q)
    );
  });

  // -------------------------------------------------------------
  // 1. Password Lock Gate (When Not Authenticated)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto pt-8 pb-20 px-3">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Card Top Accent */}
          <div className="bg-gradient-to-r from-navy via-slate-800 to-navy p-6 text-center text-white">
            <div className="w-14 h-14 rounded-2xl bg-teal/20 text-teal flex items-center justify-center mx-auto mb-3 shadow-inner border border-teal/30">
              <Lock className="w-7 h-7 text-teal" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Judge &amp; Admin Console
            </h1>
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-teal/20 text-teal-200 border border-teal/40">
              <ShieldAlert className="w-3.5 h-3.5 text-teal" />
              <span>Administrator Access Required</span>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              Please enter the secure administrator passkey to inspect database records, monitor server telemetry, and manage test reset tools.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Administrator Passkey
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    placeholder="Enter passkey..."
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal focus:ring-2 focus:ring-teal/20 text-xs text-slate-900 outline-none transition-all pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-teal hover:bg-teal-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Authenticate as Administrator</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Security Protected</span>
              <span className="font-mono text-slate-500">Passkey: admin2026</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. Authenticated Administrator Console
  // -------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20 px-2 sm:px-4">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-navy flex items-center gap-2">
              <Server className="w-5 h-5 text-teal" />
              Judge &amp; Admin Console
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Administrator Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Live database inspection, system telemetry, Ed25519 licence verification, and judge demo reset
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchDatabase();
              fetchStatus();
            }}
            aria-label="Refresh console data"
            title="Refresh database and telemetry"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[40px] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDb || loadingLicense ? 'animate-spin text-teal' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            title="Lock console and clear admin session"
            className="p-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[40px] cursor-pointer shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-teal" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* Main Console Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'database'
              ? 'bg-white text-navy shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-teal" />
          <span>Check Database ({dbData?.summary.total_reports ?? 0} Reports)</span>
        </button>

        <button
          onClick={() => setActiveTab('vision')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'vision'
              ? 'bg-white text-navy shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Multimodal Vision LLM Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('license')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'license'
              ? 'bg-white text-navy shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4 text-teal" />
          <span>Licence &amp; Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('reset')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'reset'
              ? 'bg-white text-navy shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
          <span>Judge Environment Reset</span>
        </button>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* TAB 1: DATABASE INSPECTOR                                    */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal" /> Total Reports
              </span>
              <p className="text-xl font-extrabold text-navy mt-1 font-mono">
                {dbData?.summary.total_reports ?? 0}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Active Disputes
              </span>
              <p className="text-xl font-extrabold text-navy mt-1 font-mono">
                {dbData?.summary.total_challenges ?? 0}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Businesses
              </span>
              <p className="text-xl font-extrabold text-navy mt-1 font-mono">
                {dbData?.summary.total_verified ?? 19}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal" /> Monitored Centroids
              </span>
              <p className="text-xl font-extrabold text-navy mt-1 font-mono">
                {dbData?.summary.total_areas ?? 47}
              </p>
            </div>
          </div>

          {/* Database Sub-Navigation & Search */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDbSubTab('reports')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dbSubTab === 'reports'
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live Reports ({filteredReports.length})
                </button>

                <button
                  onClick={() => setDbSubTab('challenges')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dbSubTab === 'challenges'
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Disputes ({filteredChallenges.length})
                </button>

                <button
                  onClick={() => setDbSubTab('verified')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dbSubTab === 'verified'
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Verified Businesses ({filteredVerified.length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex items-center min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-teal focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* 1. Reports Table */}
            {dbSubTab === 'reports' && (
              <div className="overflow-x-auto">
                {filteredReports.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Database className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">0 Reports in Database</p>
                    <p className="text-[11px] text-slate-500">
                      Clean database state. Reports submitted from the app or test tools will appear here immediately.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                        <th className="py-2.5 px-3">Report ID</th>
                        <th className="py-2.5 px-3">Identifier</th>
                        <th className="py-2.5 px-3">Scam Type</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-3">Occurred At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReports.map((r) => (
                        <tr key={r.report_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 font-semibold">
                            {r.report_id}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                            {r.identifier_value}
                            <span className="block text-[10px] text-slate-400 font-sans uppercase">
                              {r.identifier_type}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              {r.scam_type}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800">{r.locality}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">{r.pincode}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px]">
                            {r.channel}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            {r.occurred_at ? r.occurred_at.slice(0, 19).replace('T', ' ') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 2. Challenges Table */}
            {dbSubTab === 'challenges' && (
              <div className="overflow-x-auto">
                {filteredChallenges.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">0 Active Disputes</p>
                    <p className="text-[11px] text-slate-500">
                      No merchant or legitimate business challenges currently under review.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                        <th className="py-2.5 px-3">Challenge ID</th>
                        <th className="py-2.5 px-3">Disputed Identifier</th>
                        <th className="py-2.5 px-3">Claimant</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredChallenges.map((c) => (
                        <tr key={c.challenge_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 font-semibold">
                            {c.challenge_id}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                            {c.identifier_value}
                            <span className="block text-[10px] text-slate-400 font-sans uppercase">
                              {c.identifier_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium">
                            {c.claimant_name}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            {c.created_at ? c.created_at.slice(0, 19).replace('T', ' ') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 3. Verified Identifiers Table */}
            {dbSubTab === 'verified' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Canonical Value</th>
                      <th className="py-2.5 px-3">Belongs To / Entity Name</th>
                      <th className="py-2.5 px-3">Verdict Guarantee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVerified.map((v, i) => (
                      <tr key={`${v.identifier_type}-${v.identifier_value}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500 uppercase font-semibold">
                          {v.identifier_type}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {v.identifier_value}
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-medium">
                          {v.owner_name}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            VERIFIED_BUSINESS
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 2: MULTIMODAL VISION LLM INSPECTOR                       */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'vision' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-navy flex items-center gap-1.5">
                    <span>Multimodal Vision LLM &amp; Trust Engine</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                      Gemini 2.5 Flash / Vision OCR
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Live endpoint: <code className="font-mono text-slate-700 font-bold">POST /scan-screenshot</code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Norm Engine Active</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upload any screenshot (WhatsApp chat, UPI payment receipt, fake FIR / court notice, power cut SMS) or choose a judge test scenario below to observe how the Multimodal Vision LLM extracts entities, rates scam urgency, checks image integrity, and triggers trust immunity.
            </p>

            {/* Live LLM Connection Telemetry & Fail-Safe Diagnostics */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700">Cloud LLM Connection:</span>
                {visionStatus ? (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    visionStatus.status === 'ONLINE_ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${visionStatus.status === 'ONLINE_ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {visionStatus.status === 'ONLINE_ACTIVE' ? 'Google Gemini Live' : 'Offline Fail-Safe Engine Active'}
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">Click to probe live Google API status</span>
                )}
              </div>

              <button
                type="button"
                onClick={checkVisionConnection}
                disabled={checkingVisionStatus}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingVisionStatus ? 'animate-spin' : ''}`} />
                <span>{checkingVisionStatus ? 'Probing Gemini API...' : 'Check Cloud Connection'}</span>
              </button>
            </div>

            {visionStatus && (
              <div className={`p-3 rounded-2xl text-xs space-y-1 border ${
                visionStatus.status === 'ONLINE_ACTIVE'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{visionStatus.message}</span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Hint: {visionStatus.hint}
                </div>
              </div>
            )}

            {/* Quick Test Presets for Judges */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                1-Click Preset Scenarios (Synthetic Test Vectors)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    runPresetTest(
                      'SUPREME COURT / CBI NOTICE',
                      [
                        'ARREST WARRANT ISSUED',
                        'Case: Financial Money Laundering',
                        'Call Investigation Officer immediately:',
                        '+91 98765 43210',
                        'Urgent: Failure to report within 2 hrs',
                        'results in immediate physical detention.'
                      ],
                      'fake_supreme_court_arrest_notice.png'
                    )
                  }
                  className="p-2.5 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-red-700 flex items-center justify-between">
                    <span>🚨 Digital Arrest Notice</span>
                    <Zap className="w-3 h-3 text-red-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-[10px] text-red-600/80 mt-1">
                    Fake CBI/Police notice • Critical Urgency • 95 Risk
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    runPresetTest(
                      'TSPDCL POWER BILL ALERT',
                      [
                        'Dear Consumer, electricity connection',
                        'will be disconnected tonight at 9:30 PM',
                        'due to unpaid previous bill update.',
                        'Call Electricity Officer immediately:',
                        '+91 82476 04369',
                        'to avoid penalty disconnection.'
                      ],
                      'power_cut_sms_8247604369.png'
                    )
                  }
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-amber-800 flex items-center justify-between">
                    <span>⚡ Power Cut SMS</span>
                    <Zap className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-[10px] text-amber-700/80 mt-1">
                    Threatens disconnection • High Urgency • 85 Risk
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    runPresetTest(
                      'STATE BANK OF INDIA - OFFICIAL',
                      [
                        'SBI Customer Notice:',
                        'Your transaction was processed successfully.',
                        'Toll-free customer care: 1800 1234',
                        'Official Sender: SBIINB',
                        'Never share your OTP with anyone.'
                      ],
                      'sbi_bank_verified_sms.png'
                    )
                  }
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                    <span>🏦 Verified Bank SMS</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-[10px] text-emerald-700/80 mt-1">
                    SBI Customer Care • VERIFIED_BUSINESS • 0 Risk
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    runPresetTest(
                      'UPI REFUND CASHBACK',
                      [
                        'Congratulations! You received Rs 3,500',
                        'Cashback reward from payment gateway.',
                        'Scan QR or pay 1 INR to approve handle:',
                        'freshbakes@okaxis',
                        'Offer expires in 10 minutes.'
                      ],
                      'upi_qr_reward_freshbakes@okaxis.png'
                    )
                  }
                  className="p-2.5 rounded-xl border border-teal/30 bg-teal/5 hover:bg-teal/10 text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-teal flex items-center justify-between">
                    <span>💸 UPI Refund Claim</span>
                    <Zap className="w-3 h-3 text-teal group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    UPI Handle cross-reference &amp; Normalization check
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Screenshot Upload Box */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Interactive Image Test Bench
            </h3>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Drop / Pick Area */}
              <div className="flex-1">
                <label className="border-2 border-dashed border-purple-200 hover:border-purple-500 bg-purple-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group min-h-[160px]">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleVisionFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-inner">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-center">
                    Drag &amp; drop or click to upload screenshot
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    PNG, JPG, WebP • Auto EXIF strip • Multimodal OCR scan
                  </span>
                </label>
              </div>

              {/* Preview Thumbnail if loaded */}
              {visionImage && (
                <div className="w-full sm:w-60 bg-slate-900 rounded-2xl p-3 border border-slate-700 flex flex-col justify-between shrink-0 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-purple-300 font-bold truncate max-w-[160px]">
                      {visionFileName || 'screenshot.png'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVisionImage(null);
                        setVisionResult(null);
                      }}
                      className="text-slate-400 hover:text-white"
                      title="Clear image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <img
                    src={visionImage}
                    alt="Uploaded screenshot"
                    className="w-full h-28 object-contain rounded-lg bg-black/40 border border-slate-800"
                  />
                  <div className="text-[9px] font-mono text-slate-400 mt-2 text-center">
                    Loaded into LLM Context
                  </div>
                </div>
              )}
            </div>

            {/* Scanning State */}
            {visionScanning && (
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center gap-3 text-xs text-purple-800 font-semibold animate-pulse">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-600 shrink-0" />
                <div>
                  <div className="font-bold">Multimodal Vision LLM Analyzing Screenshot...</div>
                  <div className="text-[11px] text-purple-600 font-normal">
                    Running Gemini 2.5 Flash OCR, Scam Intent Classifier, and Trust Engine normalization.
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {visionError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{visionError}</span>
              </div>
            )}
          </div>

          {/* Vision LLM Analysis Results Card */}
          {visionResult && !visionScanning && (
            <div className="bg-white p-5 rounded-3xl border-2 border-purple-300/80 shadow-md space-y-4 animate-fade-in">
              {/* Header Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>AI Vision Decision</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                    visionResult.verdict === 'KNOWN_SCAM'
                      ? 'bg-red-600 text-white'
                      : visionResult.verdict === 'VERIFIED_BUSINESS'
                      ? 'bg-emerald-600 text-white'
                      : visionResult.verdict === 'SUSPICIOUS'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {visionResult.verdict.replace('_', ' ')}
                  </span>
                </div>

                {/* Urgency Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold">Urgency:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                      visionResult.urgency_level === 'CRITICAL'
                        ? 'bg-red-600 text-white shadow-sm'
                        : visionResult.urgency_level === 'HIGH'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : visionResult.urgency_level === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {visionResult.urgency_level}
                  </span>
                </div>
              </div>

              {/* Fail-Safe Fallback Notification */}
              {visionResult.fallback_notice && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">Fail-Safe Fallback Notification:</span>
                    <span className="text-amber-800">{visionResult.fallback_notice}</span>
                  </div>
                </div>
              )}

              {/* Grid: Risk Meter & Extracted Entity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risk Gauge Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Scam Risk Score
                    </span>
                    <span
                      className={`text-lg font-black font-mono ${
                        visionResult.risk_score >= 70
                          ? 'text-red-600'
                          : visionResult.risk_score >= 40
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {visionResult.risk_score} / 100
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        visionResult.risk_score >= 70
                          ? 'bg-red-600'
                          : visionResult.risk_score >= 40
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(5, visionResult.risk_score)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Scam Classification:</span>
                    <span className="font-bold text-slate-800 uppercase font-mono">
                      {visionResult.scam_type.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {/* Normalization & Trust Cross-Reference */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Trust Engine Normalization
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Extracted Identifier:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {visionResult.display_identifier || visionResult.detected_identifier || 'None Detected'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Identifier Type:</span>
                      <span className="font-mono text-slate-700 text-[11px] uppercase">
                        {visionResult.detected_identifier_type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Database Verdict:</span>
                      <span className="font-bold text-slate-800 text-[11px]">
                        {visionResult.verdict === 'VERIFIED_BUSINESS' ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            IMMUNE (Verified Safe Seed)
                          </span>
                        ) : (
                          `${visionResult.community_data.distinct_reporters} Local Reporters on File`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forensic & Evidence Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  AI Forensic Signals &amp; Manipulated Artifacts
                </span>

                {/* Artifacts Detected */}
                {visionResult.artifacts_detected && visionResult.artifacts_detected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {visionResult.artifacts_detected.map((artifact: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium shadow-2xs flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span>{artifact}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Intent Summary */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                    Scam Intent &amp; Threat Summary
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
                    {visionResult.summary || visionResult.scam_intent}
                  </p>
                </div>
              </div>

              {/* Raw JSON Inspector Accordion for Judges */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 text-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold font-mono text-purple-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-purple-400" />
                    <span>Raw Multimodal Vision LLM Response Payload (JSON)</span>
                  </div>
                  {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRawJson && (
                  <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto text-emerald-300 bg-slate-950 border-t border-slate-800 max-h-80">
                    {JSON.stringify(visionResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 2: LICENCE & TELEMETRY                                   */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'license' && (
        <div className="space-y-4">
          {/* Server & Clock Status */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Server Telemetry
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1">Health Status</span>
                <span className={`font-bold inline-flex items-center gap-1.5 ${
                  healthStatus === 'healthy' ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${healthStatus === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {healthStatus.toUpperCase()}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1">Clock Rollback Guard</span>
                <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active (120s max limit)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
              <span className="text-slate-500 font-sans">Server Timestamp (UTC/IST):</span>
              <span className="font-bold">{serverTime.slice(0, 19).replace('T', ' ')}</span>
            </div>
          </div>

          {/* License Status Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Ed25519 Licence Status
              </h2>
              {license && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  license.status === 'valid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {license.status}
                </span>
              )}
            </div>

            {loadingLicense ? (
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Licensee:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {license?.licensee || 'None (Unlicensed)'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Expires At:</span>
                  <span className="font-mono text-slate-700 text-[11px]">
                    {license?.expires_at || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Countdown:</span>
                  <span className={`font-mono font-bold text-sm flex items-center gap-1.5 ${
                    license?.status === 'valid' ? 'text-teal' : 'text-red-500'
                  }`}>
                    <Clock className="w-4 h-4" />
                    {license ? formatRemaining(license.seconds_remaining) : '0s'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* License JSON Uploader */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Upload Licence Payload (Ed25519 Signed JSON)
            </h2>
            <textarea
              rows={4}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{\n  "licensee": "Judges",\n  "expires_at": "2026-12-31T23:59:59+05:30",\n  "signature": "..."\n}`}
              aria-label="Paste license JSON"
              className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-teal focus:bg-white transition-all"
            />

            {uploadResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                uploadResult.ok
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {uploadResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />}
                <span>{uploadResult.msg}</span>
              </div>
            )}

            <button
              onClick={handleUploadLicense}
              disabled={isUploading || !jsonInput.trim()}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-navy hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isUploading ? 'Verifying Ed25519 Signature...' : 'Activate Licence'}
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 4: JUDGE ENVIRONMENT RESET                               */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'reset' && (
        <div className="bg-white p-5 rounded-3xl border border-red-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Judge Environment Reset
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Clears all test reports, disputes, and rate-limiter buckets. Re-seeds the verified business identifiers table and municipal centroids. Preserves the Ed25519 licence status and high-watermark clock.
          </p>

          {resetSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Database wiped and reseeded successfully. Ready for clean test run!</span>
            </div>
          )}

          <button
            onClick={handleResetDb}
            disabled={isResetting}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
          >
            <Trash2 className="w-4 h-4" />
            {isResetting ? 'Resetting Database...' : 'Reset Database to Clean State'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
