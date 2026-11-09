import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, AlertItem } from '../api/client';
import { AlertTriangle, Flame, Sparkles, ShieldCheck, MapPin, RefreshCw, Lock } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { t, currentPincode, areas, refreshAlertsCount } = useApp();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPincode, setSelectedPincode] = useState<string>(currentPincode || '');

  const fetchAlerts = async (pincode?: string) => {
    setLoading(true);
    const targetPin = pincode !== undefined ? pincode : selectedPincode;
    try {
      const data = await api.getAlerts(targetPin || undefined);
      const list = Array.isArray(data) ? data : (data as any)?.alerts || [];
      setAlerts(list);
      // Keep navbar badge counter in exact sync with currently filtered alerts
      refreshAlertsCount(targetPin);
    } catch {
      setAlerts([]);
      refreshAlertsCount(targetPin);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(selectedPincode);
  }, [selectedPincode]);

  // When leaving Alerts page, restore alert counter to user's locked neighborhood
  useEffect(() => {
    return () => {
      refreshAlertsCount(currentPincode);
    };
  }, [currentPincode]);

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy">
              {t.alertsTitle}
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20">
              <Lock className="w-3 h-3" /> Centroid Filtered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time neighborhood community fraud alerts
          </p>
        </div>
        <button
          onClick={() => fetchAlerts(selectedPincode)}
          aria-label="Refresh alerts"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-navy hover:border-slate-300 shadow-sm transition-all min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal' : ''}`} />
        </button>
      </div>

      {/* Pincode Selector */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <MapPin className="w-5 h-5 text-teal shrink-0" />
        <select
          value={selectedPincode}
          onChange={(e) => setSelectedPincode(e.target.value)}
          aria-label="Filter alerts by area"
          className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer"
        >
          <option value="">All {areas.length} Monitored Municipal Areas</option>
          {areas.map((a) => (
            <option key={a.pincode} value={a.pincode}>
              {a.locality}, {a.city} ({a.pincode})
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State: Peaceful Area */}
      {!loading && alerts.length === 0 && (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {t.noAlertsHeadline}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
              {t.noAlertsSub}
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>0 Active Fraud Surges Detected</span>
            </span>
          </div>
        </div>
      )}

      {/* Active Alerts List */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => {
            const isSpike = (alert.type || alert.alert_type) === 'SPIKE';
            const areaObj = areas.find((a) => a.pincode === alert.pincode);
            const localityName = areaObj?.locality || alert.locality || 'Municipal Zone';
            const cityName = areaObj?.city || alert.city || '';

            return (
              <div
                key={`${alert.pincode}-${alert.type || alert.alert_type}-${idx}`}
                className={`p-4 rounded-2xl border shadow-sm transition-all ${
                  isSpike
                    ? 'bg-amber-50/80 border-amber-300'
                    : 'bg-red-50/90 border-red-300 shadow-red-100/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${
                        isSpike
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {isSpike ? <Flame className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isSpike ? t.spikeAlertBadge : t.newTypeAlertBadge}</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200">
                    {alert.pincode}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {localityName}{cityName ? `, ${cityName}` : ''}
                </h3>

                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  {isSpike ? t.spikeDescription : t.newTypeDescription}
                </p>

                {alert.scam_type && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border text-xs font-semibold shadow-sm ${
                    isSpike ? 'border-slate-200 text-slate-800' : 'border-red-200 text-red-900'
                  }`}>
                    <AlertTriangle className={`w-3.5 h-3.5 ${isSpike ? 'text-amber-500' : 'text-red-500'}`} />
                    <span>
                      {t.scamTypes[alert.scam_type] || alert.scam_type}
                    </span>
                  </div>
                )}

                {isSpike && alert.count !== undefined && (
                  <div className="inline-flex items-center gap-2 text-[11px] text-amber-900 font-medium bg-amber-100/70 px-2.5 py-1 rounded-lg">
                    <span>Reports in 24h: <strong>{alert.count}</strong></span>
                    <span>•</span>
                    <span>7-day daily baseline: <strong>{alert.baseline_per_day}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
