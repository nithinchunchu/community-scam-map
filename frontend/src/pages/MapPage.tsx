import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../api/client';
import { MapPin, AlertCircle, Layers, RefreshCw, ShieldCheck, Lock, Globe2, Search, X, Flame } from 'lucide-react';

const LeafletMap = lazy(() => import('../components/LeafletMap'));

interface ClusterItem {
  pincode: string;
  locality: string;
  city: string;
  count: number;
  top_scam_type: string;
  severity: 'CRIT' | 'HIGH' | 'MED';
  lat: number;
  lng: number;
}

export const MapPage: React.FC = () => {
  const { t, currentPincode, areas } = useApp();

  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Map Focus
  const [showAllCentroids, setShowAllCentroids] = useState<boolean>(true);
  const [focusedCity, setFocusedCity] = useState<string>('all');
  const [focusedPin, setFocusedPin] = useState<string>(currentPincode);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHotspotsOnly, setFilterHotspotsOnly] = useState<boolean>(false);

  const mapCardRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;
    const q = query.toLowerCase().trim();
    const matched = areas.find(
      (a) =>
        a.locality.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.pincode.startsWith(q)
    );
    if (matched) {
      setFocusedPin(matched.pincode);
    }
  };

  const fetchMapData = () => {
    setLoading(true);
    setError(null);
    apiRequest<ClusterItem[] | { clusters: ClusterItem[] }>('/map?days=7')
      .then((res) => {
        const list = Array.isArray(res) ? res : res.clusters || [];
        setClusters(list);
      })
      .catch((err: any) => {
        setError(err.data?.error || t.serverError);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  // Distinct cities from areas
  const cities = Array.from(new Set(areas.map((a) => a.city)));

  const getSeverityBadge = (sev?: 'CRIT' | 'HIGH' | 'MED') => {
    if (sev === 'CRIT') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{t.severityCrit}</span>;
    }
    if (sev === 'HIGH') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{t.severityHigh}</span>;
    }
    if (sev === 'MED') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">{t.severityMed}</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal/15 text-teal-dark">CLEAN (0)</span>;
  };

  // Map cluster dictionary
  const clusterMap = new Map<string, ClusterItem>();
  clusters.forEach((c) => clusterMap.set(c.pincode, c));

  // Severity ordering weight
  const getSevWeight = (sev?: string) => {
    if (sev === 'CRIT') return 3;
    if (sev === 'HIGH') return 2;
    if (sev === 'MED') return 1;
    return 0;
  };

  // Filter & sort: Put active scam hotspots first so user immediately sees what matters
  const filteredAreas = areas
    .filter((a) => {
      if (filterHotspotsOnly) return clusterMap.has(a.pincode);
      return showAllCentroids ? true : clusterMap.has(a.pincode);
    })
    .filter((a) => (focusedCity === 'all' ? true : a.city.toLowerCase() === focusedCity.toLowerCase()))
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        a.locality.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.pincode.includes(q)
      );
    })
    .sort((a, b) => {
      const cA = clusterMap.get(a.pincode);
      const cB = clusterMap.get(b.pincode);
      const weightA = getSevWeight(cA?.severity);
      const weightB = getSevWeight(cB?.severity);
      if (weightA !== weightB) return weightB - weightA;
      const countA = cA ? cA.count : 0;
      const countB = cB ? cB.count : 0;
      if (countA !== countB) return countB - countA;
      return a.locality.localeCompare(b.locality);
    });

  const handleSelectAreaCard = (pincode: string) => {
    setFocusedPin(pincode);
    // Smoothly scroll to map view so the user immediately sees the highlighted pin
    mapCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="space-y-4 pb-20 w-full flex-1 flex flex-col pt-1">
      {/* Page Title & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-navy">{t.mapTitle}</h2>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal/15 text-teal border border-teal/20 cursor-default"
              title="Verified community protection across Indian cities"
            >
              <Lock className="w-3 h-3" />
              <span>{t.locationLockedBadge}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t.mapSubtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Centroid / Active Toggle */}
          <div className="bg-slate-200/70 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => {
                setShowAllCentroids(true);
                setFilterHotspotsOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                showAllCentroids && !filterHotspotsOnly
                  ? 'bg-white text-navy shadow-sm font-bold'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              {t.locationLockedFilterAll} ({areas.length})
            </button>
            <button
              onClick={() => {
                setShowAllCentroids(false);
                setFilterHotspotsOnly(true);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                !showAllCentroids || filterHotspotsOnly
                  ? 'bg-white text-navy shadow-sm font-bold'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              {t.locationLockedFilterActive} ({clusters.length})
            </button>
          </div>

          <button
            onClick={fetchMapData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-navy active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Refresh map"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Leaflet Map Interactive Frame (Deterministic Responsive Height & No Blank Void) */}
      <div
        ref={mapCardRef}
        className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-sm flex flex-col space-y-3"
      >
        <div className="relative w-full h-[460px] sm:h-[520px] md:h-[580px] lg:h-[620px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal" />
                <span>Loading interactive OpenStreetMap...</span>
              </div>
            }
          >
            <LeafletMap
              clusters={clusters}
              allAreas={areas}
              selectedPin={focusedPin}
              onSelectPin={(pin) => setFocusedPin(pin)}
              showAllCentroids={showAllCentroids && !filterHotspotsOnly}
              focusedCity={focusedCity}
            />
          </Suspense>
        </div>

        {/* Map Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-sm"></span> High Alert (&ge; 15)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm"></span> Elevated (8-14)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-sm"></span> Moderate (&lt; 8)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-teal inline-block shadow-sm"></span> Peaceful Area (0)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            OpenStreetMap • Locked Centroids (Anti-Spoofing)
          </span>
        </div>
      </div>

      {/* 2. Search & City Filter Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Instant Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.searchMapPlaceholder}
              className="w-full pl-10 pr-9 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City Selector Dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Globe2 className="w-4 h-4 text-teal flex-shrink-0" />
            <select
              value={focusedCity}
              onChange={(e) => {
                setFocusedCity(e.target.value);
                setSearchQuery('');
              }}
              className="text-xs font-bold text-navy bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal cursor-pointer"
            >
              <option value="all">{t.allIndiaView} ({areas.length})</option>
              {cities.map((city) => {
                const countInCity = areas.filter(
                  (a) => a.city.toLowerCase() === city.toLowerCase()
                ).length;
                return (
                  <option key={city} value={city}>
                    {city} ({countInCity})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Jump Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            Quick Jump:
          </span>
          <button
            type="button"
            onClick={() => {
              setFocusedCity('all');
              setSearchQuery('');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              focusedCity === 'all' && !searchQuery
                ? 'bg-navy text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All India ({areas.length})
          </button>
          {cities.map((city) => {
            const countInCity = areas.filter(
              (a) => a.city.toLowerCase() === city.toLowerCase()
            ).length;
            const isSelected = focusedCity.toLowerCase() === city.toLowerCase() && !searchQuery;
            return (
              <button
                key={city}
                type="button"
                onClick={() => {
                  setFocusedCity(city);
                  setSearchQuery('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-teal text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {city} ({countInCity})
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Community Trust Bar */}
      <div className="bg-white rounded-2xl px-4 py-2.5 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <div className="w-6 h-6 rounded-lg bg-teal/15 text-teal flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-navy mr-1.5">Safe Neighborhoods Network</span>
            <span className="text-slate-500 hidden sm:inline">— {t.locationLockedExplainer}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 ml-auto sm:ml-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal/10 text-teal-dark font-bold border border-teal/20">
            <Lock className="w-3 h-3 text-teal" /> {areas.length} Monitored Zones
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Zero Tracking
          </span>
        </div>
      </div>

      {/* 4. Monitored Municipal Zones Grid */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal" />
              <span>{t.areaListHeader}</span>
              <span className="text-slate-400 font-normal">({filteredAreas.length})</span>
            </h3>
            {clusters.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Flame className="w-3 h-3 text-amber-600" /> {clusters.length} active alerts
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Click any zone to jump & highlight on the map</span>
          </div>
        </div>

        {filteredAreas.length === 0 && !loading && (
          <p className="text-xs text-slate-500 py-6 text-center">
            No incident clusters match this filter. All municipal regions are clean.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAreas.map((area) => {
            const cluster = clusterMap.get(area.pincode);
            const isMyArea = area.pincode === currentPincode;
            const isSelected = area.pincode === focusedPin;
            const count = cluster ? cluster.count : 0;
            const severity = cluster ? cluster.severity : undefined;

            return (
              <div
                key={area.pincode}
                onClick={() => handleSelectAreaCard(area.pincode)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-teal ring-2 ring-teal/30 bg-teal/5 shadow-sm'
                    : isMyArea
                    ? 'border-teal/60 bg-teal/5 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected || isMyArea ? 'text-teal' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {area.locality}
                      </span>
                    </div>
                    {getSeverityBadge(severity)}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{area.city} ({area.pincode})</span>
                    {isMyArea && (
                      <span className="px-1.5 py-0.2 rounded bg-teal text-white text-[9px] font-bold">
                        MY AREA
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">
                    {cluster ? (
                      <span className="truncate">
                        Top scam: <strong className="text-slate-800">{t.scamTypes[cluster.top_scam_type] || cluster.top_scam_type}</strong>
                      </span>
                    ) : (
                      <span className="text-teal font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {t.cleanAreaStatus}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-slate-900 ml-2 flex-shrink-0">
                    {count} {t.reportsCount.split(' ')[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
