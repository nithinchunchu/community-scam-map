import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock, RefreshCw, KeyRound } from 'lucide-react';

export const LicenceExpiredModal: React.FC = () => {
  const { isLicenseExpired, t } = useApp();
  const location = useLocation();

  // Do not block the admin/judge console so judges can re-activate or renew!
  if (!isLicenseExpired || location.pathname === '/admin') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-navy/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-6 animate-pulse">
        <Lock className="w-10 h-10" />
      </div>

      <h2 className="text-2xl font-bold mb-2">
        {t.licenseExpiredTitle}
      </h2>

      <p className="text-base text-slate-300 max-w-sm mb-6 leading-relaxed">
        {t.licenseExpiredMessage}
      </p>

      <div className="flex items-center gap-2 text-xs text-teal-300 bg-slate-800/80 px-4 py-2.5 rounded-full mb-8 border border-slate-700">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal" />
        <span>{t.checkingLicenseStatus}</span>
      </div>

      <Link
        to="/admin"
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-md transition-colors"
      >
        <KeyRound className="w-4 h-4" />
        <span>Open License Admin Console</span>
      </Link>
    </div>,
    document.body
  );
};
