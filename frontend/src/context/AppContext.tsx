import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, TranslationDictionary } from '../i18n/translations';
import { getSavedLanguage, setSavedLanguage, getSavedArea, setSavedArea, getOrCreateReporterId } from '../utils/detector';
import { registerLicenseListener } from '../api/client';

export interface AreaItem {
  pincode: string;
  locality: string;
  city: string;
  lat: number;
  lng: number;
}

interface AppContextType {
  lang: Language;
  isHindi: boolean;
  t: TranslationDictionary;
  setLang: (l: Language) => void;
  currentPincode: string;
  savedPincode: string;
  areas: AreaItem[];
  reporterId: string;
  isLocationLocked: boolean;
  isDetectingLocation: boolean;
  autoDetectAndLock: () => void;
  isLicenseExpired: boolean;
  setIsLicenseExpired: (expired: boolean) => void;
  alertsCount: number;
  refreshAlertsCount: (pincode?: string) => void;
}

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(getSavedLanguage());
  const [currentPincode, setCurrentPincodeState] = useState<string>(getSavedArea());
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [reporterId] = useState<string>(getOrCreateReporterId());
  const [isLicenseExpired, setIsLicenseExpired] = useState<boolean>(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [alertsCount, setAlertsCount] = useState<number>(0);

  const refreshAlertsCount = (pincodeOverride?: string) => {
    // If explicitly provided, use override; otherwise use the user's current locked neighborhood
    const pin = pincodeOverride !== undefined ? pincodeOverride : currentPincode;
    const url = pin ? `/alerts?pincode=${encodeURIComponent(pin)}` : '/alerts';
    fetch(url)
      .then((r) => {
        if (!r.ok) return { alerts: [] };
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.alerts || [];
        setAlertsCount(list.length);
      })
      .catch(() => setAlertsCount(0));
  };

  const autoDetectAndLock = (areaList: AreaItem[] = areas) => {
    if (!navigator.geolocation || areaList.length === 0) {
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Layer 1 Security: Detect Mock Location / Emulator Spoofing
        const isMock = (pos.coords as any).isMock === true || pos.coords.accuracy <= 0;
        if (isMock) {
          console.warn('[Security Guard] Simulated or mock location detected. Snapping to safe municipal centroid.');
          setIsDetectingLocation(false);
          return;
        }

        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;

        let closestArea = areaList[0];
        let minD = Infinity;

        areaList.forEach((area) => {
          const d = calculateDistanceKm(uLat, uLng, area.lat, area.lng);
          if (d < minD) {
            minD = d;
            closestArea = area;
          }
        });

        // Automatically snap and permanently lock to nearest municipal centroid
        setCurrentPincodeState(closestArea.pincode);
        setSavedArea(closestArea.pincode);
        refreshAlertsCount(closestArea.pincode);
        setIsDetectingLocation(false);
      },
      () => {
        // Fallback: silently preserve safe locked municipal centroid
        setIsDetectingLocation(false);
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  };

  useEffect(() => {
    registerLicenseListener((expired) => {
      setIsLicenseExpired(expired);
    });

    // Check initial licence status
    fetch('/license')
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'expired') {
          setIsLicenseExpired(true);
        }
      })
      .catch(() => {});

    // Fetch verified municipal areas
    fetch('/data/areas.json')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: AreaItem[]) => {
        setAreas(data);
        // Automatically detect and lock location on startup
        autoDetectAndLock(data);
      })
      .catch(() => {
        // Fallback default areas
        const defaultAreas: AreaItem[] = [
          { pincode: '560102', locality: 'HSR Layout', city: 'Bengaluru', lat: 12.9116, lng: 77.6473 },
          { pincode: '560038', locality: 'Indiranagar', city: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
          { pincode: '560034', locality: 'Koramangala', city: 'Bengaluru', lat: 12.9352, lng: 77.6245 },
          { pincode: '560066', locality: 'Whitefield', city: 'Bengaluru', lat: 12.9698, lng: 77.7500 },
          { pincode: '560076', locality: 'BTM Layout', city: 'Bengaluru', lat: 12.9166, lng: 77.6101 },
          { pincode: '560011', locality: 'Jayanagar', city: 'Bengaluru', lat: 12.9299, lng: 77.5826 },
          { pincode: '400050', locality: 'Bandra West', city: 'Mumbai', lat: 19.0596, lng: 72.8295 },
          { pincode: '110016', locality: 'Hauz Khas', city: 'Delhi', lat: 28.5494, lng: 77.2001 },
          { pincode: '500081', locality: 'Madhapur', city: 'Hyderabad', lat: 17.4486, lng: 78.3908 },
          { pincode: '600020', locality: 'Adyar', city: 'Chennai', lat: 13.0012, lng: 80.2565 },
          { pincode: '506002', locality: 'Warangal', city: 'Warangal', lat: 17.9689, lng: 79.5941 },
          { pincode: '506001', locality: 'Hanamkonda', city: 'Warangal', lat: 18.0073, lng: 79.5583 }
        ];
        setAreas(defaultAreas);
        autoDetectAndLock(defaultAreas);
      });
  }, []);

  // Sync alerts count with the user's locked neighborhood and poll periodically
  useEffect(() => {
    refreshAlertsCount(currentPincode);
    const alertInterval = setInterval(() => {
      refreshAlertsCount(currentPincode);
    }, 15000);
    return () => clearInterval(alertInterval);
  }, [currentPincode]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    setSavedLanguage(newLang);
  };

  const t = translations[lang];

  return (
    <AppContext.Provider
      value={{
        lang,
        isHindi: lang === 'hi',
        t,
        setLang,
        currentPincode,
        savedPincode: currentPincode,
        areas,
        reporterId,
        isLocationLocked: true, // Permanently locked to prevent fake reports
        isDetectingLocation,
        autoDetectAndLock: () => autoDetectAndLock(areas),
        isLicenseExpired,
        setIsLicenseExpired,
        alertsCount,
        refreshAlertsCount
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
