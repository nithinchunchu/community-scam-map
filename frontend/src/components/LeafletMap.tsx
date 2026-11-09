import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Plus, Minus, Maximize2, Navigation, X } from 'lucide-react';

export interface AreaItem {
  pincode: string;
  locality: string;
  city: string;
  lat: number;
  lng: number;
}

export interface ClusterItem {
  pincode: string;
  locality: string;
  city: string;
  count: number;
  top_scam_type: string;
  severity: 'CRIT' | 'HIGH' | 'MED';
  lat: number;
  lng: number;
}

export interface LeafletMapProps {
  clusters: ClusterItem[];
  allAreas?: AreaItem[];
  selectedPin?: string;
  onSelectPin?: (pincode: string) => void;
  showAllCentroids?: boolean;
  focusedCity?: string;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  clusters,
  allAreas = [],
  selectedPin,
  onSelectPin,
  showAllCentroids = true,
  focusedCity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    nearest: AreaItem;
    distanceKm: number;
  } | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946], // Bengaluru center initially
        zoom: 11,
        zoomControl: false, // Custom Google Maps-style controls used
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        preferCanvas: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 4,
        keepBuffer: 6
      }).addTo(map);

      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      const userLocGroup = L.layerGroup().addTo(map);
      userLocationLayerRef.current = userLocGroup;

      mapInstanceRef.current = map;

      // Invalidate size immediately and in timed intervals to guarantee no white voids
      const invalidate = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      };

      invalidate();
      const t1 = setTimeout(invalidate, 60);
      const t2 = setTimeout(invalidate, 180);
      const t3 = setTimeout(invalidate, 450);
      const t4 = setTimeout(invalidate, 900);

      // ResizeObserver to adapt anytime container changes size
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          invalidate();
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      const handleWinResize = () => invalidate();
      window.addEventListener('resize', handleWinResize);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        window.removeEventListener('resize', handleWinResize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        map.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        userLocationLayerRef.current = null;
      };
    }
  }, []);

  // Update Markers when clusters, allAreas, or showAllCentroids changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Map of pincode -> cluster item
    const clusterMap = new Map<string, ClusterItem>();
    clusters.forEach((c) => clusterMap.set(c.pincode, c));

    const bounds = L.latLngBounds([]);

    // Determine what areas to plot
    const areasToPlot: Array<{
      pincode: string;
      locality: string;
      city: string;
      lat: number;
      lng: number;
      cluster?: ClusterItem;
    }> = [];

    if (showAllCentroids && allAreas.length > 0) {
      allAreas.forEach((area) => {
        areasToPlot.push({
          ...area,
          cluster: clusterMap.get(area.pincode)
        });
      });
    } else {
      clusters.forEach((c) => {
        areasToPlot.push({
          pincode: c.pincode,
          locality: c.locality,
          city: c.city,
          lat: c.lat,
          lng: c.lng,
          cluster: c
        });
      });
    }

    areasToPlot.forEach((item) => {
      bounds.extend([item.lat, item.lng]);
      const isSelected = item.pincode === selectedPin;

      if (item.cluster) {
        // Active incident cluster
        const c = item.cluster;
        const color = c.severity === 'CRIT' ? '#DC2626' : c.severity === 'HIGH' ? '#D97706' : '#2563EB';
        const radius = Math.min(30, Math.max(14, c.count * 3));

        // Outer glow circle for selected or CRIT
        if (isSelected || c.severity === 'CRIT') {
          L.circleMarker([c.lat, c.lng], {
            radius: radius + 6,
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 0.4,
            fillOpacity: 0.15
          }).addTo(layerGroup);
        }

        const marker = L.circleMarker([c.lat, c.lng], {
          radius: radius,
          fillColor: color,
          color: isSelected ? '#0F172A' : '#FFFFFF',
          weight: isSelected ? 3 : 2,
          opacity: 0.95,
          fillOpacity: 0.75
        }).addTo(layerGroup);

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.45; min-width: 175px;">
            <div style="font-weight: 700; color: #0B192C; font-size: 13px;">${c.locality}, ${c.city}</div>
            <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">Pincode: <strong>${c.pincode}</strong> • Locked Centroid</div>
            <div style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 700; color: white; background-color: ${color}; margin-bottom: 6px;">
              ${c.count} Trusted Reports (${c.severity})
            </div>
            <div style="font-size: 11px; color: #334155;"><strong>Top Scam:</strong> ${c.top_scam_type}</div>
            <div style="font-size: 10px; color: #0D9488; margin-top: 5px; font-weight: 600;">🔒 Centroid Verified • Spoofing Blocked</div>
          </div>
        `;

        marker.bindPopup(popupContent, { autoPan: true, autoPanPadding: [30, 30] });
        marker.on('click', () => {
          if (onSelectPin) onSelectPin(c.pincode);
        });
      } else {
        // Clean monitored municipal centroid (0 reports)
        const isSel = item.pincode === selectedPin;
        const marker = L.circleMarker([item.lat, item.lng], {
          radius: isSel ? 9 : 6.5,
          fillColor: '#0F766E',
          color: isSel ? '#042F2E' : '#FFFFFF',
          weight: isSel ? 2.5 : 1.5,
          opacity: 0.9,
          fillOpacity: 0.55
        }).addTo(layerGroup);

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.45; min-width: 170px;">
            <div style="font-weight: 700; color: #0B192C; font-size: 13px;">${item.locality}, ${item.city}</div>
            <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">Pincode: <strong>${item.pincode}</strong></div>
            <div style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 700; color: #0F766E; background-color: #CCFBF1; margin-bottom: 4px;">
              🔒 0 Reports • Clean Area
            </div>
            <div style="font-size: 10px; color: #475569;">Municipal Centroid Monitored.<br/>Location strictly locked against fake reports.</div>
          </div>
        `;

        marker.bindPopup(popupContent, { autoPan: true, autoPanPadding: [30, 30] });
        marker.on('click', () => {
          if (onSelectPin) onSelectPin(item.pincode);
        });
      }
    });
  }, [clusters, allAreas, selectedPin, showAllCentroids, onSelectPin]);

  // Handle City Focus or Selection Pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (focusedCity && focusedCity !== 'all') {
      const cityAreas = allAreas.filter(
        (a) => a.city.toLowerCase() === focusedCity.toLowerCase()
      );
      if (cityAreas.length === 1) {
        map.flyTo([cityAreas[0].lat, cityAreas[0].lng], 13, { duration: 0.8, easeLinearity: 0.25 });
      } else if (cityAreas.length > 1) {
        const cityBounds = L.latLngBounds(cityAreas.map((a) => [a.lat, a.lng]));
        map.fitBounds(cityBounds, { padding: [40, 40], maxZoom: 13 });
      }
    } else if (focusedCity === 'all') {
      if (allAreas.length > 0) {
        const allBounds = L.latLngBounds(allAreas.map((a) => [a.lat, a.lng]));
        map.fitBounds(allBounds, { padding: [30, 30] });
      } else {
        map.flyTo([20.5937, 78.9629], 5, { duration: 0.8, easeLinearity: 0.25 });
      }
    }
  }, [focusedCity, allAreas]);

  // Pan smoothly to selectedPin if explicitly selected and not city focus
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPin) return;

    const targetArea = allAreas.find((a) => a.pincode === selectedPin);
    if (targetArea) {
      map.flyTo([targetArea.lat, targetArea.lng], 14, { duration: 0.8, easeLinearity: 0.25 });
    }
  }, [selectedPin, allAreas]);

  // Google Maps Style Controls Handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (allAreas.length > 0) {
      const allBounds = L.latLngBounds(allAreas.map((a) => [a.lat, a.lng]));
      map.fitBounds(allBounds, { padding: [30, 30] });
    } else {
      map.flyTo([20.5937, 78.9629], 5, { duration: 0.8, easeLinearity: 0.25 });
    }
  };

  const handleLocateUser = () => {
    setLocating(true);
    setLocationNotice(null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const { latitude, longitude, accuracy } = pos.coords;

          // Find nearest pre-verified municipal area centroid
          let nearest = allAreas[0];
          let minDist = Infinity;
          for (const a of allAreas) {
            const d = getDistanceKm(latitude, longitude, a.lat, a.lng);
            if (d < minDist) {
              minDist = d;
              nearest = a;
            }
          }

          setUserLocation({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy || 20,
            nearest,
            distanceKm: minDist
          });

          const map = mapInstanceRef.current;
          const userGroup = userLocationLayerRef.current;
          if (map && userGroup) {
            userGroup.clearLayers();

            // 1. Accuracy halo circle
            L.circle([latitude, longitude], {
              radius: Math.max(accuracy || 25, 20),
              color: '#2563EB',
              weight: 1.5,
              opacity: 0.6,
              fillColor: '#3B82F6',
              fillOpacity: 0.12,
              dashArray: '3, 4'
            }).addTo(userGroup);

            // 2. Dashed guide line to nearest municipal centroid
            if (nearest) {
              L.polyline([[latitude, longitude], [nearest.lat, nearest.lng]], {
                color: '#6366F1',
                weight: 2,
                opacity: 0.65,
                dashArray: '5, 8'
              }).addTo(userGroup);
            }

            // 3. User actual location pulsing blue pointer
            const userIcon = L.divIcon({
              className: 'user-actual-location-marker',
              html: `
                <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                  <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.35); animation: userLocationPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                  <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background-color: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 10px rgba(0,0,0,0.45);"></div>
                  <div style="position: absolute; width: 6px; height: 6px; border-radius: 50%; background-color: #FFFFFF;"></div>
                </div>
                <style>
                  @keyframes userLocationPulse {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(1.7); opacity: 0; }
                  }
                </style>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              popupAnchor: [0, -20]
            });

            const userMarker = L.marker([latitude, longitude], {
              icon: userIcon,
              zIndexOffset: 1000
            }).addTo(userGroup);

            const popupHtml = `
              <div style="font-family: inherit; font-size: 12px; line-height: 1.45; min-width: 195px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #2563EB;"></span>
                  <strong style="color: #0F172A; font-size: 13px;">Your Actual Location</strong>
                </div>
                <div style="color: #64748B; font-size: 11px; margin-bottom: 6px;">
                  GPS Accuracy: <strong>&plusmn;${Math.round(accuracy || 20)} meters</strong>
                </div>
                <div style="background-color: #F0FDFA; border: 1px solid #CCFBF1; padding: 6px 8px; border-radius: 8px; font-size: 11px; margin-bottom: 6px;">
                  <span style="color: #0F766E; font-weight: 700; display: block; font-size: 10px; text-transform: uppercase;">Nearest Municipal Zone:</span>
                  <strong style="color: #042F2E;">${nearest.locality}, ${nearest.city} (${nearest.pincode})</strong>
                  <div style="color: #0D9488; font-size: 10px; margin-top: 2px;">Distance: ${minDist.toFixed(2)} km</div>
                </div>
                <div style="font-size: 10px; color: #64748B; line-height: 1.35;">
                  🔒 <em>Client-side pointer only. Your personal GPS coordinates are never sent or stored. Reports lock to the verified municipal centroid.</em>
                </div>
              </div>
            `;

            userMarker.bindPopup(popupHtml, { autoPan: true, autoPanPadding: [30, 30] }).openPopup();

            // Smoothly fly to user's exact position
            map.flyTo([latitude, longitude], 15, { duration: 1.0, easeLinearity: 0.25 });
            if (onSelectPin) onSelectPin(nearest.pincode);
          }
        },
        (err) => {
          setLocating(false);
          setLocationNotice(
            err.code === 1
              ? 'GPS permission denied. Centered on nearest municipal zone.'
              : 'GPS signal timed out. Centered on municipal zone.'
          );
          const target = allAreas.find((a) => a.pincode === selectedPin) || allAreas[0];
          if (target && mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([target.lat, target.lng], 13, { duration: 0.8, easeLinearity: 0.25 });
          }
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      setLocating(false);
      setLocationNotice('Geolocation not supported by this browser. Centered on municipal zone.');
      const target = allAreas.find((a) => a.pincode === selectedPin) || allAreas[0];
      if (target && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([target.lat, target.lng], 13, { duration: 0.8, easeLinearity: 0.25 });
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-[460px] sm:min-h-[520px] md:min-h-[580px] rounded-2xl overflow-hidden shadow-inner border border-slate-300 bg-slate-100">
      {/* Absolute container guarantees 100% height without flex calculation delays */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Floating Status Pill when User Location is detected */}
      {userLocation && (
        <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto z-[400] max-w-md bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-lg border border-blue-200 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xs min-w-0">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>You are here</span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  &plusmn;{Math.round(userLocation.accuracy)}m
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[210px] sm:max-w-xs">
                Nearest Zone: <strong className="text-teal font-semibold">{userLocation.nearest.locality}</strong> ({userLocation.distanceKm.toFixed(2)} km)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 0.8 });
                }
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Focus on my actual pointer"
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => {
                setUserLocation(null);
                if (userLocationLayerRef.current) {
                  userLocationLayerRef.current.clearLayers();
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              title="Clear actual location pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Geolocation Notice if permission denied / timed out */}
      {locationNotice && (
        <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto z-[400] max-w-sm bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in duration-200">
          <span className="text-[11px] leading-tight">{locationNotice}</span>
          <button
            type="button"
            onClick={() => setLocationNotice(null)}
            className="p-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Google Maps Style Bottom-Right Floating Controls */}
      <div className="absolute bottom-6 right-4 z-[400] flex flex-col items-center gap-2 select-none pointer-events-auto">
        {/* Reset / Fit View Button */}
        <button
          type="button"
          onClick={handleResetView}
          className="w-10 h-10 rounded-full bg-white text-slate-700 hover:text-teal hover:bg-slate-50 shadow-md border border-slate-200/90 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          title="Fit all areas / All India view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Locate My Neighborhood Button */}
        <button
          type="button"
          onClick={handleLocateUser}
          disabled={locating}
          className={`w-10 h-10 rounded-full shadow-md border flex items-center justify-center transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
            userLocation
              ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
              : 'bg-white text-slate-700 hover:text-teal hover:bg-slate-50 border-slate-200/90'
          }`}
          title="Locate my actual GPS position & nearest zone"
        >
          <LocateFixed className={`w-4 h-4 ${locating ? 'animate-spin text-teal' : ''}`} />
        </button>

        {/* Zoom In & Zoom Out Stack */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200/90 overflow-hidden flex flex-col divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-navy active:bg-slate-100 transition-all cursor-pointer font-bold"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-navy active:bg-slate-100 transition-all cursor-pointer font-bold"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;
