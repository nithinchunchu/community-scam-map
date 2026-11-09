import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PhoneCall, ShieldCheck, Globe, Map, BellRing, ShieldAlert, Home, HelpCircle, Lock, Settings } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { SettingsModal } from './SettingsModal';

export const Header: React.FC = () => {
  const { lang, setLang, t, currentPincode, areas, alertsCount } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const currentArea = areas.find((a) => a.pincode === currentPincode);

  return (
    <header className="bg-navy text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="w-8 h-8 rounded-xl bg-teal flex items-center justify-center text-white shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              {t.appName}
            </h1>
            <p className="text-[10px] text-teal-100 font-medium leading-none">
              {t.appTagline}
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-teal text-white font-bold' : 'text-slate-300 hover:text-white font-medium'
              }`
            }
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.homeTab}</span>
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-teal text-white font-bold' : 'text-slate-300 hover:text-white font-medium'
              }`
            }
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>{t.reportTab}</span>
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-teal text-white font-bold' : 'text-slate-300 hover:text-white font-medium'
              }`
            }
          >
            <Map className="w-3.5 h-3.5" />
            <span>{t.mapTab}</span>
          </NavLink>
          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-teal text-white font-bold' : 'text-slate-300 hover:text-white font-medium'
              }`
            }
          >
            <div className="relative flex items-center justify-center">
              <BellRing className="w-3.5 h-3.5" />
              {alertsCount > 0 && (
                <span
                  title={`${alertsCount} active neighborhood alert${alertsCount > 1 ? 's' : ''}`}
                  className="absolute -top-2 -right-2 bg-red-600 text-white font-extrabold text-[9px] min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center leading-none shadow-md ring-1 ring-white/50 animate-pulse"
                >
                  {alertsCount > 9 ? '9+' : alertsCount}
                </span>
              )}
            </div>
            <span>{t.alertsTab}</span>
          </NavLink>
          <NavLink
            to="/dispute"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-teal text-white font-bold' : 'text-slate-300 hover:text-white font-medium'
              }`
            }
          >
            <span>{t.disputeTab}</span>
          </NavLink>
          <NavLink
            to="/privacy"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-teal text-white font-bold' : 'text-slate-300 hover:text-white font-medium'
              }`
            }
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t.privacyTab}</span>
          </NavLink>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Permanently Locked Municipal Location Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-800/90 text-teal-100 text-xs border border-teal/40 shadow-sm cursor-default"
            title="Location automatically detected & permanently locked to verified municipal zone"
          >
            <Lock className="w-3.5 h-3.5 text-teal flex-shrink-0" />
            <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-[160px]">
              {currentArea ? currentArea.locality : currentPincode}
            </span>
            <span className="text-[9px] font-bold text-teal bg-teal/15 px-1.5 py-0.5 rounded">
              LOCKED
            </span>
          </div>

          {/* Emergency Helpline Call */}
          <a
            href="tel:1930"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-transform active:scale-95"
            title={t.call1930}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>1930</span>
          </a>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-teal" />
            <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* Settings & Admin Console Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Settings & System Tools (Judge & Admin Console)"
            aria-label="Settings and Judge Console"
          >
            <Settings className="w-3.5 h-3.5 text-teal" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
};
